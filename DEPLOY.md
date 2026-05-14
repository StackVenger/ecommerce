# Deployment Guide — Bangladesh E-Commerce Monorepo

End-to-end recipe to take a fresh Ubuntu VPS to a running production stack
(NestJS API + Next.js 14 web + Postgres + Redis + nginx), using the bundled
Docker Compose scaffolding. Everything here was validated on Ubuntu 24.04 LTS
x86_64, but it works on 22.04+ unchanged.

There are two ingress modes:

- **IP-only HTTP** — quickest path, fine for staging / personal demos. No TLS.
  ~30 min wall-clock from a fresh box.
- **Domain + HTTPS** — production. Adds Let's Encrypt + an nginx rewrite. ~10
  extra min after the HTTP path works.

Pick a mode at Phase 5. The first four phases are identical.

---

## 0. Prerequisites

### On your laptop

```bash
# These are usually already installed; install whatever's missing.
sudo apt install -y openssh-client rsync sshpass curl
```

You also need an SSH key. Generate one if you don't have it:

```bash
test -f ~/.ssh/id_ed25519 || ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519
```

### On the VPS

- Ubuntu 22.04+ (or any Debian-family distro; the apt commands below work
  as-is).
- **Minimum 4 GB RAM**. Less than that and the Next.js build OOMs. If you must
  use 2 GB, add 4 GB of swap (this guide adds 2 GB by default).
- **At least 10 GB free disk**. Docker images + Postgres data + Cloudinary cache
  will grow.
- Root SSH access (password or key — we add a key in Phase 1).
- Inbound ports 22, 80, and 443 reachable from the public internet.

### From the user (you, before starting)

You'll need values for these secrets. Have them ready in a scratch buffer before
Phase 4:

| Group             | Keys                                                                               | Source                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Cloudinary        | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`             | https://console.cloudinary.com → Settings → Security → API Keys                |
| SMTP (Gmail)      | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (App Password), `SMTP_FROM`     | https://myaccount.google.com/apppasswords (needs 2-Step Verification on first) |
| Firebase server   | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (PEM)       | Firebase Console → Settings → Service accounts → Generate new private key      |
| Firebase web      | `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`           | Firebase Console → Project settings → General → Your apps → Web app → Config   |
| Stripe (optional) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com/apikeys                                           |

Postgres / Redis / JWT secrets are generated **on the server** in Phase 4 — you
don't need to bring them.

---

## 1. SSH bootstrap

Set `VPS_IP` once for copy-paste convenience:

```bash
export VPS_IP=YOUR.VPS.IP.HERE
```

### 1.1 First connection (password)

```bash
ssh -o StrictHostKeyChecking=accept-new root@$VPS_IP 'whoami && cat /etc/os-release | grep PRETTY_NAME'
```

If you only have password auth, prefix with `sshpass`:

```bash
SSHPASS='<your-vps-password>' sshpass -e ssh -o StrictHostKeyChecking=accept-new root@$VPS_IP whoami
```

### 1.2 Push your SSH key

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$VPS_IP
# Verify key auth works without password:
ssh -o BatchMode=yes root@$VPS_IP 'echo "[OK] key auth works"'
```

> **Don't disable password auth yet** — wait until the full deploy succeeds.
> We'll do it at the end so you can't lock yourself out mid-deploy.

---

## 2. VPS preparation

Run this single block as one SSH session — it's idempotent and safe to re-run.

```bash
ssh root@$VPS_IP 'bash -s' <<'PREP_EOF'
set -e
export DEBIAN_FRONTEND=noninteractive

echo "[1/6] apt update + upgrade"
apt-get update -qq
apt-get -yqq -o Dpkg::Options::="--force-confold" upgrade

echo "[2/6] base packages"
apt-get -yqq install ca-certificates curl gnupg ufw git rsync

echo "[3/6] swap file (2 GB)"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi
free -h | head -2

echo "[4/6] Docker Engine + Compose plugin"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get -yqq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker --version
docker compose version

echo "[5/6] firewall (ufw)"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null   # ok to allow even for HTTP-only — port stays closed at the app layer
ufw --force enable >/dev/null
ufw status

echo "[6/6] deploy dir"
mkdir -p /opt/ecommerce
echo "[DONE]"
PREP_EOF
```

