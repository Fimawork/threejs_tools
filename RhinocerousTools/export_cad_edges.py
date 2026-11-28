#! python 3
# -*- coding: utf-8 -*-
"""
一鍵匯出 CAD 邊線 GLB（給 three.js 框架模式使用）

用途：
  從 Rhino 的實體（Brep / 多重曲面 / 擠出物件 / 圖塊）取出真正的 CAD 邊緣（效果等同 DupEdge），
  轉成線段後，由腳本自己寫成 GLB（glTF 的 LINES 格式），網頁用 GLTFLoader 載入後就是 THREE.LineSegments。
  Rhino 7 的 glTF 匯出不會輸出曲線，所以邊線另外存成一個 GLB，模型照原本的方式匯出。

輸出：
  1. draco_<3dm 檔名>_edges.glb，存在 .3dm 旁邊（檔案還沒存檔時會詢問存放位置）
     檔名固定以 FILE_PREFIX 開頭，避免 3dm 檔名是數字開頭時，網頁端轉出的 JS 變數名稱不合法
     - 每個來源物件一個 node，名稱為物件名稱（沒有名稱時用圖層名稱）
     - 座標轉成 glTF 標準：Y 朝上、單位公尺，與 Rhino glTF 匯出勾選「Map Rhino Z to glTF Y」時一致
  2. ADD_TO_DOC = True 時，邊線也放到 Rhino 的 CAD_Edges 圖層方便檢查
     圖層結構照原物件建立，例如 STEP_Parts::Frame_Asm::Side_Bar → CAD_Edges::STEP_Parts::Frame_Asm::Side_Bar
     每次執行會先清空 CAD_Edges 底下的舊邊線，重複執行不會疊加

處理範圍：
  有選取物件 → 只處理選取的物件
  沒有選取   → 處理所有可見的物件

對齊：
  邊線 GLB 必須和模型 GLB 用相同的軸向與單位。第一次使用時在網頁上確認兩者有對齊，
  沒對齊就調整 Y_UP、TO_METERS。

使用方式：
  Rhino 7：_-RunPythonScript "完整路徑\\export_cad_edges.py"
  Rhino 8：_-ScriptEditor _Run "完整路徑\\export_cad_edges.py"（也可用上面的 RunPythonScript）
  做成工具列按鈕時，指令前加 ! 可先取消正在執行的指令：
  ! _-RunPythonScript "D:\\你的路徑\\export_cad_edges.py"
"""

from __future__ import print_function

import json
import math
import os
import struct

import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
import System

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------
SKIP_SEAMS = True          # 略過接縫邊（圓柱、球面等封閉曲面的接合線，不是真正的稜線）
SKIP_SMOOTH_EDGES = False  # 略過相切的平滑邊（例如圓角與平面的交界）；True 時畫面更簡潔
SMOOTH_ANGLE_DEG = 2.0     # 兩側曲面夾角小於這個角度視為平滑邊（SKIP_SMOOTH_EDGES = True 時才有作用）

CHORD_TOLERANCE_MM = 0.05  # 曲線轉線段的弦高誤差（mm）：越小圓弧越平滑、檔案越大
ANGLE_TOLERANCE_DEG = 5.0  # 曲線轉線段的角度誤差（度）

FILE_PREFIX = "draco_"     # 輸出檔名的開頭（與模型 GLB 的命名方式一致）

Y_UP = True                # Rhino Z 朝上 → glTF Y 朝上（對應 Rhino glTF 匯出的「Map Rhino Z to glTF Y」）
TO_METERS = True           # 單位轉成公尺（glTF 標準）

EDGE_COLOR_RGB = (34, 34, 34)   # GLB 內邊線材質的顏色

ADD_TO_DOC = True          # 邊線也放到 Rhino 文件中檢查
ROOT_LAYER = "CAD_Edges"   # 檢查用的最上層圖層
MIRROR_LAYERS = True       # True = 照原物件的圖層結構建立子圖層；False = 全部放在 ROOT_LAYER
JOIN_CURVES = True         # 檢查用的曲線：相連的邊組合成一條，減少物件數量


