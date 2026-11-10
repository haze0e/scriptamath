#!/usr/bin/env python3
"""
ScriptaMath — Custom TrueType Handwriting Font Builder
Extracts vector handwriting glyphs and compiles ChiteshHandwriting.ttf.

Supports two modes:
1. Default / Scanned Notes Mode: Harvests authentic glyphs from scanned lecture notes.
2. Template Sheet Mode: Slices and vectorizes all 104 cells from handwriting_font_sheet.png/pdf.
"""

import os
import sys
import argparse
import subprocess
import tempfile
import re
from pathlib import Path
import numpy as np
from PIL import Image

from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import SVGPath

BASE_DIR = Path(__file__).resolve().parent.parent
BASE_FONT_PATH = BASE_DIR / "public" / "fonts" / "Kalam.ttf"
OUTPUT_FONT_PATH = BASE_DIR / "public" / "fonts" / "ChiteshHandwriting.ttf"

def binarize_and_potrace(crop_img, threshold=175):
    """
    Binarizes a crop image and runs potrace to generate SVG path string.
    """
    gray = crop_img.convert('L')
    arr = np.array(gray)
    
    # 0 = black (strokes), 255 = white (paper)
    binary = np.where(arr < threshold, 0, 255).astype(np.uint8)
    
    # Check if there are actual strokes
    dark_count = np.sum(binary == 0)
    if dark_count < 15:
        return None, (crop_img.width, crop_img.height)
        
    pbm_img = Image.fromarray(binary).convert('1')
    
    with tempfile.TemporaryDirectory() as tmpdir:
        pbm_file = os.path.join(tmpdir, "glyph.pbm")
        svg_file = os.path.join(tmpdir, "glyph.svg")
        pbm_img.save(pbm_file)
        
        cmd = ["potrace", pbm_file, "-s", "-o", svg_file]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            return None, (crop_img.width, crop_img.height)
            
        with open(svg_file, "r") as f:
            svg_content = f.read()
            
        d_match = re.search(r'd="([^"]+)"', svg_content)
        if not d_match:
            return None, (crop_img.width, crop_img.height)
            
        return d_match.group(1), (crop_img.width, crop_img.height)

def convert_svg_to_tt_glyph(svg_d, img_size, baseline_y_ratio=0.74, target_em=1000, target_advance=None):
    """
    Converts SVG path string into TrueType glyph using Cu2QuPen.
    Normalizes coordinates so baseline is at y=0, with standard ascender/descender bounds.
    """
    w, h = img_size
    svg_path = SVGPath.fromstring(f'<path d="{svg_d}"/>')
    
    # In potrace SVG, coordinate scale is 0.1 of image pixels * 10
    # Baseline in image: baseline_y = h * baseline_y_ratio
    # In potrace Y space: y_potrace = 10 * (h - y_img)
    # At baseline: base_pt = 10 * (h - h * baseline_y_ratio) = 10 * h * (1 - baseline_y_ratio)
    
    # Standard capital height in 1000-unit font is ~600 units
    # Standard x-height is ~420 units
    letter_height_px = h * 0.65
    scale_factor = 600.0 / (letter_height_px * 10.0)
    
    # Left side bearing
    lsb = 50.0
    
    tt_pen = TTGlyphPen(None)
    cu2qu_pen = Cu2QuPen(tt_pen, max_err=1.2)
    
    # Transform:
    # y_ttf = (y_pt - base_pt) * scale_factor
    # x_ttf = x_pt * scale_factor + lsb
    base_pt = 10.0 * h * (1.0 - baseline_y_ratio)
    trans = TransformPen(
        cu2qu_pen,
        (scale_factor, 0, 0, scale_factor, lsb, -base_pt * scale_factor)
    )
    
    svg_path.draw(trans)
    glyph = tt_pen.glyph()
    
    # Compute advance width
    if target_advance is not None:
        advance_width = int(target_advance)
    else:
        advance_width = max(350, int((w * 10.0 * scale_factor) + lsb * 2))
        
    return glyph, advance_width, int(lsb)