---

## 3. Get the code onto the server

### Option A — rsync from your laptop (recommended for first deploy)

Works regardless of git remote state and respects local uncommitted changes.

```bash
rsync -az --delete \
  --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.next' \
  --exclude='.turbo' --exclude='.env' --exclude='.env.local' --exclude='.env.production' \
  --exclude='*.log' --exclude='uploads/' \
  /path/to/your/local/ecommerce/ root@$VPS_IP:/opt/ecommerce/
```

### Option B — git clone on the server

```bash
ssh root@$VPS_IP "cd /opt && git clone https://github.com/<you>/ecommerce.git || (cd ecommerce && git pull)"
```

---

## 4. Write the production `.env`

This file lives **only on the server** (never commit it). Generate the
infrastructure secrets on the box and paste your third-party creds.

### 4.1 Generate strong secrets on the server

```bash
ssh root@$VPS_IP 'bash -s' <<'GEN_EOF'
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
echo "REVALIDATE_SECRET=$(openssl rand -hex 32)"
GEN_EOF
```

Copy the output — you'll paste those values into the `.env` heredoc below.

### 4.2 Write `/opt/ecommerce/.env`

Replace every `<PASTE-...>` placeholder before running this. `DOMAIN` is the
bare IP for HTTP mode or your domain for HTTPS mode.

```bash
ssh root@$VPS_IP "cat > /opt/ecommerce/.env <<'PROD_ENV_EOF'
# --- ingress ---
DOMAIN=$VPS_IP

# --- Postgres ---
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=<PASTE-FROM-4.1>
POSTGRES_DB=ecommerce_prod
DATABASE_URL=postgresql://ecommerce:<PASTE-FROM-4.1>@postgres:5432/ecommerce_prod?schema=public

# --- Redis ---
REDIS_PASSWORD=<PASTE-FROM-4.1>
REDIS_URL=redis://:<PASTE-FROM-4.1>@redis:6379

# --- JWT ---
JWT_SECRET=<PASTE-FROM-4.1>
JWT_REFRESH_SECRET=<PASTE-FROM-4.1>

# --- Cloudinary ---
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_UPLOAD_FOLDER=ecommerce

# --- SMTP ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASS=<your-app-password>
SMTP_FROM='\"YourBrand\" <your-gmail>'

# --- Firebase Admin (server-only) ---
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nMIIE...keep-the-literal-backslash-n-escapes...==\\n-----END PRIVATE KEY-----\\n\"

# --- Stripe (placeholders are fine if you're not enabling card checkout yet) ---
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder

# --- Firebase Web SDK (baked into the Next.js bundle at build time) ---
NEXT_PUBLIC_FIREBASE_API_KEY=<web-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>

# --- Revalidation webhook (must match between API and web) ---
REVALIDATE_SECRET=<PASTE-FROM-4.1>
PROD_ENV_EOF
chmod 600 /opt/ecommerce/.env"
```

**Gotchas**:

- `FIREBASE_PRIVATE_KEY` must keep its `\n` escapes literal (don't replace them
  with real newlines). The API does the substitution at runtime.
- `SMTP_FROM` with a display name needs single-quoted value because the inner
  double quotes confuse `.env` parsing. Format:
  `SMTP_FROM='"DisplayName" <email@addr>'`.

---

## 5. Configure ingress mode

### Mode A — IP-only HTTP (default in the repo)

Nothing to do. `nginx/conf.d/default.conf` already serves on port 80 with no
TLS.

### Mode B — Domain + HTTPS (Let's Encrypt)

Before going down this path, point your domain's A record at the VPS IP and wait
for DNS to propagate (`dig +short yourdomain.com` should return your VPS IP).

1. **Replace nginx config** with the bundled HTTPS variant (or restore the
   original by checking git history of `nginx/conf.d/default.conf` — earlier
   commits had the 443 block + ACME challenge location).

