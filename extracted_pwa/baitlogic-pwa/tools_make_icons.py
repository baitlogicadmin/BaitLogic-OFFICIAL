from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('/home/user/baitlogic-pwa')
icons = root / 'icons'
icons.mkdir(exist_ok=True)

def make_icon(size: int, filename: str):
    img = Image.new('RGB', (size, size), '#08100a')
    draw = ImageDraw.Draw(img)
    green = '#68f575'
    red = '#d95f34'
    draw.rounded_rectangle((size*0.08, size*0.08, size*0.92, size*0.92), radius=int(size*0.18), outline='#1a2b1d', width=max(4, size//64))
    dot = int(size * 0.09)
    draw.ellipse((size*0.16, size*0.22, size*0.16 + dot, size*0.22 + dot), fill=red)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size*0.42))
        font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size*0.09))
    except Exception:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()
    draw.text((size*0.28, size*0.19), 'B', font=font, fill=green)
    draw.text((size*0.18, size*0.74), 'BAITLOGIC', font=font_small, fill='#d5f2d8')
    img.save(icons / filename)

make_icon(192, 'icon-192.png')
make_icon(512, 'icon-512.png')