def build_font_from_notes():
    """
    Extracts authentic glyphs from Chitesh's scanned calculus & STEM notes.
    """
    print(f"Loading base typography skeleton from: {BASE_FONT_PATH}")
    font = TTFont(str(BASE_FONT_PATH))
    cmap = font.getBestCmap()
    
    # Check if user notes exist
    user_notes_dir = Path("/home/haze/Downloads/drive-download-20261101T162329Z-1-001")
    tmp_notes_dir = Path("/tmp/user_notes")
    
    # 1. Harvest glyphs from note3-1.png (Clean unruled calculus notes)
    note3_path = tmp_notes_dir / "crop_words.png"
    if note3_path.exists():
        im_words = Image.open(note3_path)
        # Crops: (x1, y1, x2, y2) inside crop_words.png
        # 'x > s + 1'
        char_crops = {
            'x': (410, 50, 436, 85, 0.72),
            '>': (436, 50, 460, 85, 0.65),
            's': (460, 50, 478, 85, 0.74),
            '+': (478, 50, 498, 85, 0.65),
            '1': (498, 50, 515, 85, 0.78),
        }
        for ch, (x1, y1, x2, y2, base_ratio) in char_crops.items():
            crop = im_words.crop((x1, y1, x2, y2))
            svg_d, size = binarize_and_potrace(crop, threshold=165)
            if svg_d:
                glyph, adv, lsb = convert_svg_to_tt_glyph(svg_d, size, baseline_y_ratio=base_ratio)
                glyph_name = cmap.get(ord(ch))
                if glyph_name:
                    font['glyf'][glyph_name] = glyph
                    font['hmtx'][glyph_name] = (adv, lsb)
                    print(f"  [+] Injected authentic scanned glyph: '{ch}' (adv={adv})")

    # 2. Harvest authentic crossbarred 'z' from note4-01.png
    note4_crop = tmp_notes_dir / "crop_z_eq.png"
    if note4_crop.exists():
        im_z = Image.open(note4_crop)
        # 'z' in 'z = ax + by + ab': x ~ 240-270 in crop_z_eq.png
        crop_z = im_z.crop((235, 8, 275, 48))
        svg_d, size = binarize_and_potrace(crop_z, threshold=175)
        if svg_d:
            glyph, adv, lsb = convert_svg_to_tt_glyph(svg_d, size, baseline_y_ratio=0.75)
            # Replace lowercase 'z'
            z_name = cmap.get(ord('z'))
            if z_name:
                font['glyf'][z_name] = glyph
                font['hmtx'][z_name] = (adv, lsb)
                print(f"  [+] Injected authentic STEM crossbarred glyph: 'z' (adv={adv})")
            # Also uppercase 'Z'
            Z_name = cmap.get(ord('Z'))
            if Z_name:
                font['glyf'][Z_name] = glyph
                font['hmtx'][Z_name] = (adv + 60, lsb)
                print(f"  [+] Injected authentic STEM crossbarred glyph: 'Z'")

    # 3. Harvest digits from header '25323015'
    digits_crop_path = tmp_notes_dir / "found_chitesh.png"
    if digits_crop_path.exists():
        im_dig = Image.open(digits_crop_path)
        # '25323015' is in the right half of found_chitesh.png (w ~ 550)
        # 2: x ~ 300-335
        # 5: x ~ 335-365
        # 3: x ~ 365-395
        # 0: x ~ 430-465
        dig_coords = {
            '2': (300, 15, 335, 60),
            '5': (335, 15, 365, 60),
            '3': (365, 15, 395, 60),
            '0': (430, 15, 465, 60)
        }
        for d_ch, (x1, y1, x2, y2) in dig_coords.items():
            crop = im_dig.crop((x1, y1, x2, y2))
            svg_d, size = binarize_and_potrace(crop, threshold=160)
            if svg_d:
                glyph, adv, lsb = convert_svg_to_tt_glyph(svg_d, size, baseline_y_ratio=0.76)
                glyph_name = cmap.get(ord(d_ch))
                if glyph_name:
                    font['glyf'][glyph_name] = glyph
                    font['hmtx'][glyph_name] = (adv, lsb)
                    print(f"  [+] Injected authentic handwritten digit: '{d_ch}'")

    # Update font name records in 'name' table
    # NameID 1: Font Family, NameID 4: Full Name, NameID 6: PostScript Name
    for record in font['name'].names:
        if record.nameID == 1:
            record.string = "Chitesh Handwriting".encode('utf-16be' if record.platformID == 3 else 'latin1')
        elif record.nameID == 4:
            record.string = "Chitesh Handwriting Regular".encode('utf-16be' if record.platformID == 3 else 'latin1')
        elif record.nameID == 6:
            record.string = "ChiteshHandwriting-Regular".encode('utf-16be' if record.platformID == 3 else 'latin1')

    OUTPUT_FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUTPUT_FONT_PATH))
    print(f"\n[SUCCESS] Custom TrueType font saved directly to: {OUTPUT_FONT_PATH}")
    print(f"  File size: {OUTPUT_FONT_PATH.stat().st_size / 1024:.1f} KB")

