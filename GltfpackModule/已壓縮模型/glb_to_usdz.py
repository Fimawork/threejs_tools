"""
GLB -> USDZ 轉檔腳本（給 iPhone AR Quick Look 使用）

流程：
  1. 清空場景，匯入 GLB（支援 Draco 壓縮）
  2. 所有貼圖轉成 JPEG（有透明的轉 PNG），USDZ 不支援 WebP
  3. 頂點數超過目標時，對大零件加上 Decimate 減面
  4. 匯出二進位 USDZ（.usdc 打包），UV 改名為 st、材質轉 UsdPreviewSurface

用法一：命令列（不用打開 Blender 介面）
  blender -b -P glb_to_usdz.py -- input.glb output.usdz
  blender -b -P glb_to_usdz.py -- input.glb output.usdz --target 150000 --texture-size 1024

  Windows 範例（路徑依你的 Blender 版本調整）：
  "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b -P glb_to_usdz.py -- ^
      D:\\path\\model.glb D:\\path\\model.usdz

用法二：在 Blender 的 Scripting 工作區打開這個檔案，修改最下方 DEFAULTS 後按 Run Script

參數：
  --target        總頂點數目標，預設 150000；設 0 表示不減面
  --min-verts     頂點數低於這個值的零件不減面，預設 20000
  --min-ratio     減面比例下限，避免小細節被削壞，預設 0.2
  --texture-size  貼圖最大邊長（只縮小不放大），預設 1024；設 0 表示不縮
  --jpeg-quality  JPEG 品質，預設 90
  --texture-dir   轉出的貼圖存放位置，預設與 output 同資料夾下的 <檔名>_textures
"""

import argparse
import os
import sys

import bpy

# 在 Blender 介面裡執行（沒有命令列參數）時使用的預設值
DEFAULTS = {
    "input": r"D:\path\to\model.glb",
    "output": r"D:\path\to\model.usdz",
}


# ---------------------------------------------------------------------------
# 參數
# ---------------------------------------------------------------------------
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description="GLB -> USDZ for AR Quick Look")
    p.add_argument("input", nargs="?", default=DEFAULTS["input"])
    p.add_argument("output", nargs="?", default=DEFAULTS["output"])
    p.add_argument("--target", type=int, default=150000)
    p.add_argument("--min-verts", type=int, default=20000)
    p.add_argument("--min-ratio", type=float, default=0.2)
    p.add_argument("--texture-size", type=int, default=1024)
    p.add_argument("--jpeg-quality", type=int, default=90)
    p.add_argument("--texture-dir", default=None)
    args = p.parse_args(argv)

    if not args.output.lower().endswith(".usdz"):
        sys.exit("output 檔名必須以 .usdz 結尾")
    if not os.path.isfile(args.input):
        sys.exit(f"找不到輸入檔：{args.input}")
    if args.texture_dir is None:
        base = os.path.splitext(args.output)[0]
        args.texture_dir = base + "_textures"
    return args


# ---------------------------------------------------------------------------
# 1. 清空場景並匯入 GLB
# ---------------------------------------------------------------------------
def reset_and_import(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    print(f"[import] {len(meshes)} 個網格物件")
    return meshes


# ---------------------------------------------------------------------------
# 2. 貼圖轉成 JPEG / PNG
# ---------------------------------------------------------------------------
def image_has_alpha(img):
    """貼圖是否真的有用到透明（有 alpha 通道且存在不透明度 < 1 的像素）。"""
    if img.channels < 4 or img.size[0] == 0:
        return False
    try:
        import numpy as np
        px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        return bool((px[3::4] < 0.999).any())
    except Exception:
        return True  # 判斷不了就保守當作有透明，存成 PNG


def convert_textures(tex_dir, max_size, quality):
    os.makedirs(tex_dir, exist_ok=True)
    images = [i for i in bpy.data.images if i.type == "IMAGE" and i.users > 0]

    for img in images:
        if img.size[0] == 0:  # 有些情況要先存取一次才會載入像素
            img.reload()

        # 縮小過大的貼圖
        w, h = img.size
        if max_size and max(w, h) > max_size:
            s = max_size / max(w, h)
            img.scale(max(1, round(w * s)), max(1, round(h * s)))

        alpha = image_has_alpha(img)
        fmt, ext = ("PNG", ".png") if alpha else ("JPEG", ".jpg")
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in img.name)
        out = os.path.join(tex_dir, safe + ext)

        img.file_format = fmt
        img.save(filepath=out, quality=quality)

        # 用存好的檔案取代原本（GLB 內嵌、可能是 WebP）的貼圖
        new_img = bpy.data.images.load(out, check_existing=False)
        new_img.colorspace_settings.name = img.colorspace_settings.name
        img.user_remap(new_img)
        print(f"[texture] {img.name} -> {os.path.basename(out)} ({new_img.size[0]}x{new_img.size[1]}, {fmt})")


