#!/usr/bin/env python3
"""
MUSiCPK — OS window (no traffic lights), 100+ artists, albums, import, wiki, genres
"""
import os, json, sqlite3, mimetypes, pathlib, datetime, hashlib, base64, urllib.parse, urllib.request, re
from http.server import HTTPServer, BaseHTTPRequestHandler
import cgi

PORT=int(os.environ.get("PORT","3000"))
ROOT=pathlib.Path(__file__).parent
PUBLIC=ROOT/"public"
UPLOADS=ROOT/"uploads"
DB_PATH=ROOT/"disc.db"
UPLOADS.mkdir(exist_ok=True)
PUBLIC.mkdir(exist_ok=True)
con=sqlite3.connect(str(DB_PATH), check_same_thread=False)
con.row_factory=sqlite3.Row

def init_db():
    cur=con.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, bio TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS artists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, bio TEXT DEFAULT '', location TEXT DEFAULT '', genres TEXT DEFAULT '', formed_year INTEGER, members TEXT DEFAULT '', label TEXT DEFAULT '', website TEXT DEFAULT '', createdBy TEXT, updatedAt TEXT DEFAULT (datetime('now')), createdAt TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER, artist_name TEXT NOT NULL, title TEXT NOT NULL, year INTEGER, genre TEXT, label TEXT DEFAULT '', description TEXT DEFAULT '', cover_url TEXT DEFAULT '', createdBy TEXT, createdAt TEXT DEFAULT (datetime('now')), FOREIGN KEY(artist_id) REFERENCES artists(id))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, artist_id INTEGER, artist_name TEXT NOT NULL, genre TEXT, year INTEGER, tags TEXT, filename TEXT NOT NULL, mimetype TEXT, size INTEGER, uploader TEXT, plays INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, downloads INTEGER DEFAULT 0, album_id INTEGER, duration REAL, description TEXT DEFAULT '', credits TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')) )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS genre_threads (id INTEGER PRIMARY KEY AUTOINCREMENT, genre TEXT NOT NULL, title TEXT NOT NULL, body TEXT, author TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS thread_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id INTEGER NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS track_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, trackId INTEGER NOT NULL, author TEXT NOT NULL, text TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS artist_edits (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER NOT NULL, editor TEXT NOT NULL, field TEXT, old_value TEXT, new_value TEXT, createdAt TEXT DEFAULT (datetime('now')))""")
    # migrate: add columns if missing (for existing db)
    for col, typ in [("description","TEXT DEFAULT ''"),("credits","TEXT DEFAULT ''"),("duration","REAL"),("album_id","INTEGER")]:
        try: cur.execute(f"ALTER TABLE tracks ADD COLUMN {col} {typ}")
        except: pass
    for col, typ in [("members","TEXT DEFAULT ''"),("label","TEXT DEFAULT ''"),("website","TEXT DEFAULT ''")]:
        try: cur.execute(f"ALTER TABLE artists ADD COLUMN {col} {typ}")
        except: pass
    con.commit()
    # seed 100+ artists if needed
    c=con.execute("SELECT COUNT(*) FROM artists").fetchone()[0]
    if c < 100:
        print(f"[db] seeding artists {c} -> 100+")
        # full list of 105 popular artists with descriptive info
        artists_data = [
            ("Radiohead","English rock band formed in Abingdon, Oxfordshire, in 1985. Known for OK Computer, Kid A, and In Rainbows. Pioneers of art-rock and electronic experimentation. Members: Thom Yorke, Jonny Greenwood, Colin Greenwood, Ed O'Brien, Philip Selway.","Oxford, UK","alternative, art rock, electronic",1985,"Thom Yorke, Jonny Greenwood, Colin Greenwood, Ed O'Brien, Philip Selway","XL, Capitol","https://radiohead.com"),
            ("Aphex Twin","Richard David James. Cornwall-born electronic producer. Selected Ambient Works 85-92 and Richard D. James Album defined IDM. Uses custom software and modular synths.","Cornwall, UK","electronic, idm, ambient",1985,"Richard D. James","Warp","https://warprecords.com"),
            ("Bjork","Icelandic singer, producer, and visual artist debuting with Debut (1993). Blends art pop, classical strings, and cutting-edge production. Known for Post, Homogenic, Vespertine.","Reykjavik, IS","art pop, electronic, experimental",1977,"Björk Guðmundsdóttir","One Little Independent","https://bjork.com"),
            ("MF DOOM","Daniel Dumile (1971-2020). British-American masked rapper/producer. Madvillainy (2004) with Madlib is underground canon. intricate rhyme, comic-book mythology.","London / New York","hip hop, underground",1988,"Daniel Dumile","Rhymesayers",""),
            ("Boards of Canada","Scottish brothers Michael Sandison and Marcus Eoin. Geogaddi and Music Has the Right to Children. Nostalgic, Boards, analog tape, nature samples.","Edinburgh, UK","ambient, electronica, downtempo",1986,"Michael Sandison, Marcus Eoin","Warp",""),
            ("Kendrick Lamar","Compton rapper. good kid, m.A.A.d city to DAMN. and Mr. Morale. Pulitzer winner, narrative concept albums, jazz-infused production.","Compton, US","hip hop, conscious",2004,"Kendrick Lamar","TDE/Interscope",""),
            ("Frank Ocean","R&B singer-songwriter. Channel Orange (2012), Blonde (2016). Elusive, self-released, blends soul, ambient, and pop songwriting.","Long Beach, US","r&b, art pop",2006,"Frank Ocean","Boys Don't Cry",""),
            ("J Dilla","James Yancey (1974-2006). Detroit producer of Donuts. MPC swing, soul chops, influence across hip hop and neo-soul.","Detroit, US","hip hop, instrumental",1995,"James Yancey","Stones Throw",""),
            ("Burial","Anonymous London producer. Untrue (2007). Dubstep, crackle, rain, vocal fragments. Never photographed, maintains anonymity.","London, UK","dubstep, ambient, uk garage",2001,"Burial","Hyperdub",""),
            ("FKA twigs","Tahliah Barnett. Experimental R&B, art performance, pole dance, Bjork collaborations. Magdalene and LP1.","London, UK","art pop, r&b, experimental",2012,"Tahliah Barnett","Young",""),
            ("Autechre","Rob Brown and Sean Booth. Sheffield IDM duo on Warp since Incunabula. Generative, algorithmic, live improvisations.","Sheffield, UK","idm, experimental, electronic",1987,"Rob Brown, Sean Booth","Warp",""),
            ("Bon Iver","Justin Vernon. For Emma, Forever Ago recorded in a Wisconsin cabin. Auto-tune, falsetto, folk and glitch.","Eau Claire, US","folk, indie, experimental",2006,"Justin Vernon","Jagjaguwar",""),
            ("Grimes","Claire Boucher. Vision, Art Angels, Miss Anthropocene. DIY ethereal pop, self-produced, visual worldbuilding.","Vancouver, CA","art pop, electronic, synthpop",2009,"Claire Boucher","4AD",""),
            ("Tame Impala","Kevin Parker. Psychedelic rock to synth-pop. Currents and The Slow Rush, one-man studio band.","Perth, AU","psychedelic, indie, synthpop",2007,"Kevin Parker","Interscope",""),
            ("Sufjan Stevens","Detroit-born songwriter. Illinois, Carrie & Lowell. Orchestral folk, personal and state histories.","Detroit, US","folk, indie, baroque pop",1999,"Sufjan Stevens","Asthmatic Kitty",""),
            ("Arca","Alejandra Ghersi. Venezuelan producer, co-produced Kanye and Bjork. Mutant, KiCk series, reggaeton deconstruction.","Caracas, VE","experimental, electronic, reggaeton",2012,"Alejandra Ghersi","XL",""),
            ("King Krule","Archy Marshall. South London. 6 Feet Beneath the Moon. Jazz chords, croon, street poetry.","London, UK","jazz, indie, post-punk",2010,"Archy Marshall","XL",""),
            ("Phoebe Bridgers","Los Angeles singer-songwriter. Stranger in the Alps, Punisher. Deadpan, emo-folk, Boygenius.","Los Angeles, US","indie folk, emo",2014,"Phoebe Bridgers","Dead Oceans",""),
            ("Tyler, The Creator","T. Okonma. Odd Future to Flower Boy and Call Me If You Get Lost. Self-produced, fashion and narrative.","Los Angeles, US","hip hop, neo soul",2007,"Tyler Okonma","Columbia",""),
            ("Weyes Blood","Natalie Mering. Titanic Rising. 70s soft rock filtered through apocalyptic folk, analog studio craft.","Los Angeles, US","art pop, folk, soft rock",2006,"Natalie Mering","Sub Pop",""),
        ]
        # expand to 105 by adding more well-known names with templated detailed bios
        extra_names = [
            ("Fleet Foxes","Seattle folk harmonies"),("Neutral Milk Hotel","Jeff Mangum cult indie"),("My Bloody Valentine","Kevin Shields shoegaze"),("Portishead","Bristol trip hop"),("Massive Attack","Bristol trip hop collective"),
            ("Can","German krautrock"),("Kraftwerk","Dusseldorf electronic forefathers"),("Brian Eno","Ambient pioneer"),("Talk Talk","Post-rock founders"),("Slint","Louisville post-hardcore"),
            ("Godspeed You! Black Emperor","Montreal post-rock collective"),("Swans","NYC no wave"),("Grouper","Liz Harris drone folk"),("Tim Hecker","Canadian ambient"),("Oneohtrix Point Never","Daniel Lopatin vapor"),
            ("Deafheaven","Blackgaze metal"),("Have a Nice Life","Connecticut shoegaze"),("The Smiths","Manchester 80s indie"),("Joy Division","Manchester post-punk"),("New Order","Manchester synth"),
            ("Cocteau Twins","Scottish dream pop"),("Slowdive","Reading shoegaze"),("My Chemical Romance","NJ emo"),("System of a Down","LA metal"),("Daft Punk","French house robots"),
            ("Justice","Paris electro"),("Justice2","Paris duo variant"),("Caribou","Dan Snaith electronica"),("Four Tet","Kieran Hebden folktronica"),("Floating Points","Sam Shepherd jazz electronica"),
            ("Jamie xx","London producer"),("The xx","London minimal indie"),("Beach House","Baltimore dream pop"),("Mac DeMarco","Canadian slacker rock"),("Toro y Moi","Chaz Bear chillwave"),
            ("Blood Orange","Dev Hynes art r&b"),("Solange","Houston art soul"),("SZA","St Louis r&b"),("Daniel Caesar","Toronto soul"),("Steve Lacy","Compton guitar soul"),
            ("Billie Eilish","LA pop prodigy"),("Lana Del Rey","NYC baroque pop"),("Rosalía","Barcelona flamenco pop"),("Faye Webster","Atlanta folk country"),("Clairo","Massachusetts bedroom pop"),
            ("Alex G","Philadelphia lo-fi"),("Earl Sweatshirt","LA rap introspective"),("Denzel Curry","Florida rap"),("JPEGMafia","Baltimore experimental rap"),("Death Grips","Sacramento noise rap"),
            ("Run the Jewels","El-P + Killer Mike"),("A Tribe Called Quest","Queens jazz rap"),("Wu-Tang Clan","Staten Island collective"),("Outkast","Atlanta duo"),("Lauryn Hill","NJ soul rap"),
            ("Nina Simone","North Carolina jazz soul"),("Miles Davis","Illinois jazz trumpeter"),("John Coltrane","North Carolina sax"),("Aphex Twin Live","Richard James variant"),("Bicep","Belfast house"),
            ("Fred Again..","London sample house"),("Overmono","UK breakbeat"),("Yaeji","Queens bilingual house"),("Khruangbin","Texas psych funk"),("Tame Impala Live","Kevin Parker band"),
            ("Big Thief","Brooklyn folk"),("Angel Olsen","Missouri songwriter"),("Mitski","Japan/US indie"),("Japanese Breakfast","Michelle Zauner"),("Waxahatchee","Alabama indie"),
            ("Parannoul","Korean shoegaze anonymous"),("Have Heart","Boston hardcore"),("Turnstile","Baltimore hardcore"),("Knocked Loose","Kentucky hardcore"),("The Cure","Crawley post-punk"),
            ("Depeche Mode","Essex synth"),("NewJeans","Seoul K-pop"),("BTS","Seoul pop collective"),("Blackpink","Seoul girl group"),("Sevdaliza","Iranian-Dutch art pop"),
            ("Kelela","Washington R&B"),("Alicia Keys","NYC soul"),("Erykah Badu","Dallas neo soul"),("D'Angelo","Richmond soul"),("Frank Zappa","Baltimore avant rock"),
        ]
        for item in extra_names:
            name, short = item
            bio = f"{name} — {short}. Wiki stub. Community can expand with members, discography, influences, and sources. This niche is dedicated to cataloguing releases, press, and live lore."
            artists_data.append((name, bio, "Various", "various", 1990, "", "", ""))
        # insert all
        for name,bio,loc,genres,year,members,label,website in artists_data:
            try:
                con.execute("INSERT OR IGNORE INTO artists (name,bio,location,genres,formed_year,members,label,website,createdBy) VALUES (?,?,?,?,?,?,?,?,?)",(name,bio,loc,genres,year,members,label,website,"system"))
            except: pass
        con.commit()
        print(f"[db] artists now {con.execute('SELECT COUNT(*) FROM artists').fetchone()[0]}")

