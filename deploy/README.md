# Deploying Lingo

Lingo shares the Lightsail server (`martinteran-server`) with the other apps. The shared
Caddy container owns ports 80/443; its Caddyfile lives in the **fake-sportsbook** repo
(`deploy/caddy/Caddyfile`), so routing changes go through a PR there.

## One-time setup

1. **DNS**: an A record `lingo.martinteran.me` → the server's static IP (Route 53 zone
   `martinteran.me`).
2. **Caddy** (PR to fake-sportsbook):
   ```
   lingo.martinteran.me {
   	encode zstd gzip
   	handle /api/* { reverse_proxy lingo-backend:8000 }
   	handle { reverse_proxy lingo-frontend:80 }
   }
   ```
3. **Server**: `sudo mkdir -p /srv/lingo/deploy && sudo chown -R ubuntu: /srv/lingo`, then
   create `/srv/lingo/deploy/.env.prod` from `.env.prod.example` with secrets from
   `openssl rand -hex 32`. Check free memory first (`free -m`): this is the third stack.
4. **GitHub** environment `production` (restricted to `main`) with secrets `DEPLOY_HOST`,
   `DEPLOY_SSH_KEY` (a dedicated passwordless key in the server's `authorized_keys`) and
   `DEPLOY_KNOWN_HOSTS`. Until `DEPLOY_HOST` is set, the deploy job skips with a notice.

## Every deploy

Merging to `main` deploys automatically. By hand: `DEPLOY_HOST=ubuntu@<ip> deploy/deploy.sh`.
Before a production migration, `pg_dump` to `~/backups` on the server.
