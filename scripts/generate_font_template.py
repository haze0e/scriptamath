#!/usr/bin/env python3
"""
Generates an A4 Handwriting Font Capture Sheet (PNG and PDF).
Fill this sheet with your handwriting to create a 100% custom TTF font.
"""

import os
from PIL import Image, ImageDraw, ImageFont

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def generate_template(output_path=None):
    if output_path is None:
        output_path = BASE_DIR / "public" / "templates" / "handwriting_font_sheet.png"
    else:
        output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # A4 at 300 DPI: 2480 x 3508 pixels
    width = 2480
    height = 3508
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    
    # Header
    # Try default or simple font
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", 48)
        sub_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans.ttf", 26)
        label_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans.ttf", 22)
    except:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
        
    draw.text((120, 90), "ScriptaMath — Custom Handwriting Font Sheet", fill="#1e293b", font=title_font)
    draw.text((120, 160), "Write naturally in each box. Stay within the cell and use the blue baseline for guidance.", fill="#64748b", font=sub_font)
    draw.text((120, 200), "Candidate Name / Signature: _______________________________   Date: ____________", fill="#64748b", font=sub_font)
    
    # 4 Corner Alignment Fiducial Markers (for auto-deskewing & detection)
    marker_size = 40
    margin = 80
    # Top-Left
    draw.rectangle([margin, margin, margin + marker_size, margin + marker_size], fill="black")
    # Top-Right
    draw.rectangle([width - margin - marker_size, margin, width - margin, margin + marker_size], fill="black")
    # Bottom-Left
    draw.rectangle([margin, height - margin - marker_size, margin + marker_size, height - margin], fill="black")
    # Bottom-Right
    draw.rectangle([width - margin - marker_size, height - margin - marker_size, width - margin, height - margin], fill="black")
    
    # Grid specification: 8 rows x 13 columns = 104 characters
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
    
    grid_top = 280
    grid_bottom = height - 140
    grid_left = 120
    grid_right = width - 120
    
    num_rows = len(rows_data)
    num_cols = 13
    
    cell_w = (grid_right - grid_left) / num_cols
    cell_h = (grid_bottom - grid_top) / num_rows
    
    for r_idx, row in enumerate(rows_data):
        for c_idx, char_label in enumerate(row):
            x1 = grid_left + c_idx * cell_w
            y1 = grid_top + r_idx * cell_h
            x2 = x1 + cell_w
            y2 = y1 + cell_h
            
            # Box border
            draw.rectangle([x1, y1, x2, y2], outline="#cbd5e1", width=2)
            
            # Corner cell label
            draw.text((x1 + 10, y1 + 8), char_label, fill="#94a3b8", font=label_font)
            
            # Baseline (approx 72% down cell height)
            baseline_y = y1 + cell_h * 0.74
            draw.line([(x1 + 8, baseline_y), (x2 - 8, baseline_y)], fill="#93c5fd", width=2)
            
            # Midline / x-height (approx 44% down cell height)
            midline_y = y1 + cell_h * 0.44
            for dot_x in range(int(x1 + 10), int(x2 - 10), 12):
                draw.line([(dot_x, midline_y), (dot_x + 5, midline_y)], fill="#e2e8f0", width=1)
                
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Template successfully generated at: {output_path}")

if __name__ == "__main__":
    generate_template()