2. **Issue the cert** using certbot in a one-shot container:

   ```bash
   ssh root@$VPS_IP 'bash -s' <<'CERTBOT_EOF'
   mkdir -p /opt/ecommerce/nginx/ssl /opt/ecommerce/nginx/certbot-www
   docker run --rm \
     -v /opt/ecommerce/nginx/ssl:/etc/letsencrypt \
     -v /opt/ecommerce/nginx/certbot-www:/var/www/certbot \
     -p 80:80 \
     certbot/certbot certonly --standalone \
       --email you@example.com --agree-tos --no-eff-email \
       -d yourdomain.com -d www.yourdomain.com
   # Copy certs into the path nginx expects
   cp /opt/ecommerce/nginx/ssl/live/yourdomain.com/fullchain.pem /opt/ecommerce/nginx/ssl/
   cp /opt/ecommerce/nginx/ssl/live/yourdomain.com/privkey.pem /opt/ecommerce/nginx/ssl/
   CERTBOT_EOF
   ```

3. **Update `.env`**: set `DOMAIN=yourdomain.com`, and change
   `NEXT_PUBLIC_APP_URL` / `FRONTEND_URL` / `WEB_URL` / `CORS_ORIGIN` to use
   `https://`. Then rebuild web (since `NEXT_PUBLIC_*` are baked at build time):

   ```bash
   ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env up -d --build web nginx'
   ```

4. **Cert renewal** (set up cron):

   ```bash
   ssh root@$VPS_IP 'echo "0 3 * * * docker run --rm -v /opt/ecommerce/nginx/ssl:/etc/letsencrypt -v /opt/ecommerce/nginx/certbot-www:/var/www/certbot certbot/certbot renew && docker exec ecommerce-nginx nginx -s reload" > /etc/cron.d/certbot-renew'
   ```

---

## 6. Build + start the stack

```bash
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env up -d --build'
```

First build takes **5–10 minutes** (mostly Next.js compile + Puppeteer Chrome
download in the API image). Subsequent builds are seconds if your code change is
small.

Watch progress:

```bash
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env logs -f --tail=20'
```

Wait until you see `Nest application successfully started` from the API and
`Ready in <Nms>` from the web. Then check service health:

```bash
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env ps'
```

All five containers should show `Up (healthy)`. If anything is `unhealthy`, see
_Troubleshooting_ below.

---

## 7. First-run database setup

### 7.1 Migrations

The API entrypoint runs `prisma migrate deploy` automatically on every container
start, so all migrations are applied by the time the API is healthy. Nothing to
do.

### 7.2 Schema drift sync (only if needed)

If the Prisma schema has columns that aren't in any migration (this repo has a
couple, e.g. `banners.subtitle`), run **once**:

```bash
ssh root@$VPS_IP "docker exec ecommerce-api sh -c 'cd /app/packages/database && pnpm exec prisma db push --accept-data-loss --skip-generate'"
```

The `--accept-data-loss` is safe on a fresh DB. Don't run it on a DB with real
customer data without a backup.

### 7.3 Create the first super admin

```bash
ssh root@$VPS_IP "docker exec -e ADMIN_EMAIL='admin@yourdomain.com' -e ADMIN_PASSWORD='REPLACE-ME' ecommerce-api node /app/apps/api/scripts/create-superadmin.js"
```

The script is an upsert — safe to re-run for password resets.

---

## 8. Firebase: authorize the new origin

If you're using Google sign-in, add your origin to Firebase's authorized list
**before** trying it. Without this, the sign-in popup will fail with
`auth/unauthorized-domain`.

1. Open
   https://console.firebase.google.com/project/&lt;your-project-id&gt;/authentication/settings
2. **Authorized domains** → **Add domain**
3. Add the IP (`103.187.23.21`) or the hostname (`yourdomain.com`). Add both if
   you're moving from one to the other.

---

## 9. Verification

From your laptop:

```bash
export VPS_IP=YOUR.IP   # or yourdomain.com
SCHEME=http             # or https for Mode B

echo "=== public endpoints ==="
for path in / /shop /login /admin /api/v1/healthz /api/v1/health; do
  printf "%-25s -> %s\n" "$path" "$(curl -sk -o /dev/null -w '%{http_code}' $SCHEME://$VPS_IP$path)"
done

echo "=== admin login ==="
curl -sk -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"REPLACE-ME"}' \
  $SCHEME://$VPS_IP/api/v1/auth/login | head -c 200; echo

echo "=== container health ==="
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env ps --format "table {{.Name}}\t{{.Status}}"'

echo "=== smtp + firebase boot signals ==="
ssh root@$VPS_IP 'docker logs ecommerce-api 2>&1 | grep -iE "smtp connection verified|Firebase Admin SDK initialized" | head'
```

