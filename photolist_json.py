import os
import json
from datetime import datetime

# 🟣 你的照片資料夾路徑
PHOTO_FOLDER = "photos"
# 🟣 輸出 JSON 檔案
OUTPUT_FILE = "photo-list.json"

# 先確保路徑正確
photo_entries = []

for filename in os.listdir(PHOTO_FOLDER):
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        filepath = os.path.join(PHOTO_FOLDER, filename)
        # 取得檔案最後修改時間
        timestamp = os.path.getmtime(filepath)
        iso_time = datetime.fromtimestamp(timestamp).isoformat()
        
        # 加進清單
        photo_entries.append({
            "filename": os.path.join(PHOTO_FOLDER, filename),
            "date": iso_time
        })

# 按時間新到舊排序
photo_entries.sort(key=lambda x: x["date"], reverse=True)

# 輸出 JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(photo_entries, f, indent=2, ensure_ascii=False)

print(f"✅ 已輸出到 {OUTPUT_FILE}，共 {len(photo_entries)} 筆")