# ---------------------------------------------------------------------------
# 圖層（檢查用）
# ---------------------------------------------------------------------------
def clean_name(name):
    """圖層名稱不能包含 '::'（Rhino 的階層分隔符號），也不能是空白。"""
    name = (name or "").replace("::", "_").strip()
    return name if name else "Unnamed"


def get_or_create_layer(path_parts):
    """依路徑逐層建立圖層，回傳最底層的 index。"""
    color = System.Drawing.Color.FromArgb(*EDGE_COLOR_RGB)
    parent_id = System.Guid.Empty
    index = -1
    full = ""
    for part in path_parts:
        part = clean_name(part)
        full = part if not full else full + "::" + part
        index = sc.doc.Layers.FindByFullPath(full, -1)
        if index < 0:
            layer = Rhino.DocObjects.Layer()
            layer.Name = part
            layer.Color = color
            if parent_id != System.Guid.Empty:
                layer.ParentLayerId = parent_id
            index = sc.doc.Layers.Add(layer)
            if index < 0:
                raise Exception("無法建立圖層：" + full)
        parent_id = sc.doc.Layers[index].Id
    return index


def is_under_root(layer_index):
    layer = sc.doc.Layers[layer_index]
    if layer is None:
        return False
    full = layer.FullPath
    return full == ROOT_LAYER or full.startswith(ROOT_LAYER + "::")


def clear_old_edges():
    """刪除 ROOT_LAYER 及其子圖層上的所有物件（上次產生的邊線）。"""
    count = 0
    for layer in sc.doc.Layers:
        if layer.IsDeleted or not is_under_root(layer.Index):
            continue
        for obj in sc.doc.Objects.FindByLayer(layer) or []:
            if sc.doc.Objects.Delete(obj, True):
                count += 1
    return count


def edge_layer_for(rh_obj):
    if not MIRROR_LAYERS:
        return get_or_create_layer([ROOT_LAYER])
    src = sc.doc.Layers[rh_obj.Attributes.LayerIndex]
    parts = src.FullPath.split("::") if src else []
    return get_or_create_layer([ROOT_LAYER] + parts)


# ---------------------------------------------------------------------------
# 取得要處理的物件
# ---------------------------------------------------------------------------
def get_source_objects():
    selected = list(sc.doc.Objects.GetSelectedObjects(False, False))
    if selected:
        objs = selected
    else:
        settings = Rhino.DocObjects.ObjectEnumeratorSettings()
        settings.VisibleFilter = True
        settings.HiddenObjects = False
        objs = list(sc.doc.Objects.GetObjectList(settings))

    return [o for o in objs if not is_under_root(o.Attributes.LayerIndex)]


def object_name(rh_obj):
    name = rh_obj.Attributes.Name
    if name:
        return name
    layer = sc.doc.Layers[rh_obj.Attributes.LayerIndex]
    return layer.Name if layer else "Object"


def to_brep(geo):
    """把各種實體幾何轉成 Brep；不支援的類型回傳 None。"""
    if isinstance(geo, Rhino.Geometry.Brep):
        return geo
    if isinstance(geo, Rhino.Geometry.Extrusion):
        return geo.ToBrep(True)
    if isinstance(geo, Rhino.Geometry.Surface):
        return geo.ToBrep()
    if hasattr(Rhino.Geometry, "SubD") and isinstance(geo, Rhino.Geometry.SubD):
        try:
            return geo.ToBrep(Rhino.Geometry.SubDToBrepOptions.Default)
        except Exception:
            return None
    return None