Expected: every endpoint returns `200`, login returns a JSON envelope with
`SUPER_ADMIN` role, all five containers say `Up (healthy)`, and the API boot log
shows both SMTP + Firebase initialized.

Now open `http://$VPS_IP/login` in a browser, sign in with the admin creds,
upload a test product or banner image, place a test COD order, and confirm the
order email arrives.

---

## 10. Document the credentials

Generate a one-file dossier and copy it off-box to your password manager. Don't
leave it on the server long-term.

```bash
ssh root@$VPS_IP 'cat /opt/ecommerce/.env' | scp /dev/stdin user@laptop:~/Desktop/ecommerce-prod-secrets.txt
# or just copy/paste from the server
```

A richer template (with rotation instructions per group) was used in our first
deploy — see the _Hardening_ checklist below for what should also be captured.

---

## 11. Hardening (do once everything works)

```bash
# 1. Disable SSH password auth — make sure key login works first (test in a second terminal!)
ssh root@$VPS_IP "sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl reload ssh"

# 2. Rotate the placeholder JWT secrets if you used any
#    (regenerate via openssl, edit /opt/ecommerce/.env, then:)
ssh root@$VPS_IP "cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate api web"

# 3. Set up nightly DB backups + offsite copy
ssh root@$VPS_IP "mkdir -p /opt/ecommerce/backups && cat > /etc/cron.d/ecom-backup <<'CRON'
0 2 * * * root docker exec ecommerce-postgres pg_dump -U ecommerce ecommerce_prod | gzip > /opt/ecommerce/backups/db-\$(date +\\%F).sql.gz && find /opt/ecommerce/backups -name 'db-*.sql.gz' -mtime +14 -delete
CRON"
# Then schedule a separate rsync/rclone from /opt/ecommerce/backups to S3 / Backblaze / Google Drive.

# 4. (Optional) fail2ban for SSH brute-force protection
ssh root@$VPS_IP "apt-get install -y fail2ban && systemctl enable --now fail2ban"
```

---

## 12. Common operations

```bash
# tail logs
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env logs -f'

# restart one service
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env restart api'

# deploy a code update (from your laptop)
rsync -az --delete \
  --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.next' \
  --exclude='.env*' --exclude='uploads/' \
  /local/ecommerce/ root@$VPS_IP:/opt/ecommerce/
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env up -d --build'

# rebuild just one app (faster than full stack)
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env up -d --build api'   # or web

# create another super admin
ssh root@$VPS_IP "docker exec -e ADMIN_EMAIL='ops@yourdomain.com' -e ADMIN_PASSWORD='strong-pw' ecommerce-api node /app/apps/api/scripts/create-superadmin.js"

# one-off SQL
ssh root@$VPS_IP "docker exec -it ecommerce-postgres psql -U ecommerce -d ecommerce_prod"

# disk usage
ssh root@$VPS_IP "df -h / && du -sh /opt/ecommerce && docker system df"

# nuke and rebuild from scratch (DESTROYS DATA — only on a dev box)
ssh root@$VPS_IP 'cd /opt/ecommerce && docker compose -f docker-compose.prod.yml --env-file .env down -v && docker compose -f docker-compose.prod.yml --env-file .env up -d --build'
```

---

## 13. Troubleshooting (every issue we hit on the first deploy)

### Docker build: `Could not find turbo.json or turbo.jsonc`

Root `pnpm build` runs `turbo run build`. Make sure `turbo.json` is copied into
the build context — it is, by the patched Dockerfiles, but if you customize them
keep `turbo.json` in the same `COPY` line as `pnpm-workspace.yaml`.

### Docker build: `prepare: sh: husky: not found`

Root `package.json` `prepare` script runs `husky install`, but husky is in root
devDeps and gets filtered out for app-specific installs. Fix already in
`package.json`: the script is
`command -v husky >/dev/null && husky install || true`. Keep that conditional
form.

