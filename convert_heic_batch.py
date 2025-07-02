import os
from PIL import Image
import pillow_heif

# 自動抓當前 .py 檔的路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 指定輸入/輸出資料夾
input_folder = os.path.join(BASE_DIR, "heic_images")
output_folder = os.path.join(BASE_DIR, "converted_images")
os.makedirs(output_folder, exist_ok=True)

# 註冊 HEIF 格式給 Pillow
pillow_heif.register_heif_opener()

# 走訪 heic_images 裡所有檔案
for filename in os.listdir(input_folder):
    if filename.lower().endswith(".heic"):
        heic_path = os.path.join(input_folder, filename)
        print(f"🔄 轉換中：{heic_path}")

        # 直接用 Pillow 開啟 HEIC
        image = Image.open(heic_path)

        # 產生輸出檔名
        base_name = os.path.splitext(filename)[0]
        output_path = os.path.join(output_folder, f"{base_name}.jpg")

        # 儲存成 JPG
        image.save(output_path, "JPEG")
        print(f"✅ 已輸出：{output_path}")

print("🎉 所有 HEIC 轉換完成！")