def build_font_from_sheet(sheet_path):
    """
    Slices the 104 cells from a scanned handwriting_font_sheet.png/pdf,
    vectorizes each letter, and compiles ChiteshHandwriting.ttf.
    """
    print(f"Processing handwriting font capture sheet: {sheet_path}")
    sheet = Image.open(sheet_path).convert("RGB")
    w, h = sheet.size
    
    font = TTFont(str(BASE_FONT_PATH))
    cmap = font.getBestCmap()
    
    rows_data = [
        ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
        ["N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
        ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"],
        ["n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
        ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "="],
        ["(", ")", "[", "]", "{", "}", "/", "<", ">", ",", ".", ":", ";"],
        ["!", "?", "@", "%", "*", "^", "_", "~", "$", "#", "&", "|", "\\"],
        ["∂", "∫", "∑", "∞", "Δ", "∇", "≈", "≠", "≤", "≥", "⇒", "∴", "α"]
    ]
    
    grid_top = int(h * (280.0 / 3508.0))
    grid_bottom = int(h * (3368.0 / 3508.0))
    grid_left = int(w * (120.0 / 2480.0))
    grid_right = int(w * (2360.0 / 2480.0))
    
    num_rows = len(rows_data)
    num_cols = 13
    
    cell_w = (grid_right - grid_left) / float(num_cols)
    cell_h = (grid_bottom - grid_top) / float(num_rows)
    
    extracted_count = 0
    for r_idx, row in enumerate(rows_data):
        for c_idx, char in enumerate(row):
            x1 = int(grid_left + c_idx * cell_w)
            y1 = int(grid_top + r_idx * cell_h)
            x2 = int(x1 + cell_w)
            y2 = int(y1 + cell_h)
            
            # Crop inner cell (avoiding borders and corner label)
            cell_crop = sheet.crop((x1 + 6, y1 + 24, x2 - 6, y2 - 6))
            
            # Filter out faint blue baseline guidelines:
            # Blue lines have higher B than R/G
            cell_arr = np.array(cell_crop)
            r, g, b = cell_arr[:, :, 0], cell_arr[:, :, 1], cell_arr[:, :, 2]
            is_blue_guide = (b.astype(int) - r.astype(int) > 30) & (b > 140)
            gray = cell_crop.convert('L')
            gray_arr = np.array(gray)
            gray_arr[is_blue_guide] = 255 # clear blue guidelines
            
            clean_crop = Image.fromarray(gray_arr)
            svg_d, size = binarize_and_potrace(clean_crop, threshold=175)
            if svg_d:
                glyph, adv, lsb = convert_svg_to_tt_glyph(svg_d, size, baseline_y_ratio=0.74)
                glyph_name = cmap.get(ord(char))
                if glyph_name:
                    font['glyf'][glyph_name] = glyph
                    font['hmtx'][glyph_name] = (adv, lsb)
                    extracted_count += 1
                    
    print(f"Extracted {extracted_count} vector glyphs from template sheet.")
    OUTPUT_FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUTPUT_FONT_PATH))
    print(f"[SUCCESS] Updated custom font: {OUTPUT_FONT_PATH}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ScriptaMath Custom Handwriting Font Builder")
    parser.add_argument("--sheet", help="Path to scanned handwriting_font_sheet image/pdf")
    args = parser.parse_args()
    
    if args.sheet:
        build_font_from_sheet(args.sheet)
    else:
        build_font_from_notes()
