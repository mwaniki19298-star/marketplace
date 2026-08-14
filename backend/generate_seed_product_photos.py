"""Generate seed-only product images locally; no network or Cloudinary calls."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import random, math

OUT = Path(__file__).resolve().parent / "seed_assets" / "products"
OUT.mkdir(parents=True, exist_ok=True)

PRODUCTS = [
    "Samsung Galaxy A55", "iPhone 14", "HP Pavilion Laptop", "Sony Wireless Headphones",
    "Canon EOS Camera", "Classic Wrist Watch", "Running Sneakers", "Premium Sunglasses",
    "Cotton T-Shirt", "Slim Fit Jeans",
]
BACKGROUNDS = [(244,246,249),(235,241,238),(246,239,232),(238,235,246),(242,242,235),(232,240,246)]

def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_product(draw, name, variant, W=900, H=700):
    cx, cy = W//2, 365
    shift = [-45,-20,0,20,45,10][variant]
    angle = [-8,-4,0,4,8,0][variant]
    # ground shadow
    shadow = Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(shadow)
    sd.ellipse((230+shift,560,670+shift,640), fill=(0,0,0,65))
    shadow=shadow.filter(ImageFilter.GaussianBlur(24))
    draw._image.alpha_composite(shadow)

    if name == "Samsung Galaxy A55" or name == "iPhone 14":
        x0,x1=330+shift,570+shift; y0,y1=120,560
        rounded(draw,(x0,y0,x1,y1),42,fill=(25,27,31),outline=(75,78,82),width=4)
        rounded(draw,(x0+16,y0+18,x1-16,y1-18),32,fill=(30,80,120) if "Samsung" in name else (92,45,62))
        draw.ellipse((x0+88,y0+45,x0+152,y0+109),fill=(10,10,12))
        draw.ellipse((x0+98,y0+55,x0+142,y0+99),fill=(55,55,60))
        draw.ellipse((x0+50,y0+175,x0+100,y0+225),fill=(240,240,245))
        draw.ellipse((x0+140,y0+175,x0+190,y0+225),fill=(240,240,245))
        draw.rounded_rectangle((x0+95,y1-10,x0+145,y1-2),radius=4,fill=(150,150,150))
    elif name == "HP Pavilion Laptop":
        rounded(draw,(210+shift,150,690+shift,485),24,fill=(45,48,52),outline=(100,104,110),width=5)
        rounded(draw,(230+shift,170,670+shift,465),14,fill=(55,105,145))
        draw.polygon([(155+shift,490),(745+shift,490),(810+shift,565),(90+shift,565)],fill=(115,120,126))
        draw.line((250+shift,510,650+shift,510),fill=(190,195,200),width=3)
    elif name == "Sony Wireless Headphones":
        draw.arc((270+shift,130,630+shift,510),180,360,fill=(25,25,28),width=34)
        rounded(draw,(235+shift,300,340+shift,505),48,fill=(30,32,35))
        rounded(draw,(560+shift,300,665+shift,505),48,fill=(30,32,35))
        draw.arc((300+shift,145,600+shift,445),180,360,fill=(75,78,82),width=18)
    elif name == "Canon EOS Camera":
        rounded(draw,(220+shift,245,680+shift,500),28,fill=(42,44,48),outline=(95,98,104),width=5)
        rounded(draw,(285+shift,190,430+shift,260),15,fill=(50,52,56))
        draw.ellipse((330+shift,285,570+shift,525),fill=(20,22,25),outline=(110,115,120),width=8)
        draw.ellipse((370+shift,325,530+shift,485),fill=(65,75,90),outline=(145,150,155),width=5)
        draw.ellipse((390+shift,345,510+shift,465),fill=(12,20,30))
        draw.rectangle((570+shift,265,630+shift,295),fill=(160,30,30))
    elif name == "Classic Wrist Watch":
        draw.rounded_rectangle((395+shift,70,505+shift,600),radius=45,fill=(75,45,30))
        draw.ellipse((285+shift,180,615+shift,510),fill=(45,47,50),outline=(170,170,175),width=10)
        draw.ellipse((320+shift,215,580+shift,475),fill=(235,235,228))
        for a in range(0,360,30):
            r=105; x=cx+shift+int(math.sin(math.radians(a))*r); y=345-int(math.cos(math.radians(a))*r)
            draw.ellipse((x-4,y-4,x+4,y+4),fill=(30,30,30))
        draw.line((450+shift,345,450+shift,265),fill=(30,30,30),width=8)
        draw.line((450+shift,345,510+shift,380),fill=(30,30,30),width=7)
    elif name == "Running Sneakers":
        # Two sneakers
        for off, col in [(-95,(50,85,145)),(70,(35,125,100))]:
            draw.polygon([(250+shift+off,470),(360+shift+off,310),(500+shift+off,355),(620+shift+off,465),(610+shift+off,525),(280+shift+off,525)],fill=col)
            draw.polygon([(285+shift+off,480),(610+shift+off,480),(650+shift+off,540),(255+shift+off,540)],fill=(245,245,242))
            for k in range(4): draw.line((375+shift+off+k*28,360,420+shift+off+k*28,405),fill=(235,235,235),width=6)
    elif name == "Premium Sunglasses":
        draw.ellipse((190+shift,275,410+shift,475),outline=(30,30,30),width=20,fill=(45,55,65))
        draw.ellipse((490+shift,275,710+shift,475),outline=(30,30,30),width=20,fill=(45,55,65))
        draw.line((400+shift,330,500+shift,330),fill=(30,30,30),width=18)
        draw.line((190+shift,315,115+shift,260),fill=(30,30,30),width=15)
        draw.line((710+shift,315,785+shift,260),fill=(30,30,30),width=15)
    elif name == "Cotton T-Shirt":
        draw.polygon([(320+shift,170),(390+shift,125),(450+shift,185),(510+shift,125),(580+shift,170),(655+shift,300),(565+shift,340),(535+shift,560),(365+shift,560),(335+shift,340),(245+shift,300)],fill=(65,105,155))
        draw.line((390+shift,150,450+shift,220),fill=(220,225,230),width=6)
        draw.line((510+shift,150,450+shift,220),fill=(220,225,230),width=6)
    elif name == "Slim Fit Jeans":
        draw.polygon([(325+shift,150),(450+shift,150),(575+shift,150),(545+shift,370),(520+shift,600),(450+shift,600),(425+shift,390),(400+shift,600),(330+shift,600),(355+shift,370)],fill=(45,75,125),outline=(25,45,80))
        draw.line((450+shift,170,450+shift,390),fill=(110,135,175),width=4)
        draw.line((350+shift,300,545+shift,300),fill=(35,60,105),width=4)


def make(name, variant):
    bg=BACKGROUNDS[variant]
    img=Image.new('RGBA',(900,700),bg+(255,))
    d=ImageDraw.Draw(img)
    draw_product(d,name,variant)
    # subtle studio highlight
    d.ellipse((80,70,350,250),fill=(255,255,255,35))
    path=OUT / f"{name.lower().replace(' ','_')}_{variant+1}.jpg"
    img.convert('RGB').save(path,quality=82,optimize=True)

for product in PRODUCTS:
    for v in range(6):
        make(product,v)
print(f"Generated {len(PRODUCTS)*6} seed product photos in {OUT}")
