"""Genera todas las imágenes de marca de Manny (tema «estudio nocturno» de src/app/globals.css).

El símbolo es una «M» en Instrument Serif cursiva (la fuente de los titulares) rellena con el
degradado de la marca (cian → menta → amarillo de subtítulo, el mismo `--brand` de la CSS) sobre
una pieza de grafito, con el punto cian «en directo» del eyebrow de la portada haciendo de punto final.

Salidas (rutas relativas a la raíz del proyecto):
  public/brand/manny-mark.png   128x128   logo del menú (<Logo/>) y logo de Upload-Post
  public/brand/manny-full.png   883x887   símbolo + nombre (marca completa)
  src/app/icon.png              512x512   favicon (convención de Next)
  src/app/apple-icon.png        180x180   icono de iOS (convención de Next)
  src/app/opengraph-image.png  1200x630   tarjeta al compartir (convención de Next)
  docs/assets/app-icon-1024.png 1024x1024 icono para los paneles de desarrollador (TikTok, Meta, Google)

Uso: python scripts/make-brand.py   (requiere Pillow y numpy; las fuentes OFL están en scripts/fonts)
Es determinista: el grano usa una semilla fija, así que dos ejecuciones dan los mismos píxeles.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(__file__).resolve().parent / "fonts"
SERIF = FONTS / "InstrumentSerif-Regular.ttf"
SERIF_I = FONTS / "InstrumentSerif-Italic.ttf"
SANS = FONTS / "Geist-Regular.ttf"
MONO = FONTS / "GeistMono-Regular.ttf"

# Tokens de globals.css
BG = (11, 13, 14)  # --bg
BG2 = (15, 18, 19)  # --bg-2
SURFACE = (19, 22, 24)  # --surface
SURFACE2 = (26, 30, 32)  # --surface-2
BORDER = (34, 40, 43)  # --border
BORDER_STRONG = (53, 61, 65)  # --border-strong
TEXT = (233, 237, 238)  # --text
MUTED = (142, 154, 159)  # --muted
FAINT = (93, 104, 109)  # --faint
ACCENT = (94, 233, 255)  # --accent
BRAND = [(0.0, (94, 233, 255)), (0.5, (142, 240, 198)), (1.0, (255, 225, 77))]  # --brand

SS = 4  # supermuestreo: se dibuja a 4x y se reduce con LANCZOS


def linear_gradient(w, h, angle_deg, stops):
    """Degradado lineal con la semántica de CSS `linear-gradient(<angle>, ...)`."""
    a = np.deg2rad(angle_deg)
    dx, dy = np.sin(a), -np.cos(a)
    length = abs(w * dx) + abs(h * dy)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    t = ((xs - w / 2) * dx + (ys - h / 2) * dy) / length + 0.5
    t = np.clip(t, 0, 1)
    pos = np.array([s[0] for s in stops], dtype=np.float32)
    out = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        out[..., c] = np.interp(t, pos, np.array([s[1][c] for s in stops], dtype=np.float32))
    return Image.fromarray(out.round().astype(np.uint8), "RGB")


def radial_glow(w, h, cx, cy, rx, ry, color, alpha):
    """Mancha de luz elíptica como los `radial-gradient(... transparent 60%)` del body."""
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2)
    a = np.clip(1 - d / 0.6, 0, 1) ** 1.6 * alpha
    layer = np.zeros((h, w, 4), dtype=np.float32)
    layer[..., :3] = color
    layer[..., 3] = a * 255
    return Image.fromarray(layer.round().astype(np.uint8), "RGBA")


def grain(img, amount=0.04, seed=7):
    """El grano de película de `.grain` (4 %), con semilla fija para que el resultado sea reproducible."""
    rng = np.random.default_rng(seed)
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    noise = rng.normal(0, 255 * amount, arr.shape[:2])[..., None]
    return Image.fromarray(np.clip(arr + noise, 0, 255).round().astype(np.uint8), "RGB")


def gradient_text(canvas, xy, text, font, angle=100, anchor="ls"):
    """Pinta `text` con el degradado de la marca (equivale a la utilidad `brand-text`)."""
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=font, fill=255, anchor=anchor)
    box = mask.getbbox()
    if not box:
        return box
    w, h = box[2] - box[0], box[3] - box[1]
    grad = linear_gradient(w, h, angle, BRAND)
    canvas.paste(grad, box[:2], mask.crop(box))
    return box


def live_dot(canvas, cx, cy, r):
    """El punto cian con halo del eyebrow (`shadow-[0_0_8px_var(--accent)]`)."""
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((cx - r * 2.2, cy - r * 2.2, cx + r * 2.2, cy + r * 2.2), fill=ACCENT + (110,))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 1.1))
    canvas.alpha_composite(glow) if canvas.mode == "RGBA" else canvas.paste(glow, (0, 0), glow)
    ImageDraw.Draw(canvas).ellipse((cx - r, cy - r, cx + r, cy + r), fill=ACCENT)


def symbol(size, rounded=False):
    """El símbolo de Manny a `size` px. `rounded` lo recorta como pieza con esquinas y filo (para composiciones);
    sin él sale a sangre, porque cada sistema (favicon, iOS, paneles) aplica su propia máscara."""
    S = size * SS
    tile = linear_gradient(S, S, 180, [(0.0, SURFACE2), (1.0, BG2)]).convert("RGBA")
    tile.alpha_composite(radial_glow(S, S, S * 0.12, -S * 0.1, S * 1.2, S * 1.0, ACCENT, 0.10))
    tile.alpha_composite(radial_glow(S, S, S * 0.95, S * 1.1, S * 1.1, S * 0.9, (255, 225, 77), 0.07))

    # «M» cursiva: altura de caja ~60 % del lado, centrada por la tinta (la cursiva se desplaza al medir por caja)
    font = ImageFont.truetype(str(SERIF_I), int(S * 0.86))
    bx0, by0, bx1, by1 = font.getbbox("M", anchor="ls")  # caja de tinta relativa al punto de anclaje
    gw, gh = bx1 - bx0, by1 - by0
    dot_r = S * 0.05
    gap = S * 0.02
    total_w = gw + gap + dot_r * 2
    ink_x = (S - total_w) / 2
    ink_y = (S - gh) / 2
    ax, baseline = ink_x - bx0, ink_y - by0
    gradient_text(tile, (ax, baseline), "M", font)
    # el punto final «en directo», apoyado en la línea base
    live_dot(tile, ink_x + gw + gap + dot_r, baseline - dot_r, dot_r)

    if rounded:
        radius = int(S * 0.24)
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius, fill=255)
        edge = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(edge).rounded_rectangle((0, 0, S - 1, S - 1), radius, outline=BORDER_STRONG + (255,), width=max(SS, S // 160))
        tile.alpha_composite(edge)
        # filo de luz arriba, como el `inset 0 1px 0 rgb(255 255 255 / .03)` de las tarjetas
        hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(hl).rounded_rectangle((0, 0, S - 1, S - 1), radius, outline=(255, 255, 255, 40), width=max(SS, S // 160))
        fade = np.clip(1 - np.linspace(0, 1, S) / 0.35, 0, 1)[:, None]
        hl.putalpha(Image.fromarray((np.asarray(hl.getchannel("A"), dtype=np.float32) * fade).astype(np.uint8)))
        tile.alpha_composite(hl)
        tile.putalpha(m)
    out = tile.resize((size, size), Image.LANCZOS)
    return out


def flat(img, bg=BG):
    base = Image.new("RGB", img.size, bg)
    base.paste(img, (0, 0), img if img.mode == "RGBA" else None)
    return base


def save(img, rel):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"{rel}  {img.size[0]}x{img.size[1]}")


def full_logo():
    """Marca completa 883x887: símbolo + «Manny» en serif, como la marca anterior pero en el mundo de la app."""
    W, H = 883, 887
    S = SS
    can = Image.new("RGBA", (W * S, H * S), BG + (255,))
    can.alpha_composite(radial_glow(W * S, H * S, W * S * 0.15, -H * S * 0.1, W * S * 1.3, H * S * 1.0, ACCENT, 0.06))
    can.alpha_composite(radial_glow(W * S, H * S, W * S * 0.95, H * S * 1.1, W * S, H * S * 0.9, (255, 225, 77), 0.04))
    mark = symbol(400, rounded=True).resize((400 * S, 400 * S), Image.LANCZOS)
    can.alpha_composite(mark, ((W * S - 400 * S) // 2, 150 * S))
    font = ImageFont.truetype(str(SERIF), 168 * S)
    d = ImageDraw.Draw(can)
    d.text((W * S // 2, 735 * S), "Manny", font=font, fill=TEXT, anchor="ms")
    can = can.resize((W, H), Image.LANCZOS)
    return grain(can, 0.012, seed=3)


def og_image():
    """Tarjeta OpenGraph 1200x630: la portada de la app en una imagen (eyebrow, titular y marca)."""
    W, H = 1200, 630
    S = SS
    can = Image.new("RGBA", (W * S, H * S), BG + (255,))
    can.alpha_composite(radial_glow(W * S, H * S, W * S * 0.12, -H * S * 0.1, 1200 * S, 600 * S, ACCENT, 0.10))
    can.alpha_composite(radial_glow(W * S, H * S, W * S * 1.0, 0, 900 * S, 500 * S, TEXT, 0.05))
    can.alpha_composite(radial_glow(W * S, H * S, W * S * 0.95, H * S * 1.1, 900 * S, 600 * S, (255, 225, 77), 0.07))
    d = ImageDraw.Draw(can)
    L = 88 * S  # margen izquierdo

    # Cabecera: símbolo + nombre, como el <Logo/> del menú
    mark = symbol(60, rounded=True).resize((60 * S, 60 * S), Image.LANCZOS)
    can.alpha_composite(mark, (L, 72 * S))
    d.text((L + 76 * S, 102 * S), "Manny", font=ImageFont.truetype(str(SERIF), 40 * S), fill=TEXT, anchor="lm")

    # Eyebrow en píldora con el punto en directo
    mono = ImageFont.truetype(str(MONO), 15 * S)
    label = "TU MÁNAGER DE REDES"
    tracking = 2.6 * S
    lw = sum(mono.getlength(ch) + tracking for ch in label) - tracking
    py, ph = 214 * S, 38 * S
    pill = (L, py, L + 46 * S + lw + 18 * S, py + ph)
    d.rounded_rectangle(pill, ph // 2, fill=SURFACE + (255,), outline=BORDER + (255,), width=S)
    live_dot(can, L + 22 * S, py + ph / 2, 3.5 * S)
    d = ImageDraw.Draw(can)
    x = L + 38 * S
    for ch in label:
        d.text((x, py + ph / 2), ch, font=mono, fill=MUTED, anchor="lm")
        x += mono.getlength(ch) + tracking

    # Titular de la portada: serif recto + cursiva con el degradado
    serif = ImageFont.truetype(str(SERIF), 92 * S)
    serif_i = ImageFont.truetype(str(SERIF_I), 92 * S)
    d.text((L - 4 * S, 366 * S), "Súbelo una vez.", font=serif, fill=TEXT, anchor="ls")
    gradient_text(can, (L - 2 * S, 458 * S), "Que salga en todas.", serif_i)

    # Pie: redes en mono, en el tono tenue de las etiquetas
    foot = ImageFont.truetype(str(MONO), 14 * S)
    d = ImageDraw.Draw(can)
    d.line((L, 530 * S, W * S - L, 530 * S), fill=BORDER + (255,), width=S)
    x = L
    for i, word in enumerate(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X"]):
        if i:
            d.text((x, 566 * S), "·", font=foot, fill=FAINT, anchor="lm")
            x += 26 * S
        for ch in word:
            d.text((x, 566 * S), ch, font=foot, fill=FAINT, anchor="lm")
            x += foot.getlength(ch) + 2.2 * S
        x += 14 * S
    sans = ImageFont.truetype(str(SANS), 18 * S)
    d.text((W * S - L, 566 * S), "Ideas, guiones, publicación y métricas", font=sans, fill=MUTED, anchor="rm")

    can = can.resize((W, H), Image.LANCZOS)
    return grain(can, 0.018, seed=11)


def main():
    save(flat(symbol(128)), "public/brand/manny-mark.png")
    save(full_logo(), "public/brand/manny-full.png")
    save(flat(symbol(512)), "src/app/icon.png")
    save(flat(symbol(180)), "src/app/apple-icon.png")
    save(flat(symbol(1024)), "docs/assets/app-icon-1024.png")
    save(og_image(), "src/app/opengraph-image.png")


if __name__ == "__main__":
    main()
