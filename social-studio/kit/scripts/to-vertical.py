"""Convierte un vídeo a vertical 9:16 (1080x1920) para Shorts, Reels e historias.

El vídeo original va centrado a lo ancho; detrás, el mismo vídeo ampliado, desenfocado y oscurecido
rellena el resto (lo que hacen las apps de edición). El audio se conserva (se recodifica a AAC).

Usa PyAV (el mismo que usa faster-whisper), así que no hace falta instalar ffmpeg aparte.

Uso: python scripts/to-vertical.py ORIGEN DESTINO
Salida (una línea JSON): {"ok": true, "width": 1080, "height": 1920, "duration": 12.3}
                     o:  {"ok": false, "error": "..."}
"""
import json
import sys
from fractions import Fraction

import av
from PIL import Image, ImageEnhance, ImageFilter

W, H = 1080, 1920
MAX_FPS = 30


def compose(frame_img: Image.Image) -> Image.Image:
    src_w, src_h = frame_img.size
    # Fondo: recorte 9:16 del centro, reducido a miniatura y vuelto a ampliar = desenfoque barato; y oscurecido
    crop_w = min(src_w, src_h * W / H)
    crop_h = min(src_h, src_w * H / W)
    left, top = (src_w - crop_w) / 2, (src_h - crop_h) / 2
    bg = frame_img.resize((W // 16, H // 16), Image.BILINEAR, box=(left, top, left + crop_w, top + crop_h))
    bg = bg.filter(ImageFilter.GaussianBlur(2)).resize((W, H), Image.BICUBIC)
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    # Delante: el vídeo entero, ajustado al ancho (o al alto si ya era muy alto)
    fit = min(W / src_w, H / src_h)
    fg = frame_img.resize((max(2, int(src_w * fit) // 2 * 2), max(2, int(src_h * fit) // 2 * 2)), Image.BICUBIC)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return bg


def main(src: str, dst: str) -> dict:
    inp = av.open(src)
    vin = inp.streams.video[0]
    ain = inp.streams.audio[0] if inp.streams.audio else None

    rate = vin.average_rate or Fraction(30)
    if rate > MAX_FPS:
        rate = Fraction(MAX_FPS)
    rate = Fraction(rate).limit_denominator(1001)

    out = av.open(dst, "w", format="mp4", options={"movflags": "+faststart"})
    vout = out.add_stream("libx264", rate=rate)
    vout.width, vout.height, vout.pix_fmt = W, H, "yuv420p"
    vout.options = {"crf": "21", "preset": "veryfast"}
    aout = resampler = None
    if ain is not None:
        aout = out.add_stream("aac", rate=48000)
        aout.layout = "stereo"
        resampler = av.AudioResampler(format="fltp", layout="stereo", rate=48000)

    streams = [vin] + ([ain] if ain is not None else [])
    last_pts = None
    frame_index = 0
    for packet in inp.demux(*streams):
        for frame in packet.decode():
            if packet.stream.type == "video":
                t = float(frame.time) if frame.time is not None else frame_index / float(rate)
                # Limitar fps: saltar fotogramas que caen antes del siguiente instante de salida
                slot = int(t * float(rate))
                if last_pts is not None and slot <= last_pts:
                    continue
                last_pts = slot
                img = compose(frame.to_image())
                vf = av.VideoFrame.from_image(img).reformat(format="yuv420p")
                vf.pts = slot
                vf.time_base = 1 / rate
                for p in vout.encode(vf):
                    out.mux(p)
                frame_index += 1
            elif aout is not None:
                for rf in resampler.resample(frame):
                    for p in aout.encode(rf):
                        out.mux(p)
    for p in vout.encode():
        out.mux(p)
    if aout is not None:
        for rf in resampler.resample(None):
            for p in aout.encode(rf):
                out.mux(p)
        for p in aout.encode():
            out.mux(p)
    duration = float(inp.duration / av.time_base) if inp.duration else None
    out.close()
    inp.close()
    return {"ok": True, "width": W, "height": H, "duration": duration}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"ok": False, "error": "uso: to-vertical.py ORIGEN DESTINO"}))
        sys.exit(2)
    try:
        print(json.dumps(main(sys.argv[1], sys.argv[2])))
    except Exception as e:  # noqa: BLE001 — el error vuelve a Node como JSON, sin rutas internas
        print(json.dumps({"ok": False, "error": type(e).__name__ + ": " + str(e)[:300]}))
        sys.exit(1)