def collect_breps(rh_obj):
    """回傳 [(brep, xform)]。圖塊會往下展開，套用每一層的變換。"""
    result = []

    def walk(geo_obj, xform):
        if isinstance(geo_obj, Rhino.DocObjects.InstanceObject):
            child_xform = xform * geo_obj.InstanceXform
            for child in geo_obj.InstanceDefinition.GetObjects():
                walk(child, child_xform)
            return
        brep = to_brep(geo_obj.Geometry)
        if brep is not None:
            result.append((brep, xform))

    walk(rh_obj, Rhino.Geometry.Transform.Identity)
    return result


# ---------------------------------------------------------------------------
# 取邊線
# ---------------------------------------------------------------------------
def is_seam(edge):
    faces = list(edge.AdjacentFaces())
    return len(faces) == 2 and faces[0] == faces[1]


def brep_edge_curves(brep):
    curves = []
    smooth_tol = math.radians(SMOOTH_ANGLE_DEG)
    for edge in brep.Edges:
        if SKIP_SEAMS and is_seam(edge):
            continue
        if SKIP_SMOOTH_EDGES and edge.IsSmoothManifoldEdge(smooth_tol):
            continue
        crv = edge.DuplicateCurve()
        if crv is not None:
            curves.append(crv)
    return curves


def curve_points(crv, chord_tol, angle_tol):
    """曲線轉成點列（相鄰兩點為一段線）。"""
    ok, pl = crv.TryGetPolyline()
    if ok:
        return list(pl)
    poly = crv.ToPolyline(chord_tol, angle_tol, 0.0, 0.0)
    if poly is None:
        return [crv.PointAtStart, crv.PointAtEnd]
    return [poly.Point(i) for i in range(poly.PointCount)]


# ---------------------------------------------------------------------------
# 寫出 GLB（mode 1 = LINES）
# ---------------------------------------------------------------------------
def pad4(data, fill):
    while len(data) % 4:
        data.extend(fill)
    return data


