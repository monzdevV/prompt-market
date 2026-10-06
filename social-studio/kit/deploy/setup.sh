#!/usr/bin/env bash
# Prepara un servidor Ubuntu 24.04 recién creado para easypop (se ejecuta UNA vez, como root).
#
#   scp deploy/setup.sh root@IP:/root/ && ssh root@IP "DOMAIN=easypop.app EMAIL=tu@correo bash /root/setup.sh"
#
# Deja:
#   /opt/easypop/app         → el código (lo pone deploy.sh en cada despliegue; enlace a releases/<versión>)
#   /opt/easypop/data        → base de datos, vídeos, portadas y copias (persistente)
#   /opt/easypop/.env.local  → la configuración (secretos); se enlaza dentro de cada versión
#   /opt/easypop/venv        → Python con faster-whisper (transcripción) y Pillow (vertical)
#   Caddy delante con HTTPS automático, la app solo escucha en 127.0.0.1:3000
set -euo pipefail

: "${DOMAIN:?Falta DOMAIN (p. ej. DOMAIN=easypop.app)}"
: "${EMAIL:?Falta EMAIL (avisos del certificado HTTPS)}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get install -y curl ca-certificates gnupg ufw unattended-upgrades python3-venv python3-pip debian-keyring debian-archive-keyring apt-transport-https

# Actualizaciones de seguridad automáticas
dpkg-reconfigure -f noninteractive unattended-upgrades

# Cortafuegos: solo SSH y web
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# SSH: solo con clave (Hetzner la pone al crear el servidor). No se toca si no hay ninguna clave, para no dejarte fuera.
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl reload ssh || true
fi

# Memoria de intercambio: la compilación de Next.js y Whisper la agradecen en servidores de 4 GB
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node.js 24 (la app usa node:sqlite)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

# Caddy (HTTPS automático con Let's Encrypt)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# Usuario sin privilegios que ejecuta la app
id easypop >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/easypop --shell /usr/sbin/nologin easypop
mkdir -p /opt/easypop/{data,releases}
touch /opt/easypop/.env.local
chmod 600 /opt/easypop/.env.local

# Python para la transcripción y la conversión a vertical
if [ ! -x /opt/easypop/venv/bin/python ]; then
  python3 -m venv /opt/easypop/venv
fi
/opt/easypop/venv/bin/pip install --upgrade pip
/opt/easypop/venv/bin/pip install faster-whisper pillow

chown -R easypop:easypop /opt/easypop

# Servicio de la app
cat > /etc/systemd/system/easypop.service <<'UNIT'
[Unit]
Description=easypop
After=network-online.target
Wants=network-online.target

[Service]
User=easypop
Group=easypop
WorkingDirectory=/opt/easypop/app
Environment=NODE_ENV=production
Environment=DATA_DIR=/opt/easypop/data
Environment=PYTHON_BIN=/opt/easypop/venv/bin/python
Environment=HF_HOME=/opt/easypop/data/hf-cache
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
# Apagado ordenado: deja terminar lo que se esté publicando
KillSignal=SIGTERM
TimeoutStopSec=30
# Endurecimiento
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/easypop/data /opt/easypop/releases

[Install]
WantedBy=multi-user.target
UNIT

# Caddy: HTTPS y proxy hacia la app. www redirige al dominio principal.
cat > /etc/caddy/Caddyfile <<CADDY
{
	email ${EMAIL}
}

www.${DOMAIN} {
	redir https://${DOMAIN}{uri} permanent
}

${DOMAIN} {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY

systemctl daemon-reload
systemctl enable easypop
systemctl reload caddy || systemctl restart caddy

echo
echo "Servidor listo. Siguiente paso: subir la configuración (.env.local) y desplegar con deploy/deploy.sh"
