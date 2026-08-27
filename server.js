/* MUSiCPK — Node fallback, mirrors py_server.py
   No fake tracks. Auth required. Artist wiki. No AI music.
*/
"use strict";
const express=require("express"), path=require("path"), fs=require("fs"), multer=require("multer"), sqlite3=require("sqlite3").verbose(), cors=require("cors"), crypto=require("crypto");
const PORT=process.env.PORT||3000, DB_PATH=path.join(__dirname,"disc.db"), UPLOAD_DIR=path.join(__dirname,"uploads");
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true});
const db=new sqlite3.Database(DB_PATH);
function init(){
  db.serialize(()=>{
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, bio TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS artists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, bio TEXT DEFAULT '', location TEXT DEFAULT '', genres TEXT DEFAULT '', formed_year INTEGER, createdBy TEXT, updatedAt TEXT DEFAULT (datetime('now')), createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, artist_id INTEGER, artist_name TEXT NOT NULL, genre TEXT, year INTEGER, tags TEXT, filename TEXT NOT NULL, mimetype TEXT, size INTEGER, uploader TEXT, plays INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, downloads INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS genre_threads (id INTEGER PRIMARY KEY AUTOINCREMENT, genre TEXT NOT NULL, title TEXT NOT NULL, body TEXT, author TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS thread_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id INTEGER NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS track_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, trackId INTEGER NOT NULL, author TEXT NOT NULL, text TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS artist_edits (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER NOT NULL, editor TEXT NOT NULL, field TEXT, old_value TEXT, new_value TEXT, createdAt TEXT DEFAULT (datetime('now')))`);
  });
  db.get("SELECT COUNT(*) as c FROM artists",(e,r)=>{
    if(r.c===0){
      const shells=[["Radiohead","English rock band formed in Abingdon, Oxfordshire, in 1985.","Oxford, UK","alternative, experimental",1985],["Aphex Twin","Richard D. James, electronic musician.","Cornwall, UK","electronic, ambient, idm",1985],["Bjork","Icelandic singer, songwriter and producer.","Reykjavik, IS","art pop, electronic, experimental",1977],["MF DOOM","British-American rapper and producer.","London / New York","hip hop, underground",1988],["Boards of Canada","Scottish electronic duo.","Edinburgh, UK","ambient, electronica, downtempo",1986]];
      shells.forEach(s=> db.run("INSERT OR IGNORE INTO artists (name,bio,location,genres,formed_year,createdBy) VALUES (?,?,?,?,?,?)",[...s,"system"]));
      console.log("[db] created 5 wiki shells");
    }
  });
}
init();
const hash=p=> crypto.createHash("sha256").update(p).digest("hex");
const tokenFor=u=> Buffer.from(u).toString("base64");
const userFromToken=t=>{ try{ const u=Buffer.from(t,"base64").toString(); let row=null; db.get("SELECT * FROM users WHERE username=?",[u],(e,r)=> row=r); return row; }catch{ return null; } };
function auth(req){
  const h=req.headers.authorization||"";
  if(h.startsWith("Bearer ")){
    try{ const u=Buffer.from(h.slice(7),"base64").toString(); return new Promise((res)=> db.get("SELECT * FROM users WHERE username=?",[u],(e,r)=> res(r||null))); }catch{ return Promise.resolve(null); }
  }
  return Promise.resolve(null);
}
const storage=multer.diskStorage({destination:(r,f,cb)=>cb(null,UPLOAD_DIR), filename:(r,f,cb)=> cb(null, Date.now()+"-"+f.originalname.replace(/[^a-zA-Z0-9.\-_]/g,"_"))});
const upload=multer({storage, limits:{fileSize:50*1024*1024}, fileFilter:(r,f,cb)=> f.mimetype.startsWith("audio/")||/\.(mp3|wav|ogg|m4a|flac)$/i.test(f.originalname) ? cb(null,true): cb(new Error("only audio"))});
const app=express();
app.use(cors()); app.use(express.json()); app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public"))); app.use("/uploads",express.static(UPLOAD_DIR));
app.post("/api/auth/register",(req,res)=>{
  const {username,password}=req.body; if(!username||username.length<3||!/^[A-Za-z0-9_-]+$/.test(username)) return res.status(400).json({error:"username 3-20 alnum/_/-"}); if(!password||password.length<4) return res.status(400).json({error:"password min 4"});
  db.run("INSERT INTO users (username,password_hash) VALUES (?,?)",[username,hash(password)],function(e){ if(e) return res.status(409).json({error:"username taken"}); res.json({token:tokenFor(username),username}); });
});
app.post("/api/auth/login",(req,res)=>{
  const {username,password}=req.body; db.get("SELECT * FROM users WHERE username=?",[username],(e,r)=>{ if(!r||r.password_hash!==hash(password)) return res.status(401).json({error:"invalid username or password"}); res.json({token:tokenFor(username),username}); });
});
app.get("/api/me",async (req,res)=>{ const u=await auth(req); if(!u) return res.status(401).json({error:"not authenticated"}); res.json({username:u.username,bio:u.bio,createdAt:u.createdAt}); });
app.get("/api/rulebook",(req,res)=> res.json({title:"House Rules", rules:["No artificial intelligence generated music. Every upload must be performed, composed, or curated by a human. AI-assisted mastering is allowed if disclosed, but fully synthetic tracks will be removed.","Credit your sources. If you upload a track for an artist niche, make sure you have permission or it is your own work. Do not re-upload commercial releases you do not own.","Be specific in wiki edits. Cite a source or note [personal collection] for artist info. Vandalism or meme edits will be reverted.","Keep genre boards on topic. Each genre has its own discussion - save cross-genre debate for the thread it belongs to.","No fake accounts or inflated plays. One login per person, no bots."], note:"This is a community archive, not a streaming service. We are building a Wikipedia for music niches, artist by artist."}));
app.get("/api/genres/list",(req,res)=> res.json([["lofi","Lofi","Tape hiss, bedroom 4-track, MiniDisc."],["chiptune","Chiptune","Game Boy, LSDJ, trackers, FM chips."],["indie","Indie","Jangle, DIY, small rooms."],["house","House","Club, 909, basement."],["ambient","Ambient","Drone, field recordings, room tone."],["experimental","Experimental","Noise, synthesis, chance."],["folk","Folk","Acoustic, songs, close mics."],["punk","Punk","Fast, short, live."],["hip-hop","Hip Hop","Boom bap, sampling, MPC."],["rnb","R&B","Soul, modern R&B, bedroom soul."],["soul","Soul","Vintage soul, gospel, northern soul."],["jazz","Jazz","Improvisation, Blue Note, spiritual jazz."],["classical","Classical","Contemporary classical, chamber, minimal."],["techno","Techno","Detroit, Berlin, 303/909."],["dnb","Drum & Bass","Jungle, breakbeats, 170 BPM."],["dubstep","Dubstep","2006 Croydon, weight, half-step."],["shoegaze","Shoegaze","Boards, reverb, My Bloody Valentine."],["dreampop","Dream Pop","Cocteau Twins, Beach House, haze."],["metal","Metal","Doom, black, sludge, riffs."],["hardcore","Hardcore","Youth crew, powerviolence, breakdowns."],["emo","Emo","Midwest, screamo, bedroom emo."],["post-rock","Post-Rock","Godspeed, Talk Talk, crescendos."],["krautrock","Krautrock","Can, Neu!, motorik."],["psychedelia","Psychedelia","Psych rock, 60s revival, jam."],["synthpop","Synthpop","Analog synths, Depeche Mode, city lights."],["vaporwave","Vaporwave","Mallsoft, slowed, 90s web."],["hyperpop","Hyperpop","PC Music, digi-core, 160 BPM."],["city-pop","City Pop","80s Japan, Tatsuro Yamashita, FM."],["disco","Disco / Funk","Chic, Prelude, boogie edits."],["afrobeat","Afrobeat","Fela, contemporary Afro-fusion."],["reggae","Reggae / Dub","King Tubby, dubplates."],["country","Country","Outlaw, alt-country, songwriter."]].map(([slug,name,desc])=>({slug,name,desc}))));
app.get("/api/artists",(req,res)=>{
  const {q,sort}=req.query; let sql="SELECT * FROM artists", params=[];
  if(q){ sql+=" WHERE name LIKE ? OR bio LIKE ?"; params.push(`%${q}%`,`%${q}%`); sql+=" ORDER BY name"; }
  else if(sort==="popular"){ sql="SELECT a.*, COUNT(t.id) as trackCount FROM artists a LEFT JOIN tracks t ON t.artist_id=a.id GROUP BY a.id ORDER BY trackCount DESC, a.name"; }
  else sql+=" ORDER BY name";
  db.all(sql,params,(e,rows)=>{
    if(e) return res.status(500).json({error:e.message});
    // add count if missing
    if(!rows.length||rows[0].trackCount===undefined){
      let pending=rows.length; if(!pending) return res.json([]); rows.forEach(r=>{
        db.get("SELECT COUNT(*) as c FROM tracks WHERE artist_id=? OR artist_name=?",[r.id,r.name],(e2,c)=>{ r.trackCount=c.c; if(--pending===0) res.json(rows); });
      });
    } else res.json(rows);
  });
});
app.get("/api/artists/:id",(req,res)=>{
  const ident=req.params.id; const tryId=parseInt(ident,10);
  const sql=isNaN(tryId)? "SELECT * FROM artists WHERE name=?": "SELECT * FROM artists WHERE id=?";
  db.get(sql,[ident],(e,r)=> r? res.json(r): res.status(404).json({error:"not found"}));
});
app.get("/api/artists/:id/tracks",(req,res)=>{
  const ident=req.params.id; const tryId=parseInt(ident,10);
  const sql=isNaN(tryId)? "SELECT * FROM tracks WHERE artist_name=? ORDER BY datetime(createdAt) DESC": "SELECT * FROM tracks WHERE artist_id=? ORDER BY datetime(createdAt) DESC";
  db.all(sql,[ident],(e,rows)=> res.json(rows||[]));
});
app.get("/api/artists/:id/edits",(req,res)=> db.all("SELECT * FROM artist_edits WHERE artist_id=? ORDER BY datetime(createdAt) DESC",[req.params.id],(e,rows)=> res.json(rows||[])));
app.post("/api/artists",async (req,res)=>{
  const u=await auth(req); if(!u) return res.status(401).json({error:"login required"});
  const {name,bio,location,genres,formed_year}=req.body; if(!name) return res.status(400).json({error:"name required"});
  db.run("INSERT INTO artists (name,bio,location,genres,formed_year,createdBy) VALUES (?,?,?,?,?,?)",[name.trim(),(bio||"").slice(0,2000),(location||"").slice(0,120),(genres||"").slice(0,200), formed_year?parseInt(formed_year,10):null, u.username], function(e){ if(e) return res.status(409).json({error:"artist exists"}); db.get("SELECT * FROM artists WHERE id=?",[this.lastID],(e2,r)=> res.status(201).json(r)); });
});
app.post("/api/artists/:id/edit",async (req,res)=>{
  const u=await auth(req); if(!u) return res.status(401).json({error:"login required"});
  const aid=req.params.id; db.get("SELECT * FROM artists WHERE id=?",[aid],(e,row)=>{
    if(!row) return res.status(404).json({error:"not found"});
    const fields=["bio","location","genres","formed_year","name"]; let updates=[], params=[];
    fields.forEach(k=>{ if(k in req.body){ const old=row[k]; const nw=req.body[k]; if(String(old)!==String(nw)){ db.run("INSERT INTO artist_edits (artist_id,editor,field,old_value,new_value) VALUES (?,?,?,?,?)",[aid,u.username,k,String(old),String(nw)]); updates.push(`${k}=?`); params.push(nw); } } });
    if(!updates.length) return res.json(row);
    params.push(aid); db.run(`UPDATE artists SET ${updates.join(", ")}, updatedAt=datetime('now') WHERE id=?`,params,()=> db.get("SELECT * FROM artists WHERE id=?",[aid],(e2,r2)=> res.json(r2)));
  });
});
app.get("/api/tracks",(req,res)=>{
  const {genre,q,sort,artist}=req.query; let sql="SELECT t.*, a.bio as artist_bio FROM tracks t LEFT JOIN artists a ON t.artist_id=a.id WHERE 1=1", params=[];
  if(genre&&genre!=="all"){ sql+=" AND t.genre=?"; params.push(genre); }
  if(artist){ sql+=" AND t.artist_name=?"; params.push(artist); }
  if(q){ sql+=" AND (t.title LIKE ? OR t.artist_name LIKE ? OR t.tags LIKE ?)"; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  if(sort==="plays") sql+=" ORDER BY t.plays DESC"; else if(sort==="likes") sql+=" ORDER BY t.likes DESC"; else sql+=" ORDER BY datetime(t.createdAt) DESC";
  db.all(sql,params,(e,rows)=> res.json(rows||[]));
});
app.get("/api/tracks/:id",(req,res)=> db.get("SELECT * FROM tracks WHERE id=?",[req.params.id],(e,r)=> r? res.json(r): res.status(404).json({error:"not found"})));
app.get("/api/tracks/:id/stream",(req,res)=>{
  db.get("SELECT * FROM tracks WHERE id=?",[req.params.id],(e,row)=>{
    if(!row) return res.status(404).end();
    const fp=path.join(UPLOAD_DIR,row.filename); if(!fs.existsSync(fp)) return res.status(404).end();
    db.run("UPDATE tracks SET plays=plays+1 WHERE id=?",[row.id]);
    const stat=fs.statSync(fp), range=req.headers.range, ct=row.mimetype||"audio/wav";
    if(!range){ res.writeHead(200,{"Content-Length":stat.size,"Content-Type":ct,"Accept-Ranges":"bytes"}); fs.createReadStream(fp).pipe(res); }
    else { const p=range.replace(/bytes=/,"").split("-"); const s=parseInt(p[0],10), e2=p[1]?parseInt(p[1],10):stat.size-1; res.writeHead(206,{"Content-Range":`bytes ${s}-${e2}/${stat.size}`,"Accept-Ranges":"bytes","Content-Length":e2-s+1,"Content-Type":ct}); fs.createReadStream(fp,{start:s,end:e2}).pipe(res); }
  });
});
app.post("/api/tracks", upload.single("audio"), async (req,res)=>{
  const u=await auth(req); if(!u) return res.status(401).json({error:"login required"});
  if(!req.file) return res.status(400).json({error:"audio required"});
  const {title,artist,genre,year,tags,no_ai}=req.body; if(!title||!artist) return res.status(400).json({error:"title and artist required"});
  if(no_ai!=="on"&&no_ai!=="true") return res.status(400).json({error:"You must confirm this is not AI-generated music. See Rulebook."});
  // find or create artist
  db.get("SELECT * FROM artists WHERE name=?",[artist.trim()],(e,row)=>{
    const aid=row? row.id: null;
    const finish=(artistId)=>{
      const safe=req.file.filename;
      db.run("INSERT INTO tracks (title,artist_id,artist_name,genre,year,tags,filename,mimetype,size,uploader) VALUES (?,?,?,?,?,?,?,?,?,?)",[title.trim().slice(0,120),artistId,artist.trim(),(genre||"other").trim(), year?parseInt(year,10):null,(tags||"").slice(0,300),safe,req.file.mimetype,req.file.size,u.username], function(e2){ if(e2) return res.status(500).json({error:e2.message}); db.get("SELECT * FROM tracks WHERE id=?",[this.lastID],(e3,r)=> res.status(201).json(r)); });
    };
    if(aid) finish(aid);
    else db.run("INSERT INTO artists (name,bio,location,genres,createdBy) VALUES (?,?,?,?,?)",[artist.trim(),`Wiki stub for ${artist.trim()}. Click edit to expand.`,"",genre||"",u.username], function(){ finish(this.lastID); });
  });
});
app.post("/api/tracks/:id/like",async (req,res)=>{ const u=await auth(req); if(!u) return res.status(401).json({error:"login required"}); db.run("UPDATE tracks SET likes=likes+1 WHERE id=?",[req.params.id],()=> db.get("SELECT likes FROM tracks WHERE id=?",[req.params.id],(e,r)=> res.json(r||{likes:0}))); });
app.get("/api/tracks/:id/comments",(req,res)=> db.all("SELECT * FROM track_comments WHERE trackId=? ORDER BY datetime(createdAt) ASC",[req.params.id],(e,rows)=> res.json(rows||[])));
app.post("/api/tracks/:id/comments",async (req,res)=>{ const u=await auth(req); if(!u) return res.status(401).json({error:"login required"}); const {text}=req.body; if(!text||!text.trim()) return res.status(400).json({error:"text required"}); db.run("INSERT INTO track_comments (trackId,author,text) VALUES (?,?,?)",[req.params.id,u.username,text.trim().slice(0,500)],function(){ db.get("SELECT * FROM track_comments WHERE id=?",[this.lastID],(e,r)=> res.status(201).json(r)); }); });
app.get("/api/genres/:genre/threads",(req,res)=> db.all("SELECT * FROM genre_threads WHERE genre=? ORDER BY datetime(createdAt) DESC",[req.params.genre],(e,rows)=> res.json(rows||[])));
app.post("/api/genres/:genre/threads",async (req,res)=>{ const u=await auth(req); if(!u) return res.status(401).json({error:"login required"}); const {title,body}=req.body; if(!title) return res.status(400).json({error:"title required"}); db.run("INSERT INTO genre_threads (genre,title,body,author) VALUES (?,?,?,?)",[req.params.genre,title.slice(0,120),(body||"").slice(0,3000),u.username],function(){ db.get("SELECT * FROM genre_threads WHERE id=?",[this.lastID],(e,r)=> res.status(201).json(r)); }); });
app.get("/api/threads/:id",(req,res)=> db.get("SELECT * FROM genre_threads WHERE id=?",[req.params.id],(e,row)=>{ if(!row) return res.status(404).end(); db.all("SELECT * FROM thread_posts WHERE thread_id=? ORDER BY datetime(createdAt) ASC",[req.params.id],(e2,posts)=> res.json({...row,posts:posts||[]})); });
app.post("/api/threads/:id/posts",async (req,res)=>{ const u=await auth(req); if(!u) return res.status(401).json({error:"login required"}); const {body}=req.body; if(!body) return res.status(400).json({error:"body required"}); db.run("INSERT INTO thread_posts (thread_id,author,body) VALUES (?,?,?)",[req.params.id,u.username,body.slice(0,2000)],function(){ db.get("SELECT * FROM thread_posts WHERE id=?",[this.lastID],(e,r)=> res.status(201).json(r)); }); });
app.get("/api/health",(req,res)=> res.json({ok:true,time:new Date().toISOString()}));
app.get("*",(req,res)=> res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=> console.log(`MUSiCPK on http://localhost:${PORT}`));
