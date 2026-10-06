# Operación en producción de Manny

> En el servidor, la carpeta `/opt/easypop`, el usuario `easypop` y el servicio `easypop` conservan el nombre técnico porque los crean `deploy/setup.sh` y `deploy/deploy.sh`; cambiarlos rompería instalaciones ya hechas.

## Servidor (Hetzner, Ubuntu 24.04): la forma recomendada

1. **Servidor:** en Hetzner Cloud crea un CX23 (2 vCPU, 4 GB) con Ubuntu 24.04, añade tu clave SSH y activa *Backups* (copia diaria de todo el servidor, +20 %).
2. **Dominio:** registros DNS `A` de `tudominio.com` y `www.tudominio.com` → IP del servidor (y `AAAA` → IPv6 si quieres).
3. **Preparar el servidor (una vez):**
   ```bash
   scp deploy/setup.sh root@IP:/root/
   ssh root@IP "DOMAIN=tudominio.com EMAIL=tu@correo bash /root/setup.sh"
   ```
4. **Configuración:** copia tu `.env.local` a `/opt/easypop/.env.local` (`chmod 600`, dueño `easypop`) cambiando:
   - `APP_URL=https://tudominio.com`
   - `TRUST_PROXY=forwarded` (Caddy fija `X-Forwarded-For` con la IP real y la app solo escucha en 127.0.0.1)
   - Mantén el mismo `TOKEN_ENC_KEY` si quieres conservar cuentas conectadas al migrar la base.
5. **Desplegar** (y cada vez que haya cambios, desde tu PC con Git Bash): `SERVER=root@IP bash deploy/deploy.sh`
6. **Migrar los datos del PC** (opcional): para el servicio, copia `data/studio.db` a `/opt/easypop/data/`, `chown easypop:easypop`, arranca.

Comandos útiles en el servidor: `systemctl status easypop`, `journalctl -u easypop -f`, `systemctl restart easypop`.
Las rutas `DATA_DIR=/opt/easypop/data` y `PYTHON_BIN=/opt/easypop/venv/bin/python` las fija el servicio.

---

# Alternativa: servidor Windows local + túnel de Cloudflare

## Arranque como servicio (se reinicia solo si se cae o reinicias el PC)

Recomendado: **NSSM** (Non-Sucking Service Manager).

```powershell
winget install NSSM.NSSM
nssm install manny "C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000"
nssm set manny AppDirectory C:\ruta\a\manny
nssm set manny AppEnvironmentExtra NODE_ENV=production
nssm set manny AppStdout C:\ruta\a\manny\logs\app.log
nssm set manny AppStderr C:\ruta\a\manny\logs\app.log
nssm set manny AppRotateFiles 1
nssm set manny AppRotateBytes 10485760
nssm set manny AppExit Default Restart
nssm set manny AppStopMethodConsole 20000
nssm start manny
```

- `-H 127.0.0.1`: la app solo escucha en local; todo el tráfico entra por el túnel (necesario para que `TRUST_PROXY=cloudflare` sea seguro).
- `AppStopMethodConsole 20000`: al parar el servicio, la app deja 20 s para terminar lo que esté publicando (apagado ordenado).
- Compila antes de instalar: `npm ci && npm run build`.

Túnel de Cloudflare como servicio: `cloudflared service install <TOKEN_DEL_TUNEL>` (el token lo da el panel de Cloudflare Zero Trust → Tunnels).

## Copias de seguridad

- La app hace una **copia diaria** de la base en `data/backups/studio-AAAA-MM-DD.db` (copia en caliente consistente) y conserva las últimas `BACKUP_KEEP` (14 por defecto).
- **Copia también fuera del PC** la carpeta `data/backups` (y `data/uploads` si quieres conservar los vídeos pendientes). Por ejemplo, una tarea programada diaria:
  ```powershell
  robocopy C:\ruta\a\manny\data\backups D:\manny-copias\backups /MIR
  ```
  o una carpeta sincronizada con OneDrive/Google Drive.
- **Guarda `.env.local` en un lugar seguro** (gestor de contraseñas): sin `TOKEN_ENC_KEY` los tokens guardados no se pueden descifrar.

### Restaurar
1. Para el servicio: `nssm stop manny`.
2. Copia la copia elegida sobre `data/studio.db` y borra `data/studio.db-wal` y `data/studio.db-shm` si existen.
3. `nssm start manny`.

## Espacio en disco

- Los vídeos ya publicados (o descartados) se borran del disco a los `UPLOAD_RETENTION_DAYS` días (30 por defecto). Se conserva su transcripción, su texto y sus métricas.
- `/api/health` devuelve 503 si quedan menos de 2 GB libres.

## Monitorización

- Apunta un monitor (UptimeRobot, Better Stack…) a `https://tu-dominio/api/health`. Devuelve 503 si la base no responde, si el ejecutor de trabajos lleva más de 1 minuto parado o si falta disco.
- Los logs son líneas JSON (`msg`, `jobId`, `accountId`…). Los tokens y contraseñas se ocultan automáticamente.
- En **Admin** ves trabajos con errores, publicaciones «por revisar», cuentas y planes.

## Publicaciones «Comprobar»

Una publicación queda en «Comprobar» cuando no sabemos si la red llegó a publicarla (por ejemplo, se cortó la conexión en el paso final). Nunca se reintenta sola para no duplicarla. La persona usuaria lo mira en la red y pulsa «Sí se publicó» (puede pegar el enlace) o «No se publicó» (entonces puede reintentarla).

## Configuración que la app valida al arrancar

En producción (`NODE_ENV=production`) la app **no arranca** si:
- `APP_URL` no es `https://` (salvo localhost),
- `TOKEN_ENC_KEY` no son 32 bytes en base64,
- `APP_URL` es https y falta `ADMIN_EMAIL`.

Avisa (sin bloquear) si falta la clave de la IA o si una red tiene solo la mitad de sus credenciales.
