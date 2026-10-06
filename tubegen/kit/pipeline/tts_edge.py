"""Voz gratis con edge-tts + tiempos por palabra.

Uso: python tts_edge.py <entrada.json>
entrada: {"voice": "...", "rate": "+0%", "items": [{"text": "...", "out": "ruta.mp3"}]}
Escribe junto a cada mp3 un .words.json con [{text, start, end}] en segundos.
"""
import asyncio
import json
import sys

import edge_tts

TICKS = 10_000_000  # edge-tts da offsets en unidades de 100 ns


async def one(item, voice, rate, sem):
    async with sem:
        for attempt in range(4):
            try:
                com = edge_tts.Communicate(item["text"], voice, rate=rate, boundary="WordBoundary")
                audio = bytearray()
                words = []
                async for chunk in com.stream():
                    if chunk["type"] == "audio":
                        audio.extend(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = chunk["offset"] / TICKS
                        words.append({"text": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / TICKS, 3)})
                if not audio:
                    raise RuntimeError("sin audio")
                with open(item["out"], "wb") as f:
                    f.write(audio)
                with open(item["out"].rsplit(".", 1)[0] + ".words.json", "w", encoding="utf-8") as f:
                    json.dump(words, f, ensure_ascii=False)
                print(f"ok {item['out']}", flush=True)
                return
            except Exception as e:  # noqa: BLE001 — el servicio falla a ratos, se reintenta
                print(f"reintento {attempt + 1} {item['out']}: {e}", file=sys.stderr, flush=True)
                await asyncio.sleep(2 * (attempt + 1))
        raise RuntimeError(f"No se pudo generar {item['out']}")


async def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(one(it, spec["voice"], spec.get("rate", "+0%"), sem) for it in spec["items"]))


asyncio.run(main())