### Docker build: `Could not find Prisma Schema` / `prisma: not found`

Two things must be true:

- `packages/database` is in the install filter:
  `--filter @ecommerce/api... --filter @ecommerce/database...`
- The runner stage installs devDeps: `pnpm install --prod=false` (because
  `NODE_ENV=production` is set above, which otherwise prunes devDeps and removes
  `prisma`).

### Docker build: `Cannot find module 'express'`

Root `.npmrc` must be copied into the build context. Without it pnpm uses
default (non-hoisted, strict-peer-deps) install layout, and
`@nestjs/platform-express`'s peer `express` doesn't end up on the runtime
resolve path.

### API: `TypeError: _sharp is not a function`

Source file did `import * as sharp from 'sharp'`. SWC compiles that to a
namespace object whose `default` is the function — so `_sharp(...)` fails.
Always use `import sharp from 'sharp'` (with `esModuleInterop: true`, which the
tsconfig has).

### API: `Unknown argument 'avatarThumb'`

Schema drift — the codebase had a field that was never added to a migration. We
removed the bogus field from the avatar service and refactored avatar upload to
go through `UploadService` (Cloudinary).

### API: `The column 'banners.subtitle' does not exist in the current database`

Same class of bug — schema has columns no migration adds. Fix:
`prisma db push --accept-data-loss --skip-generate` (only safe on a DB without
real data).

### Web container `unhealthy` even though `curl /` returns 200

Busybox `wget` in alpine resolves `localhost` to IPv6 (`::1`) but Next.js binds
IPv4 only. Healthcheck must use `http://127.0.0.1:3000/`, not `localhost`.
Already fixed in `docker-compose.prod.yml`.

### Login succeeds but next request 401s / user "logged out immediately"

Token cookies were being set `Secure=true` (HTTPS-only) when
`NODE_ENV=production`, but the deploy is over plain HTTP. Browsers drop the
cookies → next request has no token → AuthProvider's `/auth/me` returns 401 →
user redirected to login. Fixed in `apps/web/src/lib/auth/tokens.ts` — `Secure`
is now keyed off `window.location.protocol === 'https:'` so HTTPS deploys still
get Secure and HTTP-only deploys work too.

### `Google login failed. Please try again.`

Firebase only allows sign-in popups from authorized origins. By default that's
`localhost` and `<project>.firebaseapp.com`. Add your VPS IP or domain to
**Authorized domains** in the Firebase Console (see Phase 8).

### `docker compose` warning: `the attribute 'version' is obsolete`

Cosmetic — `docker-compose.prod.yml` still has a `version: '3.8'` declaration
that newer Compose versions ignore. Safe to delete the line; harmless if kept.

### Build OOMs on a 2 GB box

Either bump to 4 GB or grow the swap file:
`fallocate -l 4G /swapfile2 && chmod 600 /swapfile2 && mkswap /swapfile2 && swapon /swapfile2`.

### Out of disk space after a few rebuilds

Docker keeps every old layer. Clean periodically:
`docker system prune -af --volumes` (warning: removes ALL unused volumes — read
carefully). For just images: `docker image prune -af`.

---

## 14. Files this guide assumes are in the repo

If you fork the repo cleanly, all of these are already present (and were the
result of fixing the issues above):

- `docker-compose.prod.yml` — patched to pass every env var the apps need, with
  IPv4 healthchecks, port 80 only.
- `apps/api/Dockerfile` + `apps/api/docker-entrypoint.sh` — multi-stage build,
  Prisma migrate on start, devDeps included in runner for the prisma CLI.
- `apps/web/Dockerfile` — bakes `NEXT_PUBLIC_*` (including all four Firebase web
  keys + Stripe publishable) as `ARG`s at build time.
- `apps/web/next.config.js` — `output: 'standalone'` (required by the web
  Dockerfile).
- `apps/api/scripts/create-superadmin.js` — idempotent admin upsert with env
  override.
- `nginx/conf.d/default.conf` — port-80-only IP deploy config.
- Root `package.json` — `prepare` script is conditional on husky existing.

If anything's missing, restore it from the deploy commit before running this
guide.
