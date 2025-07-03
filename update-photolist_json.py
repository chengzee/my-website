import os
import json
from datetime import datetime

PHOTO_FOLDER = "photos"
OUTPUT_FILE = "photo-list.json"

def get_file_date(filepath):
    timestamp = os.path.getmtime(filepath)
    return datetime.fromtimestamp(timestamp).isoformat()

# 先讀舊的 JSON，如果有的話
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        photo_entries = json.load(f)
    print(f"✅ 讀到現有資料，共 {len(photo_entries)} 筆")
else:
    photo_entries = []
    print("✅ 沒有找到舊的 JSON，建立新檔案")

# 建立一個 set 紀錄現有檔名，避免重複
existing_files = set(entry["filename"] for entry in photo_entries)

# 掃資料夾裡的所有 jpg
new_entries = []
for filename in os.listdir(PHOTO_FOLDER):
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        rel_path = os.path.join(PHOTO_FOLDER, filename)
        if rel_path not in existing_files:
            file_date = get_file_date(rel_path)
            new_entry = {
                "filename": rel_path,
                "date": file_date
            }
            new_entries.append(new_entry)
            print(f"🆕 新增檔案: {rel_path}")

# 合併新舊
photo_entries.extend(new_entries)

# 依日期新到舊排序
photo_entries.sort(key=lambda x: x["date"], reverse=True)

# 輸出 JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(photo_entries, f, indent=2, ensure_ascii=False)

print(f"✅ 輸出完成：{OUTPUT_FILE}，總共 {len(photo_entries)} 筆")