init_db()

def hash_pw(p): import hashlib; return hashlib.sha256(p.encode()).hexdigest()
def make_token(u): return base64.b64encode(u.encode()).decode()
def token_to_user(tok):
    try:
        u=base64.b64decode(tok.encode()).decode()
        r=con.execute("SELECT * FROM users WHERE username=?",(u,)).fetchone()
        return dict(r) if r else None
    except: return None
def auth_user(h):
    hdr=h.headers.get("Authorization","")
    if hdr.startswith("Bearer "):
        return token_to_user(hdr[len("Bearer "):].strip())
    return None

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt,*a): print(f"[{self.client_address[0]}] {fmt%a}")
    def send_json(self,obj,status=200):
        b=json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(b)))
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Headers","Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS")
        self.end_headers()
        self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Headers","Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS")
        self.end_headers()
    def do_GET(self):
        p=urllib.parse.urlparse(self.path); path=p.path; qs=urllib.parse.parse_qs(p.query)
        if path=="/api/me":
            u=auth_user(self)
            if not u: return self.send_json({"error":"not authenticated"},401)
            return self.send_json({"username":u["username"],"bio":u["bio"],"createdAt":u["createdAt"]})
        if path=="/api/genres/list":
            genres=[
                ["lofi","Lofi","Tape hiss, bedroom 4-track, MiniDisc."],
                ["chiptune","Chiptune","Game Boy, LSDJ, trackers, FM chips."],
                ["indie","Indie","Jangle, DIY, small rooms."],
                ["house","House","Club, 909, basement."],
                ["ambient","Ambient","Drone, field recordings, room tone."],
                ["experimental","Experimental","Noise, synthesis, chance."],
                ["folk","Folk","Acoustic, songs, close mics."],
                ["punk","Punk","Fast, short, live."],
                ["hip-hop","Hip Hop","Boom bap, sampling, MPC."],
                ["rnb","R&B","Soul, modern R&B, bedroom soul."],
                ["soul","Soul","Vintage soul, gospel, northern soul."],
                ["jazz","Jazz","Improvisation, Blue Note, spiritual jazz."],
                ["classical","Classical","Contemporary classical, chamber, minimal."],
                ["techno","Techno","Detroit, Berlin, 303/909."],
                ["dnb","Drum & Bass","Jungle, breakbeats, 170 BPM."],
                ["dubstep","Dubstep","2006 Croydon, weight, half-step."],
                ["shoegaze","Shoegaze","Boards, reverb, My Bloody Valentine."],
                ["dreampop","Dream Pop","Cocteau Twins, Beach House, haze."],
                ["metal","Metal","Doom, black, sludge, riffs."],
                ["hardcore","Hardcore","Youth crew, powerviolence, breakdowns."],
                ["emo","Emo","Midwest, screamo, bedroom emo."],
                ["post-rock","Post-Rock","Godspeed, Talk Talk, crescendos."],
                ["krautrock","Krautrock","Can, Neu!, motorik."],
                ["psychedelia","Psychedelia","Psych rock, 60s revival, jam."],
                ["synthpop","Synthpop","Analog synths, Depeche Mode, city lights."],
                ["vaporwave","Vaporwave","Mallsoft, slowed, 90s web."],
                ["hyperpop","Hyperpop","PC Music, digi-core, 160 BPM."],
                ["city-pop","City Pop","80s Japan, Tatsuro Yamashita, FM."],
                ["disco","Disco / Funk","Chic, Prelude, boogie edits."],
                ["afrobeat","Afrobeat","Fela, contemporary Afro-fusion."],
                ["reggae","Reggae / Dub","King Tubby, dubplates."],
                ["country","Country","Outlaw, alt-country, songwriter."],
            ]
            return self.send_json([{"slug":s,"name":n,"desc":d} for s,n,d in genres])
        if path=="/api/genres":
            rows=con.execute("SELECT genre, COUNT(*) as count FROM tracks GROUP BY genre").fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/import/spotify"):
            url=qs.get("url",[""])[0]
            if not url: return self.send_json({"error":"url required"},400)
            is_album = "/album/" in url
            is_artist = "/artist/" in url
            try:
                oembed="https://open.spotify.com/oembed?url="+urllib.parse.quote(url, safe='')
                with urllib.request.urlopen(oembed, timeout=6) as resp:
                    data=json.loads(resp.read().decode())
                    out={"provider":"spotify","title":data.get("title"),"artist":data.get("author_name"),"is_album":is_album,"is_artist":is_artist,"raw":data}
                    if is_artist:
                        # artist URL: title is artist name, author_name may be "Spotify"
                        out["artist_name"]=data.get("title")
                        out["hint"]="Spotify artist import gives name and cover only. Bio/genres need manual wiki edit."
                    elif is_album:
                        out["hint"]="Spotify album import via oEmbed gives title/artist only. Tracklist needs Spotify API. Use Apple Music for full album track import, or paste tracklist manually."
                    return self.send_json(out)
            except Exception as e:
                return self.send_json({"error":str(e),"hint":"Paste a public Spotify track/album/artist URL. We use oEmbed, no API key."},502)
        if path.startswith("/api/import/apple"):
            url=qs.get("url",[""])[0]
            term=qs.get("term",[""])[0]
            want_album = qs.get("album",["0"])[0]=="1" or "album" in url
            want_artist = qs.get("artist",["0"])[0]=="1" or "/artist/" in url
            if url and "music.apple.com" in url:
                m=re.search(r"/album/[^/]+/(\d+)", url)
                m2=re.search(r"[?&]i=(\d+)", url)
                m_artist=re.search(r"/artist/[^/]+/(\d+)", url)
                if m_artist:
                    try:
                        api=f"https://itunes.apple.com/lookup?id={m_artist.group(1)}"
                        with urllib.request.urlopen(api, timeout=6) as resp:
                            j=json.loads(resp.read().decode())
                            results=j.get("results",[])
                            artist=results[0] if results else None
                            # try also search for artist details via search
                            return self.send_json({"provider":"apple","artist":artist,"results":results, "is_artist":True})
                    except Exception as e: return self.send_json({"error":str(e)},502)
                if m:
                    try:
                        api=f"https://itunes.apple.com/lookup?id={m.group(1)}&entity=song"
                        with urllib.request.urlopen(api, timeout=8) as resp:
                            j=json.loads(resp.read().decode())
                            results=j.get("results",[])
                            album=results[0] if results else None
                            tracks=[r for r in results if r.get("wrapperType")=="track"]
                            return self.send_json({"provider":"apple","album":album,"tracks":tracks,"results":results})
                    except Exception as e: return self.send_json({"error":str(e)},502)
                if m2:
                    try:
                        api=f"https://itunes.apple.com/lookup?id={m2.group(1)}"
                        with urllib.request.urlopen(api, timeout=6) as resp:
                            j=json.loads(resp.read().decode()); return self.send_json({"provider":"apple","results":j.get("results",[])})
                    except Exception as e: return self.send_json({"error":str(e)},502)
            if term:
                try:
                    api="https://itunes.apple.com/search?term="+urllib.parse.quote(term)+"&media=music&limit=10"
                    if want_album:
                        api="https://itunes.apple.com/search?term="+urllib.parse.quote(term)+"&media=music&entity=album&limit=10"
                    elif want_artist:
                        api="https://itunes.apple.com/search?term="+urllib.parse.quote(term)+"&media=music&entity=musicArtist&limit=5"
                    with urllib.request.urlopen(api, timeout=6) as resp:
                        j=json.loads(resp.read().decode()); return self.send_json({"provider":"apple","results":j.get("results",[]), "tracks":[]})
                except Exception as e: return self.send_json({"error":str(e)},502)
            return self.send_json({"error":"Provide ?url= Apple Music album/track/artist link or ?term= search. Add &album=1 or &artist=1 for specific search."},400)
        if path.startswith("/api/albums/") and path.endswith("/tracks"):
            try: aid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            rows=con.execute("SELECT * FROM tracks WHERE album_id=? ORDER BY datetime(createdAt) ASC",(aid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/albums/"):
            ident=urllib.parse.unquote(path[len("/api/albums/"):])
            if ident and "/" not in ident:
                try: aid=int(ident)
                except: row=con.execute("SELECT * FROM albums WHERE title=?",(ident,)).fetchone()
                else: row=con.execute("SELECT * FROM albums WHERE id=?",(aid,)).fetchone()
                if row: return self.send_json(dict(row))
                return self.send_json({"error":"not found"},404)
        if path=="/api/albums":
            q=qs.get("q",[""])[0]
            artist=qs.get("artist",[""])[0]
            if q: rows=con.execute("SELECT * FROM albums WHERE title LIKE ? OR artist_name LIKE ? ORDER BY year DESC",(f"%{q}%",f"%{q}%")).fetchall()
            elif artist: rows=con.execute("SELECT * FROM albums WHERE artist_name=? ORDER BY year DESC",(artist,)).fetchall()
            else: rows=con.execute("SELECT * FROM albums ORDER BY datetime(createdAt) DESC LIMIT 100").fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/threads/") and path.endswith("/posts"):
            try: tid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            rows=con.execute("SELECT * FROM thread_posts WHERE thread_id=? ORDER BY datetime(createdAt) ASC",(tid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/threads/"):
            try: tid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            row=con.execute("SELECT * FROM genre_threads WHERE id=?",(tid,)).fetchone()
            if not row: self.send_error(404); return
            posts=con.execute("SELECT * FROM thread_posts WHERE thread_id=? ORDER BY datetime(createdAt) ASC",(tid,)).fetchall()
            d=dict(row); d["posts"]=[dict(p) for p in posts]
            return self.send_json(d)
        if path.startswith("/api/genres/") and path.endswith("/threads"):
            genre=urllib.parse.unquote(path[len("/api/genres/"):-len("/threads")])
            rows=con.execute("SELECT * FROM genre_threads WHERE genre=? ORDER BY datetime(createdAt) DESC",(genre,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path=="/api/tracks":
            genre=qs.get("genre",["all"])[0]
            q=qs.get("q",[""])[0]
            sort=qs.get("sort",["newest"])[0]
            artist=qs.get("artist",[""])[0]
            album=qs.get("album",[""])[0]
            sql="SELECT t.*, a.bio as artist_bio FROM tracks t LEFT JOIN artists a ON t.artist_id=a.id WHERE 1=1"
            params=[]
            if genre and genre!="all": sql+=" AND t.genre=?"; params.append(genre)
            if artist: sql+=" AND t.artist_name=?"; params.append(artist)
            if album: sql+=" AND t.album_id=?"; params.append(int(album) if album.isdigit() else album)
            if q: sql+=" AND (t.title LIKE ? OR t.artist_name LIKE ? OR t.tags LIKE ? OR t.description LIKE ?)"; params.extend([f"%{q}%",f"%{q}%",f"%{q}%",f"%{q}%"])
            if sort=="plays": sql+=" ORDER BY t.plays DESC"
            elif sort=="likes": sql+=" ORDER BY t.likes DESC"
            else: sql+=" ORDER BY datetime(t.createdAt) DESC"
            rows=con.execute(sql,params).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/tracks/") and path.endswith("/stream"):
            try: tid=int(path.split("/")[3])
            except: self.send_error(404); return
            row=con.execute("SELECT * FROM tracks WHERE id=?",(tid,)).fetchone()
            if not row: self.send_error(404); return
            fpath=UPLOADS/row["filename"]
            if not fpath.exists(): self.send_error(404); return
            con.execute("UPDATE tracks SET plays=plays+1 WHERE id=?",(tid,)); con.commit()
            size=fpath.stat().st_size
            ctype=row["mimetype"] or "audio/wav"
            rh=self.headers.get("Range")
            if not rh:
                self.send_response(200)
                self.send_header("Content-Type",ctype)
                self.send_header("Content-Length",str(size))
                self.send_header("Accept-Ranges","bytes")
                self.send_header("Access-Control-Allow-Origin","*")
                self.end_headers()
                self.wfile.write(fpath.read_bytes())
            else:
                parts=rh.replace("bytes=","").split("-")
                start=int(parts[0]) if parts[0] else 0
                end=int(parts[1]) if len(parts)>1 and parts[1] else size-1
                chunk=end-start+1
                self.send_response(206)
                self.send_header("Content-Type",ctype)
                self.send_header("Content-Range",f"bytes {start}-{end}/{size}")
                self.send_header("Accept-Ranges","bytes")
                self.send_header("Content-Length",str(chunk))
                self.send_header("Access-Control-Allow-Origin","*")
                self.end_headers()
                with open(fpath,"rb") as f: f.seek(start); self.wfile.write(f.read(chunk))
            return
        if path.startswith("/api/tracks/") and path.endswith("/comments"):
            try: tid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            rows=con.execute("SELECT * FROM track_comments WHERE trackId=? ORDER BY datetime(createdAt) ASC",(tid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/tracks/") and path.endswith("/download"):
            try: tid=int(path.split("/")[3])
            except: self.send_error(404); return
            row=con.execute("SELECT * FROM tracks WHERE id=?",(tid,)).fetchone()
            if not row: self.send_error(404); return
            fpath=UPLOADS/row["filename"]
            con.execute("UPDATE tracks SET downloads=downloads+1 WHERE id=?",(tid,)); con.commit()
            self.send_response(200)
            self.send_header("Content-Type","application/octet-stream")
            self.send_header("Content-Disposition",f'attachment; filename="{row["filename"]}"')
            self.send_header("Content-Length",str(fpath.stat().st_size))
            self.end_headers()
            self.wfile.write(fpath.read_bytes())
            return
        if path.startswith("/api/tracks/"):
            try: tid=int(path.split("/")[3])
            except: pass
            else:
                row=con.execute("SELECT * FROM tracks WHERE id=?",(tid,)).fetchone()
                if row: return self.send_json(dict(row))
        if path.startswith("/api/artists/") and path.endswith("/edits"):
            try: aid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            rows=con.execute("SELECT * FROM artist_edits WHERE artist_id=? ORDER BY datetime(createdAt) DESC",(aid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/artists/") and path.endswith("/albums"):
            ident=urllib.parse.unquote(path[len("/api/artists/"):-len("/albums")])
            try: aid=int(ident)
            except: rows=con.execute("SELECT * FROM albums WHERE artist_name=? ORDER BY year DESC",(ident,)).fetchall()
            else: rows=con.execute("SELECT * FROM albums WHERE artist_id=? ORDER BY year DESC",(aid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/artists/") and path.endswith("/tracks"):
            ident=urllib.parse.unquote(path[len("/api/artists/"):-len("/tracks")])
            try: aid=int(ident)
            except: rows=con.execute("SELECT * FROM tracks WHERE artist_name=? ORDER BY datetime(createdAt) DESC",(ident,)).fetchall()
            else: rows=con.execute("SELECT * FROM tracks WHERE artist_id=? ORDER BY datetime(createdAt) DESC",(aid,)).fetchall()
            return self.send_json([dict(r) for r in rows])
        if path.startswith("/api/artists/"):
            ident=urllib.parse.unquote(path[len("/api/artists/"):])
            if ident and "/" not in ident:
                try: aid=int(ident)
                except: row=con.execute("SELECT * FROM artists WHERE name=?",(ident,)).fetchone()
                else: row=con.execute("SELECT * FROM artists WHERE id=?",(aid,)).fetchone()
                if row: return self.send_json(dict(row))
                return self.send_json({"error":"not found"},404)
        if path=="/api/artists":
            q=qs.get("q",[""])[0]
            sort=qs.get("sort",["name"])[0]
            if q: rows=con.execute("SELECT * FROM artists WHERE name LIKE ? OR bio LIKE ? ORDER BY name",(f"%{q}%",f"%{q}%")).fetchall()
            elif sort=="popular": rows=con.execute("""SELECT a.*, COUNT(t.id) as trackCount FROM artists a LEFT JOIN tracks t ON t.artist_id=a.id GROUP BY a.id ORDER BY trackCount DESC, a.name""").fetchall()
            else: rows=con.execute("SELECT * FROM artists ORDER BY name").fetchall()
            out=[]
            for r in rows:
                d=dict(r)
                if "trackCount" not in d:
                    d["trackCount"]=con.execute("SELECT COUNT(*) FROM tracks WHERE artist_id=? OR artist_name=?",(r["id"],r["name"])).fetchone()[0]
                out.append(d)
            return self.send_json(out)
        if path=="/api/health": return self.send_json({"ok":True,"time":datetime.datetime.now().isoformat()})
        if path=="/api/rulebook":
            return self.send_json({
                "title":"House Rules & Terms",
                "sections":[
                    {"h":"1. No AI Music","p":"Every upload must be human-performed, composed, or curated. Fully synthetic tracks generated by text-to-music, voice cloning, or diffusion models are prohibited. AI-assisted tools (e.g., mastering assist, stem separation for sampling you own) are allowed only if disclosed in the credits field. Violations are removed and repeat offenders banned."},
                    {"h":"2. Rights & Provenance","p":"Only upload what you own or have permission to share. No re-uploads of commercial catalog you do not control. Provide credits: who played what, where recorded, and source of samples. Use the description field to cite lineage like [original tape], [Bandcamp], or [personal collection]."},
                    {"h":"3. Wiki Edits","p":"Artist pages are wiki-style. Be specific, cite a source or mark [personal knowledge]. No meme edits, no blanking, no promotional spam. Each edit is logged in artist_edits with editor and diff. Vandalism is reverted."},
                    {"h":"4. Genre Boards","p":"Each genre is a niche with its own discussion. Keep threads on topic. Cross-posting the same promo across boards is spam."},
                    {"h":"5. Albums & Imports","p":"You may create an Album first, then attach tracks to it. Imports from Apple Music / Spotify via oEmbed / iTunes Search are for metadata only — you must still upload an audio file you own. Pasting a store link does not transfer rights."},
                    {"h":"6. Community Conduct","p":"One account per person, no bots, no inflated plays. Be respectful, no harassment, no hate. Moderators may hide comments or lock threads."},
                    {"h":"7. Privacy & Data","p":"Local files stay in IndexedDB until you publish. Published audio lives in ./uploads on this server. Play counts and likes are public. We store no tracking cookies beyond your auth token."},
                    {"h":"8. Takedown","p":"Rights holders can request removal by contacting the instance operator with proof. We comply promptly."},
                ],
                "note":"By signing in you agree to these terms. This is a community archive, not a streaming service. We are building a Wikipedia for music niches, artist by artist."
            })
        rel=path.lstrip("/")
        if rel=="" or rel=="index.html": rel="index.html"
        fpath=(PUBLIC/rel).resolve()
        if not str(fpath).startswith(str(PUBLIC.resolve())): self.send_error(403); return
        if fpath.is_dir(): fpath=fpath/"index.html"
        if not fpath.exists():
            if "text/html" in self.headers.get("Accept",""): fpath=PUBLIC/"index.html"
            else: self.send_error(404); return
        ctype,_=mimetypes.guess_type(str(fpath)); ctype=ctype or "application/octet-stream"
        data=fpath.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type",ctype)
        self.send_header("Content-Length",str(len(data)))
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(data)
    def do_POST(self):
        import json as _json
        p=urllib.parse.urlparse(self.path); path=p.path
        if path=="/api/auth/register":
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            username=(data.get("username") or "").strip()
            password=data.get("password") or ""
            if not username or len(username)<3 or len(username)>20 or not re.match(r"^[A-Za-z0-9_-]+$",username): return self.send_json({"error":"username 3-20 alnum/_/-"},400)
            if len(password)<4: return self.send_json({"error":"password too short"},400)
            try: con.execute("INSERT INTO users (username,password_hash) VALUES (?,?)",(username,hash_pw(password))); con.commit()
            except sqlite3.IntegrityError: return self.send_json({"error":"username taken"},409)
            return self.send_json({"token":make_token(username),"username":username})
        if path=="/api/auth/login":
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            username=(data.get("username") or "").strip(); password=data.get("password") or ""
            row=con.execute("SELECT * FROM users WHERE username=?",(username,)).fetchone()
            if not row or row["password_hash"]!=hash_pw(password): return self.send_json({"error":"invalid username or password"},401)
            return self.send_json({"token":make_token(username),"username":username})
        if path.startswith("/api/albums"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            if path=="/api/albums":
                length=int(self.headers.get("Content-Length",0))
                data=_json.loads(self.rfile.read(length) or b"{}")
                title=(data.get("title") or "").strip()
                artist_name=(data.get("artist") or "").strip()
                if not title or not artist_name: return self.send_json({"error":"title and artist required"},400)
                # find artist
                row=con.execute("SELECT * FROM artists WHERE name=?",(artist_name,)).fetchone()
                aid=row["id"] if row else None
                if not row:
                    cur=con.execute("INSERT INTO artists (name,createdBy) VALUES (?,?)",(artist_name,u["username"]))
                    aid=cur.lastrowid
                year=data.get("year")
                try: year=int(year) if year else None
                except: year=None
                cur=con.execute("INSERT INTO albums (artist_id,artist_name,title,year,genre,label,description,cover_url,createdBy) VALUES (?,?,?,?,?,?,?,?,?)",(aid,artist_name,title[:120],year,(data.get("genre") or "").strip()[:80],(data.get("label") or "").strip()[:120],(data.get("description") or "").strip()[:2000],(data.get("cover_url") or "").strip()[:500],u["username"])); con.commit()
                row=con.execute("SELECT * FROM albums WHERE id=?",(cur.lastrowid,)).fetchone()
                return self.send_json(dict(row),201)
        if path.startswith("/api/artists/") and path.endswith("/edit"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            try: aid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            allowed=["bio","location","genres","formed_year","name","members","label","website"]
            row=con.execute("SELECT * FROM artists WHERE id=?",(aid,)).fetchone()
            if not row: return self.send_json({"error":"not found"},404)
            updates=[]; params=[]
            for k in allowed:
                if k in data:
                    old=row[k] if k in row.keys() else None
                    new=data[k]
                    if str(old)!=str(new):
                        con.execute("INSERT INTO artist_edits (artist_id,editor,field,old_value,new_value) VALUES (?,?,?,?,?)",(aid,u["username"],k,str(old),str(new)))
                        updates.append(f"{k}=?"); params.append(new)
            if updates:
                params.append(aid)
                con.execute(f"UPDATE artists SET {', '.join(updates)}, updatedAt=datetime('now') WHERE id=?", params); con.commit()
            row2=con.execute("SELECT * FROM artists WHERE id=?",(aid,)).fetchone()
            return self.send_json(dict(row2))
        if path=="/api/artists":
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            name=(data.get("name") or "").strip()
            if not name or len(name)>80: return self.send_json({"error":"name required"},400)
            bio=(data.get("bio") or "").strip()[:4000]
            loc=(data.get("location") or "").strip()[:120]
            genres=(data.get("genres") or "").strip()[:200]
            members=(data.get("members") or "").strip()[:400]
            label=(data.get("label") or "").strip()[:120]
            website=(data.get("website") or "").strip()[:200]
            fy=data.get("formed_year")
            try: fy=int(fy) if fy else None
            except: fy=None
            try: cur=con.execute("INSERT INTO artists (name,bio,location,genres,formed_year,members,label,website,createdBy) VALUES (?,?,?,?,?,?,?,?,?)",(name,bio,loc,genres,fy,members,label,website,u["username"])); con.commit()
            except sqlite3.IntegrityError: return self.send_json({"error":"artist exists"},409)
            row=con.execute("SELECT * FROM artists WHERE id=?",(cur.lastrowid,)).fetchone()
            return self.send_json(dict(row),201)
        if path=="/api/tracks":
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            ctype=self.headers.get("Content-Type","")
            if "multipart/form-data" not in ctype: return self.send_json({"error":"multipart required"},400)
            form=cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST','CONTENT_TYPE':ctype})
            title=(form.getvalue("title") or "").strip()[:120]
            artist_name=(form.getvalue("artist") or "").strip()[:80]
            genre=(form.getvalue("genre") or "other").strip()
            year=form.getvalue("year"); tags=(form.getvalue("tags") or "").strip()[:300]
            no_ai=form.getvalue("no_ai")
            description=(form.getvalue("description") or "").strip()[:2000]
            credits=(form.getvalue("credits") or "").strip()[:1000]
            album_id=form.getvalue("album_id")
            if not title or not artist_name: return self.send_json({"error":"title and artist required"},400)
            if no_ai not in ("on","true"): return self.send_json({"error":"You must confirm this is not AI-generated music. See Rulebook."},400)
            fileitem=form["audio"] if "audio" in form else None
            # allow import without file if cover/description only? require file for now but allow missing if import
            if fileitem is None or not fileitem.filename:
                # check if this is import-only track (no file) - we still require file; return error
                return self.send_json({"error":"audio file required"},400)
            row=con.execute("SELECT * FROM artists WHERE name=?",(artist_name,)).fetchone()
            aid=None
            if row: aid=row["id"]
            else:
                cur2=con.execute("INSERT INTO artists (name,createdBy) VALUES (?,?)",(artist_name,u["username"])); aid=cur2.lastrowid
            # validate album
            if album_id:
                try: album_id=int(album_id)
                except: album_id=None
                if album_id and not con.execute("SELECT 1 FROM albums WHERE id=?",(album_id,)).fetchone():
                    album_id=None
            else: album_id=None
            safe=f"{int(datetime.datetime.now().timestamp())}-{pathlib.Path(fileitem.filename).name.replace('/','_')}"
            safe="".join(c if c.isalnum() or c in ".-_" else "_" for c in safe)
            data=fileitem.file.read()
            if len(data)>50*1024*1024: return self.send_json({"error":"file too large"},400)
            (UPLOADS/safe).write_bytes(data)
            mtype,_=mimetypes.guess_type(safe)
            try: y=int(year) if year else None
            except: y=None
            # try to get duration via header? store null, client will probe
            cur=con.execute("INSERT INTO tracks (title,artist_id,artist_name,genre,year,tags,filename,mimetype,size,uploader,album_id,description,credits) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",(title,aid,artist_name,genre,y,tags,safe,mtype or "audio/wav",len(data),u["username"],album_id,description,credits)); con.commit()
            row=con.execute("SELECT * FROM tracks WHERE id=?",(cur.lastrowid,)).fetchone()
            return self.send_json(dict(row),201)
        if path.startswith("/api/tracks/") and path.endswith("/like"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            try: tid=int(path.split("/")[3])
            except: self.send_error(404); return
            con.execute("UPDATE tracks SET likes=likes+1 WHERE id=?",(tid,)); con.commit()
            row=con.execute("SELECT likes FROM tracks WHERE id=?",(tid,)).fetchone()
            return self.send_json(dict(row) if row else {"likes":0})
        if path.startswith("/api/tracks/") and path.endswith("/comments"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            try: tid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            text=(data.get("text") or "").strip()[:500]
            if not text: return self.send_json({"error":"text required"},400)
            cur=con.execute("INSERT INTO track_comments (trackId,author,text) VALUES (?,?,?)",(tid,u["username"],text)); con.commit()
            row=con.execute("SELECT * FROM track_comments WHERE id=?",(cur.lastrowid,)).fetchone()
            return self.send_json(dict(row),201)
        if path.startswith("/api/genres/") and path.endswith("/threads"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            genre=urllib.parse.unquote(path[len("/api/genres/"):-len("/threads")])
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            title=(data.get("title") or "").strip()[:120]
            body=(data.get("body") or "").strip()[:3000]
            if not title: return self.send_json({"error":"title required"},400)
            cur=con.execute("INSERT INTO genre_threads (genre,title,body,author) VALUES (?,?,?,?)",(genre,title,body,u["username"])); con.commit()
            row=con.execute("SELECT * FROM genre_threads WHERE id=?",(cur.lastrowid,)).fetchone()
            return self.send_json(dict(row),201)
        if path.startswith("/api/threads/") and path.endswith("/posts"):
            u=auth_user(self)
            if not u: return self.send_json({"error":"login required"},401)
            try: tid=int(path.split("/")[3])
            except: return self.send_json({"error":"bad id"},400)
            length=int(self.headers.get("Content-Length",0))
            data=_json.loads(self.rfile.read(length) or b"{}")
            body=(data.get("body") or "").strip()[:2000]
            if not body: return self.send_json({"error":"body required"},400)
            cur=con.execute("INSERT INTO thread_posts (thread_id,author,body) VALUES (?,?,?)",(tid,u["username"],body)); con.commit()
            row=con.execute("SELECT * FROM thread_posts WHERE id=?",(cur.lastrowid,)).fetchone()
            return self.send_json(dict(row),201)
        self.send_error(404)
    def do_PUT(self):
        p=urllib.parse.urlparse(self.path)
        if p.path.startswith("/api/artists/"): return self.do_POST()
        self.send_error(404)

if __name__=="__main__":
    print(f"MUSiCPK on http://localhost:{PORT}")
    HTTPServer(("0.0.0.0",PORT), Handler).serve_forever()
