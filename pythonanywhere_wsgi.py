"""
PythonAnywhere WSGI for MUSiCPK
Paste this ENTIRE file into PythonAnywhere → Web → WSGI configuration file
(/var/www/<you>_pythonanywhere_com_wsgi.py) after cloning the repo to /home/<you>/musicpk

It reuses the same disc.db + uploads/ as py_server.py — no extra deps beyond Flask (preinstalled).
For free tier (no Always-on), this WSGI is enough. For paid, you can also just run: python3 py_server.py
"""
import pathlib, sys, json, base64, hashlib, re, mimetypes, sqlite3
ROOT = pathlib.Path(__file__).parent if "__file__" in globals() else pathlib.Path("/home/CalicoNZM/musicpk")
# when pasted into PA WSGI file, ROOT is that file's dir — adjust to your clone:
# if you cloned to /home/<you>/musicpk, set:
# ROOT = pathlib.Path("/home/<you>/musicpk")
# try auto-detect:
for p in [pathlib.Path("/home/CalicoNZM/musicpk"), pathlib.Path("/home/"+__import__("getpass").getuser()+"/musicpk"), pathlib.Path.cwd()]:
    if (p / "py_server.py").exists():
        ROOT = p
        break
sys.path.insert(0, str(ROOT))
import py_server
con = py_server.con
PUBLIC = ROOT / "public"
UPLOADS = ROOT / "uploads"

from flask import Flask, request, jsonify, send_from_directory, abort, Response

app = Flask(__name__, static_folder=str(PUBLIC), static_url_path="")

def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()
def make_token(u): return base64.b64encode(u.encode()).decode()
def token_to_user(tok):
    try:
        u=base64.b64decode(tok.encode()).decode()
        r=con.execute("SELECT * FROM users WHERE username=?",(u,)).fetchone()
        return dict(r) if r else None
    except: return None
def auth_user():
    hdr=request.headers.get("Authorization","")
    if hdr.startswith("Bearer "):
        return token_to_user(hdr[len("Bearer "):].strip())
    return None

@app.route("/api/health")
def health(): return jsonify({"ok":True})

@app.route("/api/genres/list")
def genres_list():
    genres=[
        ["lofi","Lofi","Tape hiss, bedroom 4-track, MiniDisc."],["chiptune","Chiptune","Game Boy, LSDJ, trackers, FM chips."],
        ["indie","Indie","Jangle, DIY, small rooms."],["house","House","Club, 909, basement."],
        ["ambient","Ambient","Drone, field recordings, room tone."],["experimental","Experimental","Noise, synthesis, chance."],
        ["folk","Folk","Acoustic, songs, close mics."],["punk","Punk","Fast, short, live."],
        ["hip-hop","Hip Hop","Boom bap, sampling, MPC."],["rnb","R&B","Soul, modern R&B, bedroom soul."],
        ["soul","Soul","Vintage soul, gospel, northern soul."],["jazz","Jazz","Improvisation, Blue Note, spiritual jazz."],
        ["classical","Classical","Contemporary classical, chamber, minimal."],["techno","Techno","Detroit, Berlin, 303/909."],
        ["dnb","Drum & Bass","Jungle, breakbeats, 170 BPM."],["dubstep","Dubstep","2006 Croydon, weight, half-step."],
        ["shoegaze","Shoegaze","Boards, reverb, My Bloody Valentine."],["dreampop","Dream Pop","Cocteau Twins, Beach House, haze."],
        ["metal","Metal","Doom, black, sludge, riffs."],["hardcore","Hardcore","Youth crew, powerviolence, breakdowns."],
        ["emo","Emo","Midwest, screamo, bedroom emo."],["post-rock","Post-Rock","Godspeed, Talk Talk, crescendos."],
        ["krautrock","Krautrock","Can, Neu!, motorik."],["psychedelia","Psychedelia","Psych rock, 60s revival, jam."],
        ["synthpop","Synthpop","Analog synths, Depeche Mode, city lights."],["vaporwave","Vaporwave","Mallsoft, slowed, 90s web."],
        ["hyperpop","Hyperpop","PC Music, digi-core, 160 BPM."],["city-pop","City Pop","80s Japan, Tatsuro Yamashita, FM."],
        ["disco","Disco / Funk","Chic, Prelude, boogie edits."],["afrobeat","Afrobeat","Fela, contemporary Afro-fusion."],
        ["reggae","Reggae / Dub","King Tubby, dubplates."],["country","Country","Outlaw, alt-country, songwriter."],
    ]
    return jsonify([{"slug":s,"name":n,"desc":d} for s,n,d in genres])

@app.route("/api/genres")
def genres_agg():
    rows=con.execute("SELECT genre, COUNT(*) as count FROM tracks GROUP BY genre").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/artists")
