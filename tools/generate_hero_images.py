#!/usr/bin/env python3
"""
Generate hero-sized images (1920px wide) for homepage carousel.
Selection based on brightness analysis - brightest landscape photos per cat.
Uses sips (macOS built-in) for high-quality resizing.
"""
import subprocess, os

# Curated hero selection - picked by brightness analysis (avg luminance 0-255)
# Excluded surveillance cam photos (A842/F0A7 prefix - low res)
# All landscape orientation, each cat represented
HERO_PHOTOS = [
    "photos/豆豆/IMG_0766.JPG",     # brightness 192.0 - #1 brightest
    "photos/豆豆/IMG_0785.JPG",     # brightness 182.2 - #2
    "photos/小寶寶/IMG_1575.JPG",   # brightness 132.1 - brightest landscape 小寶寶
    "photos/米米/IMG_0784.JPG",     # brightness 129.5 - brightest 米米 (real photo)
    "photos/波波/IMG_1478.jpg",     # brightness 128.0 - brightest 波波
    "photos/豆豆/IMG_0744.JPG",     # brightness 177.6 - #3 brightest, variety
]

HERO_DIR = "photos/_hero"
HERO_WIDTH = 1920

os.makedirs(HERO_DIR, exist_ok=True)

# Clean old hero images
for f in os.listdir(HERO_DIR):
    old = os.path.join(HERO_DIR, f)
    os.remove(old)
    print(f"Removed old: {f}")
print()

for src in HERO_PHOTOS:
    if not os.path.exists(src):
        print(f"SKIP (not found): {src}")
        continue

    basename = os.path.basename(src)
    name, _ = os.path.splitext(basename)
    dest = os.path.join(HERO_DIR, f"{name}.jpg")

    subprocess.run(["cp", src, dest], check=True)
    subprocess.run(
        ["sips", "-Z", str(HERO_WIDTH), "-s", "format", "jpeg", dest],
        capture_output=True, check=True
    )

    size_kb = os.path.getsize(dest) / 1024
    cat = src.split("/")[1]
    print(f"OK  {cat:6s} {basename:25s} -> {os.path.basename(dest):25s} ({size_kb:.0f} KB)")

print(f"\nDone! {len(HERO_PHOTOS)} hero images in {HERO_DIR}/")
