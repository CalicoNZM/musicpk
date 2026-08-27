# Disc Player - Full Stack Retro

Dual-stream web music player. Left shelf is yours, right side is the wire.

Two sources, one transport:

* **Your Discs** - local files via drag-drop or File > Insert Disc. Metadata and file blobs are persisted in IndexedDB so tracks survive reloads. Nothing leaves your disk unless you publish.
* **Community & Artist Stream** - Express + SQLite backend. Tracks are uploaded via multipart, streamed with Range support, and carry play counts, likes, comments, tags, and artist profiles.

Retro OS themes via `[data-theme="..."]` CSS custom properties. No Inter, no purple AI palette, no bento.

## Themes

* `win95` - Tahoma, navy titlebar, sharp bevels
* `macos9` - Geneva/Charcoal, pinstripe titlebar
* `macosx` - Lucida Grande, aqua highlight
* `beos` - BeOS/Haiku: amber titlebar, warm grey desktop, Courier time display
* `winamp` - Dark slate frame, lime LCD readout, segmented visualiser and EQ strip
* `aqua` - iTunes 2 / Aqua Classic: pinstripe, brushed aluminum, graphite controls
* `kde` - CDE/KDE: industrial teal/grey bevels, square borders

## Project structure

```
MusicPk/
  disc-player.html      # original single-file build (preserved)
  package.json
  server.js             # Express + SQLite + multer + Range streaming
  disc.db               # created on first run
  uploads/              # community audio files (WAV/MP3 seeded)
  public/
    index.html          # split-pane window, sidebar tabs, community feed
    styles.css          # theme tokens + layout (7 themes)
    app.js              # IndexedDB, playback, API client, visualiser
```

## Run

Node 18+ required (no build step).

```sh
npm install
npm start
# open http://localhost:3000
```

Seed data is generated on first start if `disc.db` is empty: 8 community tracks are synthesised as WAV tones (distinct freq per genre) into `uploads/` plus artists and sample comments.

## API

| Method | Path | Notes |
|---|---|---|
| GET | /api/tracks?genre=&q=&sort= | list community tracks |
| GET | /api/tracks/:id | single |
| GET | /api/tracks/:id/stream | Range streaming, increments plays |
| POST | /api/tracks | multipart `audio` + fields `title,artist,genre,year,tags` |
| POST | /api/tracks/:id/like | increments likes |
| GET | /api/tracks/:id/comments |  |
| POST | /api/tracks/:id/comments | `{user,text}` |
| GET | /api/tracks/:id/download | increments downloads |
| GET | /api/artists | |
| GET | /api/artists/:name/tracks | |
| GET | /api/genres | |
| GET | /api/health | |

Uploads are stored in `./uploads` with a 50 MB limit. Accepted: audio/* and .mp3/.wav/.ogg/.m4a/.flac/.aiff.

## Local personal library

Uses IndexedDB store `discPlayer.personalTracks`. Files are stored as Blobs, rehydrated to ObjectURLs on load. Use the "Clear index" button in the Your Discs pane to wipe the store (does not delete published community files).

## Anti-slop adherence

See `no-ai-slop.md` in the project root. This build avoids: harsh generic gradients, Inter/Geist, glassmorphism, radial orbs, dot grids, neon/purple startup palette, bento grids, 3-card rows, emoji decoration, sparkle icons, hover lift, em dashes in copy, and fake testimonials. Typography is Tahoma / Geneva / Lucida Grande / Chicago-derived stacks plus monospace. Chrome is era-specific bevels and sunken panels, not Tailwind shadows.

## License / Privacy

Local files are private until you publish. Community publishes are public to anyone with the server URL. See Help > About > Terms / Privacy modals for the short notice.
