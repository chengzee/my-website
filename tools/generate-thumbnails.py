#!/usr/bin/env python3
"""
📸 產生縮圖 — 用 macOS sips 將 photos/ 子目錄照片壓縮為 400px 寬縮圖
縮圖存到 photos/_thumbnails/<分類>/<檔名>.jpg
"""
import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(BASE_DIR, "photos")
THUMB_DIR = os.path.join(PHOTOS_DIR, "_thumbnails")
THUMB_WIDTH = 400  # px

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
EXCLUDE_DIRS = {"_已刪除", "_保留", "_thumbnails"}


def generate_thumbnails():
    created = 0
    skipped = 0
    failed = 0

    for category in sorted(os.listdir(PHOTOS_DIR)):
        cat_path = os.path.join(PHOTOS_DIR, category)
        if not os.path.isdir(cat_path):
            continue
        if category.startswith(".") or category in EXCLUDE_DIRS:
            continue

        thumb_cat_dir = os.path.join(THUMB_DIR, category)
        os.makedirs(thumb_cat_dir, exist_ok=True)

        files = sorted(os.listdir(cat_path))
        img_files = [f for f in files if os.path.splitext(f)[1].lower() in IMAGE_EXTS]

        for i, filename in enumerate(img_files):
            src = os.path.join(cat_path, filename)
            # 縮圖統一用 .jpg
            base = os.path.splitext(filename)[0]
            thumb_name = base + ".jpg"
            thumb_path = os.path.join(thumb_cat_dir, thumb_name)

            # 已有縮圖且比原圖新 → 跳過
            if os.path.isfile(thumb_path):
                if os.path.getmtime(thumb_path) >= os.path.getmtime(src):
                    skipped += 1
                    continue

            try:
                subprocess.run(
                    ["sips", "-s", "format", "jpeg",
                     "-s", "formatOptions", "70",
                     "--resampleWidth", str(THUMB_WIDTH),
                     src, "--out", thumb_path],
                    capture_output=True, timeout=30
                )
                if os.path.isfile(thumb_path):
                    created += 1
                    sys.stdout.write("\r  %s: %d/%d" % (category, i + 1, len(img_files)))
                    sys.stdout.flush()
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                print("\n  ⚠️ 失敗: %s (%s)" % (filename, e))

        if img_files:
            print("\r  ✅ %s: %d 張完成" % (category, len(img_files)))

    return created, skipped, failed


def main():
    os.makedirs(THUMB_DIR, exist_ok=True)
    print("=" * 45)
    print("📸 縮圖產生工具")
    print("=" * 45)
    print("來源: %s" % PHOTOS_DIR)
    print("輸出: %s" % THUMB_DIR)
    print("寬度: %dpx, JPEG 品質 70%%" % THUMB_WIDTH)
    print("-" * 45)

    created, skipped, failed = generate_thumbnails()

    print("-" * 45)
    print("新建: %d | 跳過(已存在): %d | 失敗: %d" % (created, skipped, failed))

    # 計算縮圖總大小
    total_size = 0
    for root, dirs, files in os.walk(THUMB_DIR):
        for f in files:
            total_size += os.path.getsize(os.path.join(root, f))
    print("縮圖總大小: %.1f MB" % (total_size / 1024 / 1024))
    print("✅ 完成！")


if __name__ == "__main__":
    main()