def write_glb(path, parts):
    """parts: [(name, [x, y, z, x, y, z, ...])]，每 6 個數字為一段線。"""
    r, g, b = [c / 255.0 for c in EDGE_COLOR_RGB]
    bin_data = bytearray()
    gltf = {
        "asset": {"version": "2.0", "generator": "export_cad_edges.py"},
        "scene": 0,
        "scenes": [{"nodes": []}],
        "nodes": [],
        "meshes": [],
        "materials": [{
            "name": "CAD_Edge",
            "pbrMetallicRoughness": {"baseColorFactor": [r, g, b, 1.0]},
            "extensions": {"KHR_materials_unlit": {}},
        }],
        "extensionsUsed": ["KHR_materials_unlit"],
        "accessors": [],
        "bufferViews": [],
        "buffers": [],
    }

    for name, values in parts:
        count = len(values) // 3
        if count < 2:
            continue
        xs, ys, zs = values[0::3], values[1::3], values[2::3]

        offset = len(bin_data)
        bin_data.extend(struct.pack("<%df" % len(values), *values))
        pad4(bin_data, b"\x00")

        index = len(gltf["meshes"])
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": offset,
                                    "byteLength": len(values) * 4, "target": 34962})
        gltf["accessors"].append({"bufferView": index, "componentType": 5126, "count": count,
                                  "type": "VEC3",
                                  "min": [min(xs), min(ys), min(zs)],
                                  "max": [max(xs), max(ys), max(zs)]})
        gltf["meshes"].append({"name": name, "primitives": [
            {"attributes": {"POSITION": index}, "mode": 1, "material": 0}]})
        gltf["nodes"].append({"name": name, "mesh": index})
        gltf["scenes"][0]["nodes"].append(index)

    if not gltf["meshes"]:
        return False

    gltf["buffers"].append({"byteLength": len(bin_data)})

    json_data = bytearray(json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    pad4(json_data, b" ")

    total = 12 + 8 + len(json_data) + 8 + len(bin_data)
    out = bytearray()
    out.extend(struct.pack("<III", 0x46546C67, 2, total))
    out.extend(struct.pack("<II", len(json_data), 0x4E4F534A))   # JSON
    out.extend(json_data)
    out.extend(struct.pack("<II", len(bin_data), 0x004E4942))    # BIN
    out.extend(bin_data)

    with open(path, "wb") as f:
        f.write(bytes(out))
    return True


def output_path():
    doc_path = sc.doc.Path
    if doc_path:
        folder = os.path.dirname(doc_path)
        name = os.path.splitext(os.path.basename(doc_path))[0]
        return os.path.join(folder, FILE_PREFIX + name + "_edges.glb")
    return rs.SaveFileName("儲存 CAD 邊線 GLB", "glTF Binary (*.glb)|*.glb||", None, FILE_PREFIX + "edges.glb")


# ---------------------------------------------------------------------------
def main():
    objs = get_source_objects()
    if not objs:
        print("沒有可處理的物件。")
        return

    path = output_path()
    if not path:
        print("已取消。")
        return

    tol = sc.doc.ModelAbsoluteTolerance
    unit_scale = Rhino.RhinoMath.UnitScale(sc.doc.ModelUnitSystem, Rhino.UnitSystem.Meters) if TO_METERS else 1.0
    chord_tol = CHORD_TOLERANCE_MM * Rhino.RhinoMath.UnitScale(Rhino.UnitSystem.Millimeters, sc.doc.ModelUnitSystem)
    angle_tol = math.radians(ANGLE_TOLERANCE_DEG)

    parts = []
    total_edges = 0
    total_segments = 0
    skipped = 0
    removed = 0

    sc.doc.Views.RedrawEnabled = False
    try:
        if ADD_TO_DOC:
            removed = clear_old_edges()

        for rh_obj in objs:
            items = collect_breps(rh_obj)
            if not items:
                skipped += 1
                continue

            name = object_name(rh_obj)
            curves = []
            for brep, xform in items:
                for crv in brep_edge_curves(brep):
                    crv.Transform(xform)
                    curves.append(crv)
            if not curves:
                continue
            total_edges += len(curves)

            # GLB：每條邊轉成線段
            values = []
            for crv in curves:
                pts = curve_points(crv, chord_tol, angle_tol)
                for i in range(len(pts) - 1):
                    for p in (pts[i], pts[i + 1]):
                        x, y, z = p.X * unit_scale, p.Y * unit_scale, p.Z * unit_scale
                        if Y_UP:
                            values.extend((x, z, -y))   # Rhino Z 朝上 → glTF Y 朝上
                        else:
                            values.extend((x, y, z))
                    total_segments += 1
            if values:
                parts.append((name, values))

            # Rhino 文件：檢查用的曲線
            if ADD_TO_DOC:
                doc_curves = curves
                if JOIN_CURVES:
                    joined = Rhino.Geometry.Curve.JoinCurves(curves, tol)
                    if joined:
                        doc_curves = list(joined)
                attrs = Rhino.DocObjects.ObjectAttributes()
                attrs.LayerIndex = edge_layer_for(rh_obj)
                attrs.Name = name
                attrs.ColorSource = Rhino.DocObjects.ObjectColorSource.ColorFromLayer
                for crv in doc_curves:
                    sc.doc.Objects.AddCurve(crv, attrs)
    finally:
        sc.doc.Views.RedrawEnabled = True
        sc.doc.Views.Redraw()

    if not write_glb(path, parts):
        print("沒有找到任何邊線（只支援實體 / 曲面 / 擠出物件 / 圖塊，網格物件沒有 CAD 邊線）。")
        return

    msg = "完成：{} 個物件、{} 條邊、{} 段線 → {}".format(len(parts), total_edges, total_segments, path)
    if removed:
        msg += "（已清除 CAD_Edges 舊邊線 {} 條）".format(removed)
    print(msg)
    if skipped:
        print("略過 {} 個不支援的物件（例如網格、曲線、點）。".format(skipped))


main()
