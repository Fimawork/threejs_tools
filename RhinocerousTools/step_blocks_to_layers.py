#! python 3
# -*- coding: utf-8 -*-
"""
STEP 組合件：依零件名稱建立圖層，並把零件放到同名圖層

用途：
  Rhino 匯入 SolidWorks 轉出的 STEP 組合件後，零件會變成圖塊（Block），
  零件名稱只看得到在 Block Manager 裡。這個腳本會：
  1. 依每個零件（圖塊定義）的名稱建立圖層
  2. 子組合件會變成上層圖層，零件放在底下（例如 Assembly::SubAsm::Part）
  3. 把零件放到對應的圖層，物件名稱也設成零件名稱

使用方式：
  匯入 STEP 後，執行 ScriptEditor 開啟這個檔案按 Run，
  或在指令列輸入 _-ScriptEditor _Run "完整路徑\\step_blocks_to_layers.py"
  Rhino 7 請用 _-RunPythonScript "完整路徑\\step_blocks_to_layers.py"

設定：
  EXPLODE       True  = 炸開圖塊，變成一般物件（之後要網格化、減面、匯出比較方便）
                False = 保留圖塊，只把最上層的圖塊引用移到零件圖層
  ROOT_LAYER    所有零件圖層的上層圖層名稱；設成 "" 則直接放在最上層
  NESTED        True  = 子組合件建立成上層圖層（保留組合件結構）
                False = 所有零件圖層都放在同一層
"""

import Rhino
import scriptcontext as sc
import System

EXPLODE = True
ROOT_LAYER = "STEP_Parts"
NESTED = True


# ---------------------------------------------------------------------------
# 圖層
# ---------------------------------------------------------------------------
def clean_name(name):
    """圖層名稱不能包含 '::'（Rhino 的階層分隔符號），也不能是空白。"""
    name = (name or "").replace("::", "_").strip()
    return name if name else "Unnamed"


def get_or_create_layer(path_parts):
    """依路徑（例如 ["STEP_Parts", "SubAsm", "Part"]）逐層建立圖層，回傳最底層的 index。"""
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
            if parent_id != System.Guid.Empty:
                layer.ParentLayerId = parent_id
            index = sc.doc.Layers.Add(layer)
            if index < 0:
                raise Exception("無法建立圖層：" + full)
        parent_id = sc.doc.Layers[index].Id
    return index


# ---------------------------------------------------------------------------
# 炸開模式：遞迴展開圖塊，物件放到零件圖層
# ---------------------------------------------------------------------------
def explode_instance(idef, xform, layer_path, src_attrs, stats):
    """把圖塊定義裡的物件依 xform 複製到文件中。遇到子圖塊（子零件 / 子組合件）就往下遞迴。"""
    name = clean_name(idef.Name)
    has_geometry = any(o.ObjectType != Rhino.DocObjects.ObjectType.InstanceReference
                       for o in idef.GetObjects())

    # 子組合件：只當成上層圖層；零件：建立自己的圖層
    my_path = layer_path + [name] if NESTED or has_geometry else layer_path
    layer_index = get_or_create_layer(my_path) if has_geometry else None

    for obj in idef.GetObjects():
        if obj.ObjectType == Rhino.DocObjects.ObjectType.InstanceReference:
            child = obj.InstanceDefinition
            child_xform = xform * obj.InstanceXform
            child_path = my_path if NESTED else layer_path
            explode_instance(child, child_xform, child_path, obj.Attributes, stats)
            continue

        geo = obj.Geometry.Duplicate()
        geo.Transform(xform)

        attrs = obj.Attributes.Duplicate()
        attrs.LayerIndex = layer_index
        attrs.Name = name
        # 圖塊內的物件若顏色 / 材質設為 By Parent，沿用圖塊引用的設定
        if attrs.ColorSource == Rhino.DocObjects.ObjectColorSource.ColorFromParent:
            attrs.ColorSource = src_attrs.ColorSource
            attrs.ObjectColor = src_attrs.ObjectColor
        if attrs.MaterialSource == Rhino.DocObjects.ObjectMaterialSource.MaterialFromParent:
            attrs.MaterialSource = src_attrs.MaterialSource
            attrs.MaterialIndex = src_attrs.MaterialIndex

        if sc.doc.Objects.Add(geo, attrs) != System.Guid.Empty:
            stats["objects"] += 1
    stats["parts"].add(name)


# ---------------------------------------------------------------------------
def main():
    settings = Rhino.DocObjects.ObjectEnumeratorSettings()
    settings.ObjectTypeFilter = Rhino.DocObjects.ObjectType.InstanceReference
    settings.HiddenObjects = True
    settings.LockedObjects = True
    instances = list(sc.doc.Objects.GetObjectList(settings))

    if not instances:
        print("找不到任何圖塊。請確認 STEP 匯入時有保留組合件結構。")
        return

    root = [ROOT_LAYER] if ROOT_LAYER else []
    stats = {"objects": 0, "parts": set()}

    sc.doc.Views.RedrawEnabled = False
    try:
        for inst in instances:
            idef = inst.InstanceDefinition
            if EXPLODE:
                explode_instance(idef, inst.InstanceXform, root, inst.Attributes, stats)
                sc.doc.Objects.Delete(inst, True)
            else:
                attrs = inst.Attributes.Duplicate()
                attrs.LayerIndex = get_or_create_layer(root + [idef.Name])
                attrs.Name = clean_name(idef.Name)
                sc.doc.Objects.ModifyAttributes(inst, attrs, True)
                stats["parts"].add(clean_name(idef.Name))
                stats["objects"] += 1

        if EXPLODE:
            # 刪除已經沒有被使用的圖塊定義，讓 Block Manager 保持乾淨
            # 子組合件的定義要等上層定義刪掉後才會變成未使用，所以重複到沒有可刪的為止
            removed = True
            while removed:
                removed = False
                for idef in list(sc.doc.InstanceDefinitions):
                    if idef is not None and not idef.IsDeleted and idef.UseCount() == 0:
                        if sc.doc.InstanceDefinitions.Delete(idef.Index, True, True):
                            removed = True
    finally:
        sc.doc.Views.RedrawEnabled = True
        sc.doc.Views.Redraw()

    mode = "炸開" if EXPLODE else "保留圖塊"
    print("完成（{}）：{} 個零件圖層，{} 個物件".format(mode, len(stats["parts"]), stats["objects"]))


main()
