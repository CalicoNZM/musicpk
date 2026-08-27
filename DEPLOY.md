# MUSiCPK — go online

Local stack is Python stdlib only (`py_server.py` + `public/`). No build step. Pick one host.

## 1) Fastest — Render / Railway / Fly (Docker)

Repo already has `Dockerfile` and `Procfile`.

**Render**
1. Push this folder to GitHub.
2. Render → New Web Service → Connect repo → Runtime: Docker → Port 3000 → Deploy.
3. Set env `PORT=10000` if Render requires; `py_server.py` reads `PORT`.

**Railway**
```
railway init
railway up
```
`PORT` is injected automatically.

**Fly.io**
```
fly launch --dockerfile Dockerfile --no-deploy
fly deploy
fly open
```

## 2) Vercel (Python serverless)
`vercel.json` already routes `/(.*)` to `py_server.py`.
```
vercel
vercel --prod
```
Note: Vercel serverless is read-only — `disc.db` and `uploads/` reset on cold start. For persistence, attach Vercel Postgres + Blob, or prefer Render.

## 3) Any VPS (Ubuntu)
```
git clone <repo> && cd MusicPk
python3 py_server.py
# or systemd
# sudo cp musicpk.service /etc/systemd/system/
```
`musicpk.service` example:
```
[Unit]
Description=MUSiCPK
After=network.target
[Service]
WorkingDirectory=/opt/MusicPk
ExecStart=/usr/bin/python3 py_server.py
Restart=always
Environment=PORT=3000
[Install]
WantedBy=multi-user.target
```

## 4) Instant tunnel for demo (no deploy)
From this Mac, with server on :3000:
```
# via localhost.run (no install)
ssh -R 80:localhost:3000 nokey@localhost.run
# or cloudflared
cloudflared tunnel --url http://localhost:3000
# or localtunnel
npx localtunnel --port 3000
```
Copy the printed `https://...` URL — share it. It tunnels to your local `py_server.py`.

## Env
`PORT` only. Default 3000. DB at `./disc.db`, uploads at `./uploads/`.

## Data persistence online
`disc.db` is SQLite file. On Docker hosts, mount a volume at `/app/disc.db` or switch to Postgres. For MVP, host volume is fine for 105 artists + user uploads.
