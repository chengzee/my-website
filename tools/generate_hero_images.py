#!/usr/bin/env python3
"""
Generate hero-sized images (1920px wide) for homepage carousel.
Curated selection: 6 photos covering all 4 cats, all landscape orientation.
Uses sips (macOS built-in) for high-quality resizing.
"""
import subprocess, os

# Curated hero selection - picked for variety and quality
# Each cat represented, all landscape, largest/sharpest source files
HERO_PHOTOS = [
    "photos/波波/IMG_0793.JPG",     # 4752x3168 9.1MB - largest 波波 photo
    "photos/米米/IMG_0779.JPG",     # 4752x3168 8.5MB - largest 米米 photo
    "photos/豆豆/IMG_0819.JPG",     # 4752x3168 7.2MB - sharp 豆豆 photo
    "photos/小寶寶/IMG_0162.JPG",   # 4096x2304 4.1MB - only landscape 小寶寶
    "photos/波波/IMG_0805.JPG",     # 4752x3168 7.9MB - 2nd 波波 for variety
    "photos/米米/IMG_0784.JPG",     # 4752x3168 8.2MB - 2nd 米米 for variety
]

HERO_DIR = "photos/_hero"
HERO_WIDTH = 1920

os.makedirs(HERO_DIR, exist_ok=True)

for src in HERO_PHOTOS:
    if not os.path.exists(src):
        print(f"SKIP (not found): {src}")
        continue

    basename = os.path.basename(src)
    # Normalize extension to .jpg
    name, _ = os.path.splitext(basename)
    dest = os.path.join(HERO_DIR, f"{name}.jpg")

    # Copy first, then resize (sips modifies in-place)
    subprocess.run(["cp", src, dest], check=True)
    subprocess.run(
        ["sips", "-Z", str(HERO_WIDTH), "-s", "format", "jpeg", dest],
        capture_output=True, check=True
    )

    size_kb = os.path.getsize(dest) / 1024
    print(f"OK  {basename:25s} -> {dest:40s} ({size_kb:.0f} KB)")

print(f"\nDone! {len(HERO_PHOTOS)} hero images in {HERO_DIR}/")
