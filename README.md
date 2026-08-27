# MUSiCPK

my attempt at a music wiki that doesn't feel like every other AI site. started as a single-file disc player and kept growing when people asked for a real community.

live at https://github.com/CalicoNZM/musicpk — run it locally with `python3 py_server.py` and open http://localhost:3000

---

I wanted something like early RateYourMusic / Discogs but smaller. No AI tracks — that's the one hard rule. Everything is human-made or it gets removed. The rest is wiki-style: you sign in, you can make an artist niche, edit their bio, make an album page, attach tracks. Genres are actual boards (32 of them now, from lofi to city-pop) with threads, not just tags.

**what's in here right now**

- your discs — drop mp3/wav/flac onto the page, they stay in IndexedDB in your browser until you decide to publish. never leaves your disk unless you hit publish.
- community — 105 artist stubs to start (pulled from my own list + a bunch of stubs the community can flesh out), albums you create inside an artist, tracks with real metadata: description, credits, year, label, provenance. you can paste an Apple Music album link and it pulls title/year/cover via iTunes Search so you don't retype everything. Spotify track/album paste works for title/artist via oEmbed (Spotify needs API for full tracklist, so Apple path is better for albums).
- 32 genre boards, each with its own discussion. no bots, one account per person.
- display settings — Settings button top right. warm paper is default but you can pick midnight/ocean/forest/etc or dial your own colours and save them as named themes (they live in localStorage as `pk.savedThemes`, export/import as JSON). layout: sidebar left/right/hidden, width, density, grid vs list.

**running it**

```
python3 py_server.py
# -> http://localhost:3000
# needs python 3.9+, no pip deps. stdlib only.
# db is ./disc.db (sqlite), uploads go to ./uploads/
```

or `node server.js` if you prefer the old express version — same routes. Dockerfile is included so Render/Railway/Fly just works: `PORT` env is read.

**a bit rough around the edges**

- search is just LIKE %query%, no full-text yet
- no cover art upload, just URL field
- plays/likes are naive counters, no rate limiting
- wav/mp3 under 50MB, no transcoding

i'm keeping the first single-file `disc-player.html` in the repo as `disc-player.html` for reference. the rest is in `public/` (index/styles/app) and `py_server.py`.

**rules**

human music only. if you use an AI mastering helper, disclose it in credits. otherwise it'll be removed. see TOS inside the app (Rulebook) or `py_server.py` `/api/rulebook` — 8 sections, last updated 2026-08-27.

**deploy**

not using vercel for this one. easiest is Render free:

1. fork/push to GitHub
2. Render → New Web Service → Docker → Connect `musicpk` → Deploy
3. or `fly launch` / `railway up` — both read `Dockerfile` and `PORT`

more in `DEPLOY.md`. tunnel for demos: `ssh -R 80:localhost:3000 nokey@localhost.run`

**license**

MIT — do what you want, just keep the human-music rule.

---

built while listening to a lot of Boards of Canada and trying not to make another purple-gradient landing page. PRs welcome, especially if you catch me slipping back into AI slop.

— Calico
