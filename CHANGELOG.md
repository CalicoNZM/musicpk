# changelog — human notes

2026-08-27 — went full-screen, killed the fake OS window. nobody wanted traffic lights. added Settings that actually save (localStorage) plus saveable named colour themes. still needs a "share theme" link.

2026-08-27 — bumped genres from 8 to 32. was missing hip-hop, jazz, metal etc. feels more like a real crate now.

2026-08-27 — albums. you can make an album inside an artist, then attach tracks to it. Apple Music album import now pulls 10-30 tracks via iTunes lookup?entity=song — spotify still just oembed (their API wants auth).

2026-08-27 — seeded 105 artist stubs. first 20 are real bios i wrote (Radiohead to Weyes Blood), rest are stubs the community can expand. better than 8 fake wav tones.

2026-08-26 — auth. one account per person, Bearer token is just base64(username) for now — not prod-grade, good enough for a community archive. no bots.

2026-08-25 — started from disc-player.html single file. kept it in repo.

todo:
- full-text search
- actual cover upload
- rate limit likes/plays
- postgres for hosted db instead of sqlite file
