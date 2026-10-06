#!/usr/bin/env bash
# Despliega la versión confirmada en git (HEAD) al servidor. Se ejecuta desde tu PC (Git Bash):
#
#   SERVER=root@IP bash deploy/deploy.sh
#
# Solo sube lo que está en git: nunca .env.local, data/ ni cambios sin confirmar.
# Compila en una carpeta nueva y, si todo va bien, cambia el enlace y reinicia (unos segundos de corte).
# Si la compilación falla, la versión anterior sigue funcionando.
set -euo pipefail

: "${SERVER:?Falta SERVER (p. ej. SERVER=root@1.2.3.4)}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Hay cambios sin confirmar; se desplegará la última versión confirmada (HEAD)." >&2
fi

REV=$(git rev-parse --short HEAD)
STAMP=$(date +%Y%m%d-%H%M%S)
RELEASE="$STAMP-$REV"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

git archive --format=tar.gz -o "$TMP/app.tgz" HEAD
scp -q "$TMP/app.tgz" "$SERVER:/tmp/easypop-$RELEASE.tgz"

ssh "$SERVER" RELEASE="$RELEASE" bash -s <<'REMOTE'
set -euo pipefail
DIR=/opt/easypop/releases/$RELEASE
mkdir -p "$DIR"
tar -xzf "/tmp/easypop-$RELEASE.tgz" -C "$DIR"
rm -f "/tmp/easypop-$RELEASE.tgz"
ln -sfn /opt/easypop/.env.local "$DIR/.env.local"
chown -R easypop:easypop "$DIR"

cd "$DIR"
sudo -u easypop -H npm ci --no-audit --no-fund
sudo -u easypop -H npm run build

ln -sfn "$DIR" /opt/easypop/app
systemctl restart easypop

# Conserva las 3 últimas versiones
ls -1dt /opt/easypop/releases/*/ | tail -n +4 | xargs -r rm -rf

sleep 4
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo "Desplegado $RELEASE"
else
  echo "La app no responde en /api/health. Mira: journalctl -u easypop -n 80" >&2
  exit 1
fi
REMOTE