# ---------------------------------------------------------------------------
# 3. 減面
# ---------------------------------------------------------------------------
def decimate(meshes, target, min_verts, min_ratio):
    counts = {o: len(o.data.vertices) for o in meshes}
    total = sum(counts.values())
    print(f"[decimate] 原始總頂點數 {total:,}")
    if not target or total <= target:
        print("[decimate] 不需要減面")
        return

    big = {o: n for o, n in counts.items() if n >= min_verts}
    small_total = total - sum(big.values())
    if not big:
        print("[decimate] 沒有超過 min-verts 的零件，略過")
        return

    ratio = (target - small_total) / sum(big.values())
    ratio = max(min_ratio, min(1.0, ratio))

    for o, n in sorted(big.items(), key=lambda x: -x[1]):
        mod = o.modifiers.new(name="AR_Decimate", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        print(f"[decimate] {o.name}: {n:,} 頂點 x {ratio:.2f}")

    # 修改器會在匯出時套用；這裡只估算結果
    est = small_total + sum(big.values()) * ratio
    print(f"[decimate] 預估總頂點數約 {int(est):,}")


# ---------------------------------------------------------------------------
# 4. 匯出 USDZ
# ---------------------------------------------------------------------------
def export_usdz(path):
    wanted = {
        "selected_objects_only": False,
        "visible_objects_only": True,
        "export_animation": False,
        "export_hair": False,
        "export_uvmaps": True,
        "rename_uvmaps": True,             # UV 改名為 st（Quick Look 需要）
        "export_normals": True,
        "export_materials": True,
        "generate_preview_surface": True,  # 材質轉 UsdPreviewSurface
        "export_textures": True,
        "overwrite_textures": True,
        "export_cameras": False,
        "export_lights": False,
        "use_instancing": False,
        "evaluation_mode": "RENDER",       # 匯出時套用修改器（含 Decimate）
        "convert_orientation": True,       # Blender Z 朝上 -> USD Y 朝上
        "export_global_forward_selection": "NEGATIVE_Z",
        "export_global_up_selection": "Y",
        "usdz_downscale_size": "KEEP",     # 貼圖已在前面處理
    }
    # 不同 Blender 版本的參數名稱不同，只傳入這個版本有的參數
    available = set(bpy.ops.wm.usd_export.get_rna_type().properties.keys())
    kwargs = {k: v for k, v in wanted.items() if k in available}
    skipped = sorted(set(wanted) - available)
    if skipped:
        print(f"[export] 此版本不支援的參數已略過：{', '.join(skipped)}")

    bpy.ops.wm.usd_export(filepath=path, **kwargs)
    size = os.path.getsize(path) / 1e6
    print(f"[export] {path}  ({size:.1f} MB)")


# ---------------------------------------------------------------------------
def main():
    args = parse_args()
    print(f"Blender {bpy.app.version_string}")
    meshes = reset_and_import(args.input)
    convert_textures(args.texture_dir, args.texture_size, args.jpeg_quality)
    decimate(meshes, args.target, args.min_verts, args.min_ratio)
    export_usdz(args.output)
    print("完成。請在 iPhone 上用「檔案」App 打開 USDZ 檢查外觀與 AR 尺寸。")


main()
