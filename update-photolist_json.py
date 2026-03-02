#!/usr/bin/env python3
"""
掃描 photos/ 所有子目錄，產生 photo-list.json
供 photo-gallery.html 讀取顯示
"""
import os
import json
from datetime import datetime

PHOTO_FOLDER = "photos"
THUMB_FOLDER = os.path.join(PHOTO_FOLDER, "_thumbnails")
OUTPUT_FILE = "photo-list.json"

# 支援的圖片格式
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
# 支援的影片格式
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm"}

# 排除的資料夾（底線開頭的分類）
EXCLUDE_DIRS = {"_已刪除", "_thumbnails", "_保留"}


def get_file_date(filepath):
    timestamp = os.path.getmtime(filepath)
    return datetime.fromtimestamp(timestamp).isoformat()


def scan_photos():
    """遞迴掃描 photos/ 下所有子目錄的圖片與影片"""
    entries = []

    for root, dirs, files in os.walk(PHOTO_FOLDER):
        # 取得相對於 photos/ 的資料夾名稱
        rel_dir = os.path.relpath(root, PHOTO_FOLDER)
        folder_name = rel_dir if rel_dir != "." else ""

        # 跳過排除的資料夾
        if folder_name in EXCLUDE_DIRS:
            dirs[:] = []  # 不再遞迴進入
            continue

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in IMAGE_EXTS or ext in VIDEO_EXTS:
                rel_path = os.path.join(root, filename)
                file_type = "image" if ext in IMAGE_EXTS else "video"

                # 查找對應的縮圖
                thumb_path = ""
                if file_type == "image" and folder_name:
                    base = os.path.splitext(filename)[0]
                    candidate = os.path.join(THUMB_FOLDER, folder_name, base + ".jpg")
                    if os.path.isfile(candidate):
                        thumb_path = candidate

                entry = {
                    "filename": rel_path,
                    "category": folder_name,
                    "type": file_type,
                    "date": get_file_date(rel_path)
                }
                if thumb_path:
                    entry["thumbnail"] = thumb_path
                entries.append(entry)

    return entries


def main():
    entries = scan_photos()

    # 依日期新到舊排序
    entries.sort(key=lambda x: x["date"], reverse=True)

    # 統計
    categories = {}
    for e in entries:
        cat = e["category"] or "(根目錄)"
        categories[cat] = categories.get(cat, 0) + 1

    # 輸出 JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    print("=" * 40)
    print("📸 photo-list.json 更新完成")
    print("=" * 40)
    for cat, count in sorted(categories.items()):
        print("  %s: %d 張" % (cat, count))
    print("-" * 40)
    print("  總計: %d 筆" % len(entries))
    print("  輸出: %s" % OUTPUT_FILE)


if __name__ == "__main__":
    main()
