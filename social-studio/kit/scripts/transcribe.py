"""Servidor de transcripción local con faster-whisper (gratis, el vídeo no sale del ordenador).

Carga el modelo UNA vez y atiende peticiones por stdin/stdout, una por línea en JSON:
  entrada: {"id": "...", "path": "/ruta/video.mp4", "language": null}
  salida:  {"id": "...", "ok": true, "text": "...", "language": "es", "duration": 42.1}
           {"id": "...", "ok": false, "error": "..."}
Los mensajes de diagnóstico van a stderr. Uso: python scripts/transcribe.py [modelo]
"""
import json
import sys


def emit(obj):
    # ensure_ascii evita problemas de codificación de la consola en Windows
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def main():
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.stderr.write("faster-whisper no está instalado: ejecuta  pip install faster-whisper\n")
        sys.exit(3)

    model_name = sys.argv[1] if len(sys.argv) > 1 else "small"
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    emit({"ready": True, "model": model_name})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            segments, info = model.transcribe(req["path"], vad_filter=True, language=req.get("language") or None)
            text = " ".join(s.text.strip() for s in segments).strip()
            emit({"id": req_id, "ok": True, "text": text, "language": info.language, "duration": info.duration})
        except Exception as e:  # noqa: BLE001 - cualquier fallo se devuelve al proceso de Node
            emit({"id": req_id, "ok": False, "error": f"{type(e).__name__}: {e}"})


if __name__ == "__main__":
    main()