def artists():
    q=request.args.get("q",""); sort=request.args.get("sort","name")
    if q:
        rows=con.execute("SELECT * FROM artists WHERE name LIKE ? OR bio LIKE ? ORDER BY name",(f"%{q}%",f"%{q}%")).fetchall()
    elif sort=="popular":
        rows=con.execute("SELECT a.*, COUNT(t.id) as trackCount FROM artists a LEFT JOIN tracks t ON t.artist_id=a.id GROUP BY a.id ORDER BY trackCount DESC, a.name").fetchall()
    else:
        rows=con.execute("SELECT * FROM artists ORDER BY name").fetchall()
    out=[]
    for r in rows:
        d=dict(r)
        if "trackCount" not in d:
            d["trackCount"]=con.execute("SELECT COUNT(*) FROM tracks WHERE artist_id=? OR artist_name=?",(r["id"],r["name"])).fetchone()[0]
        out.append(d)
    return jsonify(out)

@app.route("/api/artists/<path:ident>")
def artist_one(ident):
    try: aid=int(ident)
    except: row=con.execute("SELECT * FROM artists WHERE name=?",(ident,)).fetchone()
    else: row=con.execute("SELECT * FROM artists WHERE id=?",(aid,)).fetchone()
    if not row: return jsonify({"error":"not found"}),404
    return jsonify(dict(row))

@app.route("/api/albums")
def albums():
    q=request.args.get("q",""); artist=request.args.get("artist","")
    if q: rows=con.execute("SELECT * FROM albums WHERE title LIKE ? OR artist_name LIKE ? ORDER BY year DESC",(f"%{q}%",f"%{q}%")).fetchall()
    elif artist: rows=con.execute("SELECT * FROM albums WHERE artist_name=? ORDER BY year DESC",(artist,)).fetchall()
    else: rows=con.execute("SELECT * FROM albums ORDER BY datetime(createdAt) DESC LIMIT 100").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/tracks")
def tracks():
    genre=request.args.get("genre","all"); q=request.args.get("q",""); sort=request.args.get("sort","newest"); artist=request.args.get("artist","")
    sql="SELECT t.*, a.bio as artist_bio FROM tracks t LEFT JOIN artists a ON t.artist_id=a.id WHERE 1=1"; params=[]
    if genre and genre!="all": sql+=" AND t.genre=?"; params.append(genre)
    if artist: sql+=" AND t.artist_name=?"; params.append(artist)
    if q: sql+=" AND (t.title LIKE ? OR t.artist_name LIKE ? OR t.tags LIKE ? OR t.description LIKE ?)"; params.extend([f"%{q}%",f"%{q}%",f"%{q}%",f"%{q}%"])
    if sort=="plays": sql+=" ORDER BY t.plays DESC"
    elif sort=="likes": sql+=" ORDER BY t.likes DESC"
    else: sql+=" ORDER BY datetime(t.createdAt) DESC"
    rows=con.execute(sql,params).fetchall()
    return jsonify([dict(r) for r in rows])

# auth
@app.route("/api/auth/register", methods=["POST"])
def register():
    d=request.json or {}
    u=(d.get("username") or "").strip()
    p=d.get("password") or ""
    if not u or len(u)<3 or len(u)>20 or not re.match(r"^[A-Za-z0-9_-]+$",u): return jsonify({"error":"username 3-20 alnum/_/-"}),400
    if len(p)<4: return jsonify({"error":"password too short"}),400
    try: con.execute("INSERT INTO users (username,password_hash) VALUES (?,?)",(u,hash_pw(p))); con.commit()
    except sqlite3.IntegrityError: return jsonify({"error":"username taken"}),409
    return jsonify({"token":make_token(u),"username":u})

@app.route("/api/auth/login", methods=["POST"])
def login():
    d=request.json or {}
    u=(d.get("username") or "").strip(); p=d.get("password") or ""
    r=con.execute("SELECT * FROM users WHERE username=?",(u,)).fetchone()
    if not r or r["password_hash"]!=hash_pw(p): return jsonify({"error":"invalid username or password"}),401
    return jsonify({"token":make_token(u),"username":u})

@app.route("/api/me")
def me():
    u=auth_user()
    if not u: return jsonify({"error":"not authenticated"}),401
    return jsonify({"username":u["username"],"bio":u["bio"],"createdAt":u["createdAt"]})

# static fallback — must be last
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path.startswith("api/"): abort(404)
    full = PUBLIC / path
    if path and full.exists() and full.is_file():
        return send_from_directory(str(PUBLIC), path)
    return send_from_directory(str(PUBLIC), "index.html")

# PythonAnywhere expects `application`
application = app
