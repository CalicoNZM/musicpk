"use strict";
// MUSiCPK — full-screen website settings: colours + layout
const SETTINGS_KEY="pk.settings.v2";
const defaultSettings={ theme:"warm", paper:"#f6f1e7", card:"#ffffff", accent:"#c14b2a", ink:"#1a1a18", width:"1100", sidebar:"right", density:"comfortable", genreLayout:"grid", showViz:true };
let settings={...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")) };
function applySettings(){
  // theme preset vs custom
  if(settings.theme==="custom"){
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.setProperty("--paper", settings.paper);
    document.documentElement.style.setProperty("--card", settings.card);
    document.documentElement.style.setProperty("--accent", settings.accent);
    document.documentElement.style.setProperty("--ink", settings.ink);
    // derive soft/muted approximations
    document.documentElement.style.setProperty("--paper-2", settings.paper);
    document.documentElement.style.setProperty("--line", settings.accent+"33");
  } else {
    document.documentElement.style.removeProperty("--paper");
    document.documentElement.style.removeProperty("--card");
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--ink");
    document.documentElement.setAttribute("data-theme", settings.theme==="warm" ? "" : settings.theme);
    if(settings.theme==="warm") document.documentElement.removeAttribute("data-theme");
  }
  document.documentElement.style.setProperty("--max", settings.width==="100%" ? "100%" : settings.width+"px");
  const layout=document.querySelector(".layout");
  if(layout){
    layout.classList.remove("sidebar-left","sidebar-hidden","compact","spacious");
    if(settings.sidebar==="left") layout.classList.add("sidebar-left");
    if(settings.sidebar==="hidden") layout.classList.add("sidebar-hidden");
    if(settings.density==="compact") layout.classList.add("compact");
    if(settings.density==="spacious") layout.classList.add("spacious");
  }
  const gg=document.getElementById("genreGrid");
  if(gg){ gg.classList.toggle("list", settings.genreLayout==="list"); }
  const viz=document.getElementById("viz");
  if(viz) viz.classList.toggle("hidden", !settings.showViz);
  // sync controls
  const tp=document.getElementById("themePreset"); if(tp) tp.value=settings.theme;
  const cp=document.getElementById("customColours"); if(cp) cp.hidden = settings.theme!=="custom";
  ["colPaper","colCard","colAccent","colInk"].forEach(id=>{
    const el=document.getElementById(id); if(el){
      const map={colPaper:"paper", colCard:"card", colAccent:"accent", colInk:"ink"};
      el.value=settings[map[id]];
    }
  });
  const els={layoutWidth:"width", sidebarPos:"sidebar", density:"density", genreLayout:"genreLayout"};
  Object.entries(els).forEach(([id,key])=>{ const el=document.getElementById(id); if(el) el.value=settings[key]; });
  const sv=document.getElementById("showViz"); if(sv) sv.checked=settings.showViz;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function saveSettings(patch){
  settings={...settings, ...patch};
  applySettings();
}
// wire settings UI after DOM ready
document.addEventListener("DOMContentLoaded", applySettings);

// MUSiCPK wiki — auth + genre boards + artist wiki + player
let token = localStorage.getItem("pk.token");
let me = null;

const authStatus = document.getElementById("authStatus");
const authBtn = document.getElementById("authBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authModal = document.getElementById("authModal");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const authSwitch = document.getElementById("authSwitch");
let authMode = "login";

function setAuthUI(){
  if(me){
    authStatus.textContent = me.username;
    authBtn.hidden = true;
    logoutBtn.hidden = false;
  } else {
    authStatus.textContent = "not signed in";
    authBtn.hidden = false;
    logoutBtn.hidden = true;
  }
}
function showToast(msg){
  const el=document.getElementById("appToast");
  el.textContent=msg; el.classList.add("show");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2200);
}
function authedFetch(url, opts={}){
  opts.headers = opts.headers||{};
  if(token) opts.headers["Authorization"]="Bearer "+token;
  return fetch(url, opts);
}
async function refreshMe(){
  if(!token){ me=null; setAuthUI(); return; }
  const r = await fetch("/api/me", {headers:{Authorization:"Bearer "+token}});
  if(r.ok){ me = await r.json(); } else { me=null; token=null; localStorage.removeItem("pk.token"); }
  setAuthUI();
}
function openAuth(mode){
  authMode=mode;
  authTitle.textContent = mode==="login" ? "Sign in" : "Create account";
  authSubmit.textContent = mode==="login" ? "Sign in" : "Create account";
  authSwitch.textContent = mode==="login" ? "Create account instead" : "Sign in instead";
  authModal.hidden=false;
}
authBtn.addEventListener("click", ()=> openAuth("login"));
document.getElementById("authSwitch").addEventListener("click", ()=> openAuth(authMode==="login"?"register":"login"));
document.getElementById("authCancel").addEventListener("click", ()=> authModal.hidden=true);
logoutBtn.addEventListener("click", ()=>{ token=null; me=null; localStorage.removeItem("pk.token"); setAuthUI(); showToast("Signed out"); });
// Settings
const settingsBtn=document.getElementById("settingsBtn");
const settingsModal=document.getElementById("settingsModal");
if(settingsBtn && settingsModal){
  settingsBtn.addEventListener("click", ()=>{ applySettings(); settingsModal.hidden=false; });
  document.getElementById("settingsClose")?.addEventListener("click", ()=> settingsModal.hidden=true);
  settingsModal.addEventListener("click", e=>{ if(e.target===settingsModal) settingsModal.hidden=true; });
  document.getElementById("themePreset")?.addEventListener("change", e=> saveSettings({theme:e.target.value}));
  ["colPaper","colCard","colAccent","colInk"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", e=>{
      const map={colPaper:"paper", colCard:"card", colAccent:"accent", colInk:"ink"};
      if(settings.theme!=="custom") saveSettings({theme:"custom"});
      saveSettings({[map[id]]: e.target.value});
    });
  });
  document.getElementById("layoutWidth")?.addEventListener("change", e=> saveSettings({width:e.target.value}));
  document.getElementById("sidebarPos")?.addEventListener("change", e=> saveSettings({sidebar:e.target.value}));
  document.getElementById("density")?.addEventListener("change", e=> saveSettings({density:e.target.value}));
  document.getElementById("genreLayout")?.addEventListener("change", e=> saveSettings({genreLayout:e.target.value}));
  document.getElementById("showViz")?.addEventListener("change", e=> saveSettings({showViz:e.target.checked}));
  document.getElementById("settingsReset")?.addEventListener("click", ()=>{ localStorage.removeItem(SETTINGS_KEY); settings={...defaultSettings}; applySettings(); showToast("Settings reset"); });
  // Saveable themes
  const SAVED_KEY="pk.savedThemes";
  function getSaved(){ try{ return JSON.parse(localStorage.getItem(SAVED_KEY)||"[]"); }catch{ return [] } }
  function renderSaved(){
    const ul=document.getElementById("savedThemesList"); if(!ul) return;
    const list=getSaved();
    ul.innerHTML=list.length ? "" : `<li class="muted small">No saved themes yet. Tweak colours then save.</li>`;
    list.forEach((t,idx)=>{
      const li=document.createElement("li");
      li.innerHTML=`<span style="display:inline-block;width:14px;height:14px;background:${t.accent};border:1px solid var(--line);vertical-align:middle;margin-right:6px"></span><span style="display:inline-block;width:14px;height:14px;background:${t.paper};border:1px solid var(--line);vertical-align:middle;margin-right:6px"></span><strong>${escapeHtml(t.name)}</strong> <span class="muted small">${t.paper} ${t.accent}</span> <button class="btn small" data-apply="${idx}">Apply</button> <button class="btn small" data-del="${idx}">Delete</button> <button class="btn small" data-export-one="${idx}">Copy</button>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll("[data-apply]").forEach(b=> b.addEventListener("click", ()=>{ const t=getSaved()[b.dataset.apply]; saveSettings({theme:"custom", paper:t.paper, card:t.card, accent:t.accent, ink:t.ink}); showToast(`Applied ${t.name}`); }));
    ul.querySelectorAll("[data-del]").forEach(b=> b.addEventListener("click", ()=>{ const l=getSaved(); l.splice(b.dataset.del,1); localStorage.setItem(SAVED_KEY, JSON.stringify(l)); renderSaved(); showToast("Deleted"); }));
    ul.querySelectorAll("[data-export-one]").forEach(b=> b.addEventListener("click", async ()=>{ const t=getSaved()[b.dataset.exportOne]; await navigator.clipboard.writeText(JSON.stringify(t)); showToast("Copied JSON"); }));
  }
  document.getElementById("saveThemeBtn")?.addEventListener("click", ()=>{
    const name=document.getElementById("newThemeName").value.trim();
    if(!name){ showToast("Enter a name"); return; }
    const cur={ name, paper: settings.theme==="custom"? settings.paper : getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || settings.paper, card: settings.theme==="custom"? settings.card : getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#ffffff", accent: settings.theme==="custom"? settings.accent : getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || settings.accent, ink: settings.theme==="custom"? settings.ink : getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || settings.ink };
    // if not custom, use actual current computed values from preset
    // fallback to reading settings paper etc if preset
    if(settings.theme!=="custom"){
      // derive from current computed after apply
      const s=getComputedStyle(document.documentElement);
      cur.paper=s.getPropertyValue("--paper").trim() || defaultSettings.paper;
      cur.card=s.getPropertyValue("--card").trim() || "#ffffff";
      cur.accent=s.getPropertyValue("--accent").trim() || defaultSettings.accent;
      cur.ink=s.getPropertyValue("--ink").trim() || defaultSettings.ink;
    }
    const l=getSaved(); l.push(cur); localStorage.setItem(SAVED_KEY, JSON.stringify(l)); document.getElementById("newThemeName").value=""; renderSaved(); showToast(`Saved ${name}`);
  });
  document.getElementById("exportThemesBtn")?.addEventListener("click", async ()=>{
    const l=getSaved(); const blob=new Blob([JSON.stringify(l,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="musicpk-themes.json"; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById("importThemesFile")?.addEventListener("change", async e=>{
    const f=e.target.files[0]; if(!f) return;
    try{ const txt=await f.text(); const arr=JSON.parse(txt); if(Array.isArray(arr)){ localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); renderSaved(); showToast("Imported"); } }catch{ showToast("Invalid JSON"); }
  });
  // render on open
  settingsBtn.addEventListener("click", renderSaved);
  // initial render
  renderSaved();
}

document.getElementById("authForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const username=document.getElementById("authUser").value.trim();
  const password=document.getElementById("authPass").value;
  const path = authMode==="login" ? "/api/auth/login" : "/api/auth/register";
  const r = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,password})});
  const j=await r.json();
  if(!r.ok){ document.getElementById("authError").textContent=j.error||"failed"; return; }
  token=j.token; localStorage.setItem("pk.token",token);
  authModal.hidden=true; document.getElementById("authError").textContent="";
  await refreshMe();
  showToast(authMode==="login"?"Signed in":"Account created");
  // refresh wiki data
  loadArtists(); loadPopular();
});

 // nav
function showView(name){
  document.querySelectorAll(".view").forEach(v=> v.classList.toggle("active", v.dataset.view===name));
  document.querySelectorAll(".nav-btn").forEach(b=> b.classList.toggle("active", b.dataset.nav===name));
}
document.querySelectorAll("[data-nav]").forEach(el=>{
  el.addEventListener("click", (e)=>{
    e.preventDefault();
    const nav=el.dataset.nav;
    if(nav==="genre-detail" || nav==="artist-detail") return;
    showView(nav);
  });
});

// rulebook — now sections TOS
async function loadRulebook(){
  const r=await fetch("/api/rulebook");
  const j=await r.json();
  const card=document.getElementById("rulebookCard");
  let html=`<h2>${j.title}</h2>`;
  (j.sections||[]).forEach(s=>{ html+=`<div class="tos-section"><h3>${s.h}</h3><p>${s.p}</p></div>`; });
  if(j.rules) html+=`<ol>${j.rules.map(x=>`<li>${x}</li>`).join("")}</ol>`;
  html+=`<p class="muted small">${j.note||""}</p>`;
  card.innerHTML=html;
}
loadRulebook();

// Genres — 32 niches
const genreInfo = {
  lofi:{name:"Lofi", desc:"Tape hiss, bedroom 4-track, MiniDisc."},
  chiptune:{name:"Chiptune", desc:"Game Boy, LSDJ, trackers, FM chips."},
  indie:{name:"Indie", desc:"Jangle, DIY, small rooms."},
  house:{name:"House", desc:"Club, 909, basement."},
  ambient:{name:"Ambient", desc:"Drone, field recordings, room tone."},
  experimental:{name:"Experimental", desc:"Noise, synthesis, chance."},
  folk:{name:"Folk", desc:"Acoustic, songs, close mics."},
  punk:{name:"Punk", desc:"Fast, short, live."},
  "hip-hop":{name:"Hip Hop", desc:"Boom bap, sampling, MPC."},
  rnb:{name:"R&B", desc:"Soul, modern R&B, bedroom soul."},
  soul:{name:"Soul", desc:"Vintage soul, gospel, northern soul."},
  jazz:{name:"Jazz", desc:"Improvisation, Blue Note, spiritual jazz."},
  classical:{name:"Classical", desc:"Contemporary classical, chamber, minimal."},
  techno:{name:"Techno", desc:"Detroit, Berlin, 303/909."},
  dnb:{name:"Drum & Bass", desc:"Jungle, breakbeats, 170 BPM."},
  dubstep:{name:"Dubstep", desc:"2006 Croydon, weight, half-step."},
  shoegaze:{name:"Shoegaze", desc:"Boards, reverb, My Bloody Valentine."},
  dreampop:{name:"Dream Pop", desc:"Cocteau Twins, Beach House, haze."},
  metal:{name:"Metal", desc:"Doom, black, sludge, riffs."},
  hardcore:{name:"Hardcore", desc:"Youth crew, powerviolence, breakdowns."},
  emo:{name:"Emo", desc:"Midwest, screamo, bedroom emo."},
  "post-rock":{name:"Post-Rock", desc:"Godspeed, Talk Talk, crescendos."},
  krautrock:{name:"Krautrock", desc:"Can, Neu!, motorik."},
  psychedelia:{name:"Psychedelia", desc:"Psych rock, 60s revival, jam."},
  synthpop:{name:"Synthpop", desc:"Analog synths, Depeche Mode, city lights."},
  vaporwave:{name:"Vaporwave", desc:"Mallsoft, slowed, 90s web."},
  hyperpop:{name:"Hyperpop", desc:"PC Music, digi-core, 160 BPM."},
  "city-pop":{name:"City Pop", desc:"80s Japan, Tatsuro Yamashita, FM."},
  disco:{name:"Disco / Funk", desc:"Chic, Prelude, boogie edits."},
  afrobeat:{name:"Afrobeat", desc:"Fela, contemporary Afro-fusion."},
  reggae:{name:"Reggae / Dub", desc:"King Tubby, dubplates."},
  country:{name:"Country", desc:"Outlaw, alt-country, songwriter."},
};
let currentGenre=null;
let currentThreadId=null;
function renderGenres(){
  const grid=document.getElementById("genreGrid");
  grid.innerHTML="";
  Object.entries(genreInfo).forEach(([slug,info])=>{
    const div=document.createElement("div");
    div.className="genre-card";
    div.innerHTML=`<h3>${info.name}</h3><p class="muted small">${info.desc}</p><p class="small">Open board</p>`;
    div.addEventListener("click", ()=> openGenre(slug));
    grid.appendChild(div);
  });
}
async function openGenre(slug){
  currentGenre=slug;
  document.getElementById("genreTitle").textContent=genreInfo[slug]?.name||slug;
  document.getElementById("genreDesc").textContent=genreInfo[slug]?.desc||"";
  // set publish genre field to slug? We'll set hidden behavior: publishForm genre is auto from currentGenre if in detail
  const pubGenre = document.querySelector('#publishForm [name="genre"]');
  // if form has no genre select, we inject hidden
  let hidden = document.getElementById("pubGenreHidden");
  if(!hidden){
    hidden=document.createElement("input");
    hidden.type="hidden"; hidden.id="pubGenreHidden"; hidden.name="genre";
    document.getElementById("publishForm").appendChild(hidden);
  }
  hidden.value=slug;
  showView("genre-detail");
  await Promise.all([loadGenreTracks(slug), loadThreads(slug)]);
}
async function loadGenreTracks(slug){
  const r=await fetch(`/api/tracks?genre=${encodeURIComponent(slug)}`);
  const list=await r.json();
  const ul=document.getElementById("genreDetailTracks");
  ul.innerHTML=list.length? "" : `<li class="muted small">No tracks yet in ${slug}. Be the first to publish.</li>`;
  list.forEach(t=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> <span class="muted small">by ${escapeHtml(t.artist_name)} ${t.year||""}</span> <span class="c-meta">${t.plays} plays ${t.likes} likes</span>`;
    li.addEventListener("click", ()=> playTrackById(t.id));
    ul.appendChild(li);
  });
  // also refresh global lists if on genres overview
  if(!currentGenre) {}
}
async function loadThreads(slug){
  const r=await fetch(`/api/genres/${encodeURIComponent(slug)}/threads`);
  const threads=await r.json();
  const ul=document.getElementById("threadList");
  ul.innerHTML=threads.length?"":`<li class="muted small">No threads yet.</li>`;
  threads.forEach(th=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(th.title)}</strong><div class="muted small">by ${escapeHtml(th.author)} on ${new Date(th.createdAt).toLocaleString()}</div><div class="small">${escapeHtml((th.body||"").slice(0,120))}</div>`;
    li.addEventListener("click", ()=> openThread(th.id));
    ul.appendChild(li);
  });
}
async function openThread(id){
  currentThreadId=id;
  const r=await fetch(`/api/threads/${id}`);
  const th=await r.json();
  document.getElementById("threadDetail").hidden=false;
  document.getElementById("threadDetailTitle").textContent=th.title;
  document.getElementById("threadDetailBody").textContent=th.body||"";
  const ul=document.getElementById("postList");
  ul.innerHTML=th.posts.length?"":`<li class="muted small">No replies.</li>`;
  th.posts.forEach(p=>{
    const li=document.createElement("li");
    li.innerHTML=`<span class="muted small">${escapeHtml(p.author)} on ${new Date(p.createdAt).toLocaleString()}</span><div>${escapeHtml(p.body)}</div>`;
    ul.appendChild(li);
  });
}
document.getElementById("threadForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); showToast("Sign in to post"); return; }
  const title=document.getElementById("threadTitle").value.trim();
  const body=document.getElementById("threadBody").value.trim();
  const r=await authedFetch(`/api/genres/${encodeURIComponent(currentGenre)}/threads`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title, body})});
  const j=await r.json();
  if(!r.ok){ showToast(j.error); return; }
  document.getElementById("threadTitle").value=""; document.getElementById("threadBody").value="";
  loadThreads(currentGenre);
});
document.getElementById("postForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); return; }
  const body=document.getElementById("postBody").value.trim();
  const r=await authedFetch(`/api/threads/${currentThreadId}/posts`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({body})});
  const j=await r.json();
  if(!r.ok){ showToast(j.error); return; }
  document.getElementById("postBody").value="";
  openThread(currentThreadId);
});

renderGenres();

// Artists wiki
let artistSort="name";
async function loadArtists(){
  const q=document.getElementById("artistSearch").value.trim();
  const params=new URLSearchParams();
  if(q) params.set("q",q);
  params.set("sort",artistSort);
  const r=await fetch(`/api/artists?${params.toString()}`);
  const list=await r.json();
  const ul=document.getElementById("artistList");
  ul.innerHTML=list.length?"":`<li class="muted">No artists match.</li>`;
  list.forEach(a=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(a.name)}</strong><div class="muted small">${escapeHtml(a.genres||"")}${a.location?" - "+escapeHtml(a.location):""}</div><div class="small">${escapeHtml((a.bio||"").slice(0,120))}</div><div class="muted small">${a.trackCount||0} tracks</div>`;
    li.addEventListener("click", ()=> openArtist(a.id));
    ul.appendChild(li);
  });
}
async function loadPopular(){
  const r=await fetch("/api/artists?sort=popular");
  const list=await r.json();
  const ul=document.getElementById("popularArtists");
  ul.innerHTML=list.slice(0,6).map(a=>`<li><strong>${escapeHtml(a.name)}</strong> <span class="muted small">${a.trackCount} tracks</span></li>`).join("") || `<li class="muted small">No tracks yet</li>`;
}
let currentArtistId=null;
async function openArtist(id){
  currentArtistId=id;
  const r=await fetch(`/api/artists/${id}`);
  const a=await r.json();
  if(!r.ok){ showToast("artist not found"); return; }
  showView("artist-detail");
  document.getElementById("artistName").textContent=a.name;
  document.getElementById("artistMeta").textContent=`${a.genres||""} ${a.location? " - "+a.location:""} ${a.formed_year? " - formed "+a.formed_year:""} ${a.members? " • "+a.members:""} ${a.label? " • "+a.label:""} • wiki by ${a.createdBy||"system"}${a.website? " • "+a.website:""}`;
  document.getElementById("artistBio").textContent=a.bio||"No bio yet. Click edit to expand this niche with members, label, influences, and discography notes.";
  document.getElementById("editBio").value=a.bio||"";
  document.getElementById("editLocation").value=a.location||"";
  document.getElementById("editGenres").value=a.genres||"";
  document.getElementById("editYear").value=a.formed_year||"";
  const em=document.getElementById("editMembers"); if(em) em.value=a.members||"";
  const el=document.getElementById("editLabel"); if(el) el.value=a.label||"";
  const ew=document.getElementById("editWebsite"); if(ew) ew.value=a.website||"";
  document.getElementById("artistEditForm").hidden=true;
  // edits
  const er=await fetch(`/api/artists/${id}/edits`);
  const edits=await er.json();
  document.getElementById("artistEdits").innerHTML=edits.length? "Edits: "+edits.map(e=>`${escapeHtml(e.editor)} changed ${e.field} on ${new Date(e.createdAt).toLocaleDateString()}`).join(" | ") : "No edits yet.";
  // albums for artist
  const ar=await fetch(`/api/artists/${id}/albums`);
  const albums=await ar.json();
  const alUl=document.getElementById("artistAlbums");
  if(alUl){
    alUl.innerHTML=albums.length?"":`<li class="muted small">No albums yet. Create one below.</li>`;
    albums.forEach(al=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${escapeHtml(al.title)}</strong> <span class="muted small">${al.year||""} ${al.genre||""} ${al.label||""}</span><div class="small">${escapeHtml((al.description||"").slice(0,100))}</div>`;
      li.addEventListener("click", ()=> openAlbum(al.id));
      alUl.appendChild(li);
    });
    // populate publish album select
    const sel=document.getElementById("publishAlbumSelect");
    if(sel){
      sel.innerHTML=`<option value="">No album - single</option>` + albums.map(al=> `<option value="${al.id}">${escapeHtml(al.title)} (${al.year||""})</option>`).join("");
    }
  }
  // tracks
  const tr=await fetch(`/api/artists/${id}/tracks`);
  const tracks=await tr.json();
  const ul=document.getElementById("artistTrackList");
  ul.innerHTML=tracks.length?"":`<li class="muted small">No tracks yet for this artist. Publish from a genre board and attach to an album.</li>`;
  tracks.forEach(t=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> <span class="muted small">${t.year||""} ${t.genre||""} ${t.album_id? " • album #"+t.album_id:""} • ${escapeHtml((t.description||"").slice(0,60))}</span> <span class="c-meta">${t.plays} plays ${t.credits? " • "+escapeHtml(t.credits):""}</span>`;
    li.addEventListener("click", ()=> playTrackById(t.id));
    ul.appendChild(li);
  });
}
document.getElementById("editArtistBtn").addEventListener("click", ()=>{
  if(!me){ openAuth("login"); return; }
  document.getElementById("artistEditForm").hidden=false;
});
document.getElementById("artistEditForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); return; }
  const body={
    bio: document.getElementById("editBio").value,
    location: document.getElementById("editLocation").value,
    genres: document.getElementById("editGenres").value,
    formed_year: document.getElementById("editYear").value ? parseInt(document.getElementById("editYear").value,10) : null,
    members: (document.getElementById("editMembers")?.value||""),
    label: (document.getElementById("editLabel")?.value||""),
    website: (document.getElementById("editWebsite")?.value||""),
  };
  const r=await authedFetch(`/api/artists/${currentArtistId}/edit`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
  const j=await r.json();
  if(!r.ok){ document.getElementById("editStatus").textContent=j.error; return; }
  document.getElementById("editStatus").textContent="Saved";
  openArtist(currentArtistId);
  loadArtists(); loadPopular();
});
document.getElementById("artistSearch").addEventListener("input", ()=>{ clearTimeout(window._as); window._as=setTimeout(loadArtists,300); });
document.querySelectorAll("[data-artist-sort]").forEach(b=>{
  b.addEventListener("click", ()=>{
    document.querySelectorAll("[data-artist-sort]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    artistSort=b.dataset.artistSort;
    loadArtists();
  });
});
document.getElementById("createArtistBtn").addEventListener("click", ()=>{
  if(!me){ openAuth("login"); return; }
  document.getElementById("createArtistCard").hidden=false;
});
document.getElementById("artistCreateForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); return; }
  const fd=new FormData(e.target);
  const body={name:fd.get("name"), bio:fd.get("bio"), location:fd.get("location"), genres:fd.get("genres"), formed_year:fd.get("formed_year"), members:fd.get("members"), label:fd.get("label"), website:fd.get("website")};
  const r=await authedFetch("/api/artists", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
  const j=await r.json();
  if(!r.ok){ document.getElementById("artistCreateStatus").textContent=j.error; return; }
  document.getElementById("artistCreateStatus").textContent="Created";
  e.target.reset();
  loadArtists(); loadPopular();
  openArtist(j.id);
});

loadArtists(); loadPopular();

// Albums
async function loadAlbums(){
  const q=document.getElementById("albumSearch")?.value||"";
  const params=new URLSearchParams();
  if(q) params.set("q",q);
  const r=await fetch(`/api/albums?${params.toString()}`);
  const list=await r.json();
  const ul=document.getElementById("albumList");
  if(!ul) return;
  ul.innerHTML=list.length?"":`<li class="muted small">No albums yet. Create one from an artist page.</li>`;
  list.forEach(al=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(al.title)}</strong> by ${escapeHtml(al.artist_name)} <span class="muted small">${al.year||""} ${al.genre||""} ${al.label||""}</span><div class="small">${escapeHtml((al.description||"").slice(0,120))}</div>`;
    li.addEventListener("click", ()=> openAlbum(al.id));
    ul.appendChild(li);
  });
}
async function openAlbum(id){
  const r=await fetch(`/api/albums/${id}`);
  const al=await r.json();
  if(!r.ok){ showToast("album not found"); return; }
  showView("album-detail");
  document.getElementById("albumTitle").textContent=al.title;
  document.getElementById("albumMeta").textContent=`by ${al.artist_name} ${al.year||""} ${al.genre||""} ${al.label? " • "+al.label:""}${al.cover_url? " • cover": ""}`;
  document.getElementById("albumDesc").textContent=al.description||"No description.";
  const tr=await fetch(`/api/albums/${id}/tracks`);
  const tracks=await tr.json();
  const ul=document.getElementById("albumTrackList");
  ul.innerHTML=tracks.length?"":`<li class="muted small">No tracks on this album yet.</li>`;
  tracks.forEach(t=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> <span class="muted small">${t.year||""} ${escapeHtml((t.description||"").slice(0,60))}</span>`;
    li.addEventListener("click", ()=> playTrackById(t.id));
    ul.appendChild(li);
  });
}
document.getElementById("albumSearch")?.addEventListener("input", ()=>{ clearTimeout(window._ab); window._ab=setTimeout(loadAlbums,300); });
document.getElementById("albumCreateForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); return; }
  const fd=new FormData(e.target);
  const body={artist: document.getElementById("artistName")?.textContent || fd.get("artist"), title: fd.get("title"), year: fd.get("year"), genre: fd.get("genre"), label: fd.get("label"), description: fd.get("description"), cover_url: fd.get("cover_url")};
  // if artist name not in form, use current artist
  if(!body.artist) body.artist=document.getElementById("artistName").textContent;
  const r=await authedFetch("/api/albums", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
  const j=await r.json();
  if(!r.ok){ document.getElementById("albumCreateStatus").textContent=j.error; return; }
  document.getElementById("albumCreateStatus").textContent="Album created";
  e.target.reset();
  openArtist(currentArtistId);
  loadAlbums();
});
loadAlbums();

// Import from Spotify / Apple Music — tracks
document.getElementById("importSpotifyBtn")?.addEventListener("click", async ()=>{
  const url=document.getElementById("spotifyUrl").value.trim();
  if(!url){ showToast("Paste a Spotify URL"); return; }
  document.getElementById("importStatus").textContent="Fetching Spotify...";
  const r=await fetch(`/api/import/spotify?url=${encodeURIComponent(url)}`);
  const j=await r.json();
  if(!r.ok){ document.getElementById("importStatus").textContent=j.error; return; }
  const title = j.title || "";
  const pubTitle=document.querySelector('#publishForm [name="title"]');
  const pubArtist=document.querySelector('#publishForm [name="artist"]');
  if(j.title && pubTitle) pubTitle.value = j.title.split(" - ")[0] || j.title;
  if(j.artist && pubArtist) pubArtist.value = j.artist;
  if(title.includes(" - ") && pubArtist && !pubArtist.value){
    const parts=title.split(" - "); pubTitle.value=parts[0].trim(); pubArtist.value=parts[1]?.trim()||"";
  }
  let msg=`Imported: ${j.title} by ${j.artist||""}`;
  if(j.is_album) msg+= " — album detected: use Album import for full tracklist.";
  document.getElementById("importStatus").textContent=msg;
});
document.getElementById("importAppleBtn")?.addEventListener("click", async ()=>{
  const url=document.getElementById("appleUrl").value.trim();
  if(!url){ showToast("Paste Apple Music URL or term"); return; }
  document.getElementById("importStatus").textContent="Fetching Apple Music...";
  let q = url.includes("music.apple.com") ? `url=${encodeURIComponent(url)}` : `term=${encodeURIComponent(url)}`;
  const r=await fetch(`/api/import/apple?${q}`);
  const j=await r.json();
  if(!r.ok){ document.getElementById("importStatus").textContent=j.error; return; }
  // album case returns album + tracks
  if(j.album){
    const al=j.album;
    const pubTitle=document.querySelector('#publishForm [name="title"]');
    const pubArtist=document.querySelector('#publishForm [name="artist"]');
    const pubYear=document.querySelector('#publishForm [name="year"]');
    if(pubArtist) pubArtist.value = al.artistName || "";
    // if single track from album, keep but also show album hint
    document.getElementById("importStatus").innerHTML=`Imported album <strong>${escapeHtml(al.collectionName||al.trackName||"")}</strong> by ${escapeHtml(al.artistName||"")} — ${j.tracks?.length||0} tracks found. <button class="btn small" id="useAlbumBtn">Create album from this</button>`;
    document.getElementById("useAlbumBtn")?.addEventListener("click", ()=>{
      // prefill album form if on artist page, else just hint
      const at=document.getElementById("albumTitleInput"); if(at) at.value=al.collectionName||"";
      const ay=document.getElementById("albumYearInput"); if(ay && al.releaseDate) ay.value=new Date(al.releaseDate).getFullYear();
      const ag=document.getElementById("albumGenreInput"); if(ag) ag.value=al.primaryGenreName||"";
      const ac=document.getElementById("albumCoverInput"); if(ac) ac.value=al.artworkUrl100?.replace("100x100","600x600")||"";
      showToast("Album form pre-filled — switch to artist niche to create.");
    });
    return;
  }
  const results=j.results||[];
  if(results.length){
    const first=results[0];
    const pubTitle=document.querySelector('#publishForm [name="title"]');
    const pubArtist=document.querySelector('#publishForm [name="artist"]');
    if(pubTitle) pubTitle.value = first.trackName || first.collectionName || "";
    if(pubArtist) pubArtist.value = first.artistName || "";
    const pubYear=document.querySelector('#publishForm [name="year"]');
    if(pubYear && first.releaseDate) pubYear.value = new Date(first.releaseDate).getFullYear();
    document.getElementById("importStatus").textContent=`Imported: ${first.trackName||first.collectionName} by ${first.artistName}`;
  } else if(j.results===undefined && j.title){
    document.getElementById("importStatus").textContent=`Imported: ${j.title}`;
  } else {
    document.getElementById("importStatus").textContent="No results";
  }
});
// Import albums — from Apple/Spotify album URLs
document.getElementById("importAlbumSpotifyBtn")?.addEventListener("click", async ()=>{
  const url=document.getElementById("albumSpotifyUrl").value.trim();
  if(!url){ showToast("Paste Spotify album URL"); return; }
  document.getElementById("albumImportStatus").textContent="Fetching Spotify album...";
  const r=await fetch(`/api/import/spotify?url=${encodeURIComponent(url)}`);
  const j=await r.json();
  if(!r.ok){ document.getElementById("albumImportStatus").textContent=j.error; return; }
  document.getElementById("albumTitleInput").value = j.title || "";
  // try to guess artist from title split "Album by Artist"
  if(j.title && j.title.includes(" by ")){
    const parts=j.title.split(" by "); document.getElementById("albumTitleInput").value=parts[0].trim();
  }
  document.getElementById("albumImportStatus").textContent=`Imported: ${j.title}${j.hint? " — "+j.hint:""}`;
  document.getElementById("albumImportPreview").hidden=false;
  document.getElementById("albumImportPreview").textContent=j.hint||"Tracklist not available for Spotify without API — add tracks manually after creating album.";
});
document.getElementById("importAlbumAppleBtn")?.addEventListener("click", async ()=>{
  const url=document.getElementById("albumAppleUrl").value.trim();
  if(!url){ showToast("Paste Apple Music album URL or search"); return; }
  document.getElementById("albumImportStatus").textContent="Fetching Apple album...";
  let q = url.includes("music.apple.com") ? `url=${encodeURIComponent(url)}` : `term=${encodeURIComponent(url)}&album=1`;
  const r=await fetch(`/api/import/apple?${q}`);
  const j=await r.json();
  if(!r.ok){ document.getElementById("albumImportStatus").textContent=j.error; return; }
  const al=j.album || (j.results && j.results[0]);
  if(!al){ document.getElementById("albumImportStatus").textContent="No album found"; return; }
  document.getElementById("albumTitleInput").value = al.collectionName || al.trackName || "";
  if(al.releaseDate) document.getElementById("albumYearInput").value = new Date(al.releaseDate).getFullYear();
  document.getElementById("albumGenreInput").value = al.primaryGenreName || "";
  document.getElementById("albumCoverInput").value = (al.artworkUrl100||"").replace("100x100","600x600");
  document.getElementById("albumDescInput").value = `Imported from Apple Music — ${al.artistName} — ${al.collectionName} (${al.trackCount||j.tracks?.length||""} tracks). ${al.copyright||""}`;
  document.getElementById("albumImportStatus").textContent=`Imported album ${al.collectionName} by ${al.artistName} — ${j.tracks?.length||0} tracks`;
  const preview=document.getElementById("albumImportPreview");
  if(j.tracks && j.tracks.length){
    preview.hidden=false;
    preview.innerHTML=`<strong>Tracks on Apple Music:</strong><br>`+ j.tracks.slice(0,12).map((t,i)=> `${i+1}. ${escapeHtml(t.trackName||"")} `).join("<br>") + (j.tracks.length>12? `<br><em>and ${j.tracks.length-12} more</em>`:"") + `<br><button class="btn small" id="importAlbumTracksBtn">Create album now — you can add tracks after</button>`;
    document.getElementById("importAlbumTracksBtn")?.addEventListener("click", ()=> document.getElementById("albumCreateForm").requestSubmit());
  }
});

// Community tracks in library preview + genre overview list
async function loadCommunityTracks(){
  const genre=document.getElementById("genreFilter")?.value||"all";
  const sort=document.getElementById("sortSelect")?.value||"newest";
  const q=document.getElementById("communitySearch")?.value||"";
  const params=new URLSearchParams();
  if(genre && genre!=="all") params.set("genre",genre);
  if(q) params.set("q",q);
  if(sort) params.set("sort",sort);
  const r=await fetch(`/api/tracks?${params.toString()}`);
  const list=await r.json();
  const ul=document.getElementById("genreTrackList");
  if(ul){
    ul.innerHTML=list.length?"":`<li class="muted small">No tracks yet. Sign in and publish the first one.</li>`;
    list.forEach(t=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> by ${escapeHtml(t.artist_name)} <span class="c-meta">${t.genre||""} ${t.year||""} - ${t.plays} plays</span>`;
      li.addEventListener("click", ()=> playTrackById(t.id));
      ul.appendChild(li);
    });
  }
  const ul2=document.getElementById("communityList");
  if(ul2){
    ul2.innerHTML=list.length?"":`<li class="muted small">No community tracks match.</li>`;
    list.forEach(t=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> by ${escapeHtml(t.artist_name)} <span class="c-meta">${t.genre||""}</span>`;
      li.addEventListener("click", ()=> playTrackById(t.id));
      ul2.appendChild(li);
    });
  }
  document.getElementById("communityStatus").textContent = list.length? `${list.length} tracks` : "";
}
document.getElementById("genreFilter")?.addEventListener("change", loadCommunityTracks);
document.getElementById("refreshCommunityBtn")?.addEventListener("click", loadCommunityTracks);
document.getElementById("communitySearch")?.addEventListener("input", ()=>{ clearTimeout(window._cs); window._cs=setTimeout(loadCommunityTracks,300); });
document.getElementById("sortSelect")?.addEventListener("change", loadCommunityTracks);
loadCommunityTracks();

// Publish (genre detail form)
document.getElementById("publishForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); showToast("Sign in to publish"); return; }
  const fd=new FormData(e.target);
  // ensure genre is currentGenre if not set
  if(!fd.get("genre") && currentGenre) fd.set("genre", currentGenre);
  // no_ai must be on
  if(!fd.get("no_ai")){ showToast("Check the No AI box"); return; }
  const r=await authedFetch("/api/tracks", {method:"POST", body:fd});
  const j=await r.json();
  if(!r.ok){ document.getElementById("publishStatus").textContent=j.error; showToast(j.error); return; }
  document.getElementById("publishStatus").textContent="Published";
  e.target.reset();
  // re-add hidden genre
  if(currentGenre){
    let h=document.getElementById("pubGenreHidden");
    if(h) h.value=currentGenre;
  }
  loadGenreTracks(currentGenre); loadCommunityTracks(); loadPopular();
});

// Player (keep IndexedDB + community unified)
let personalTracks=[]; let queue=[]; let currentIndex=-1; let isPlaying=false;
const audioEl=document.getElementById("audioEl");
const canvas=document.getElementById("viz");
const ctx=canvas.getContext("2d");
const playLabel=document.getElementById("playLabel");

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])) }
function fmt(s){ if(!isFinite(s)||s==null) return "0:00"; s=Math.max(0,Math.round(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }

// IndexedDB
const IDB_NAME="discPlayer"; const IDB_STORE="personalTracks";
function idbOpen(){ return new Promise((res,rej)=>{ const r=indexedDB.open(IDB_NAME,1); r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE,{keyPath:"id",autoIncrement:true}); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function idbGetAll(){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readonly"); const rq=tx.objectStore(IDB_STORE).getAll(); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);}); }
async function idbAdd(rec){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readwrite"); const rq=tx.objectStore(IDB_STORE).add(rec); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);}); }
async function idbClear(){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readwrite"); const rq=tx.objectStore(IDB_STORE).clear(); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error);}); }

async function loadPersonal(){
  try{
    const rows=await idbGetAll();
    document.getElementById("idbStatus").textContent=`${rows.length} local`;
    personalTracks=rows.map(r=>{ const url=URL.createObjectURL(r.blob); return {id:r.id, title:r.title, artist:r.artist, duration:r.duration||null, url, blob:r.blob}; });
    renderPersonal(); rebuildQueue();
  }catch(e){ document.getElementById("idbStatus").textContent="IndexedDB unavailable"; }
}
function renderPersonal(){
  const ul=document.getElementById("personalList");
  document.getElementById("personalCount").textContent=`${personalTracks.length} local tracks`;
  ul.innerHTML=personalTracks.length? "" : `<li class="muted small">No local discs. Drop files here.</li>`;
  personalTracks.forEach((t,i)=>{
    const qIdx=queue.findIndex(q=>q.kind==="personal"&&q.ref.id===t.id);
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(t.title)}</strong> <span class="muted small">${escapeHtml(t.artist)} ${t.duration? fmt(t.duration):""}</span>`;
    if(qIdx===currentIndex) li.style.background="#ece6d8";
    li.addEventListener("click", ()=>{ const idx=queue.findIndex(q=>q.kind==="personal"&&q.ref.id===t.id); if(idx>=0) loadTrack(idx,true); });
    ul.appendChild(li);
  });
}
function rebuildQueue(){
  queue=[];
  personalTracks.forEach(t=> queue.push({kind:"personal", ref:t}));
  // community tracks will be added on demand via playTrackById; but also keep queue for sequential play: fetch latest community then append
}
function renderQueue(){
  const ul=document.getElementById("playlist");
  ul.innerHTML=queue.length? "" : `<li class="muted small">Queue empty. Play a track to build it.</li>`;
  queue.forEach((q,i)=>{
    const t=q.ref;
    const title = q.kind==="personal" ? t.title : t.title;
    const artist = q.kind==="personal" ? t.artist : t.artist_name;
    const li=document.createElement("li");
    li.innerHTML=`<strong>${escapeHtml(title)}</strong> <span class="muted small">${escapeHtml(artist)}${q.kind==="community"?" [community]":""}</span>`;
    if(i===currentIndex) li.classList.add("playing");
    li.addEventListener("click", ()=> loadTrack(i,true));
    ul.appendChild(li);
  });
}
function loadTrack(i, autoplay){
  if(!queue.length) return;
  currentIndex=(i+queue.length)%queue.length;
  const entry=queue[currentIndex];
  const t=entry.ref;
  const isComm = entry.kind==="community";
  document.getElementById("emptyState").hidden=true;
  document.getElementById("npContent").hidden=false;
  document.getElementById("npTitle").textContent=isComm? t.title : t.title;
  document.getElementById("npArtist").textContent=isComm? t.artist_name : t.artist;
  document.getElementById("npTags").textContent=isComm? `${t.genre||""} ${t.tags||""} ${t.album_id? " • album #"+t.album_id:""}` : "Local file";
  const npDescEl=document.getElementById("npDesc"); if(npDescEl) npDescEl.textContent=isComm? (t.description||"") : "";
  document.getElementById("srcBadge").textContent=isComm?"Community":"Local";
  document.getElementById("sideTitle").textContent=isComm? t.title : t.title;
  document.getElementById("sideArtist").textContent=isComm? t.artist_name : t.artist;
  if(isComm){
    audioEl.src=`/api/tracks/${t.id}/stream`;
    showTrackDetail(t);
  } else {
    audioEl.src=t.url;
    document.getElementById("trackDetailCard").hidden=true;
  }
  document.getElementById("durTime").textContent= t.duration? fmt(t.duration) : "0:00";
  document.getElementById("curTime").textContent="0:00";
  renderQueue(); renderPersonal();
  if(autoplay) playAudio();
}
function showTrackDetail(t){
  const card=document.getElementById("trackDetailCard");
  card.hidden=false;
  document.getElementById("tdTitle").textContent=t.title;
  document.getElementById("tdArtist").textContent=`by ${t.artist_name}`;
  document.getElementById("tdMeta").textContent=`${t.genre||""} ${t.year||""}${t.album_id? " • album #"+t.album_id:""} - ${t.plays||0} plays ${t.likes||0} likes`;
  const d=document.getElementById("tdDesc"); if(d) d.textContent=t.description||"";
  const cr=document.getElementById("tdCredits"); if(cr) cr.textContent=t.credits? "Credits: "+t.credits : "";
  document.getElementById("likeCount").textContent=`${t.likes||0} likes`;
  document.getElementById("playCount").textContent=`${t.plays||0} plays`;
  loadTrackComments(t.id);
}
async function loadTrackComments(id){
  const r=await fetch(`/api/tracks/${id}/comments`);
  const list=await r.json();
  const ul=document.getElementById("commentList");
  ul.innerHTML=list.length?"":`<li class="muted small">No comments yet.</li>`;
  list.forEach(c=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong class="small">${escapeHtml(c.author)}</strong> <span class="muted small">${new Date(c.createdAt).toLocaleString()}</span><div>${escapeHtml(c.text)}</div>`;
    ul.appendChild(li);
  });
}
async function playTrackById(id){
  // ensure in queue
  const r=await fetch(`/api/tracks/${id}`);
  const t=await r.json();
  // check if already in queue
  let idx=queue.findIndex(q=>q.kind==="community"&&q.ref.id===id);
  if(idx===-1){ queue.push({kind:"community", ref:t}); idx=queue.length-1; }
  loadTrack(idx,true);
  document.getElementById("contentArea").scrollIntoView({behavior:"smooth", block:"start"});
}

function setPlayIcon(p){ playLabel.textContent=p?"Pause":"Play"; }
function playAudio(){
  if(currentIndex===-1 && queue.length) loadTrack(0,false);
  if(currentIndex===-1) return;
  ensureAudio(); if(audioCtx && audioCtx.state==="suspended") audioCtx.resume();
  audioEl.play().then(()=>{ isPlaying=true; setPlayIcon(true); startViz(); }).catch(()=>{});
}
function pauseAudio(){ audioEl.pause(); isPlaying=false; setPlayIcon(false); stopViz(); }
function stopAudio(){ audioEl.pause(); audioEl.currentTime=0; isPlaying=false; setPlayIcon(false); stopViz(); }

document.getElementById("btnPlay").addEventListener("click", ()=> isPlaying? pauseAudio(): playAudio());
document.getElementById("btnStop").addEventListener("click", stopAudio);
document.getElementById("btnNext").addEventListener("click", ()=> { if(queue.length) loadTrack(currentIndex+1, isPlaying); });
document.getElementById("btnPrev").addEventListener("click", ()=> { if(audioEl.currentTime>3) audioEl.currentTime=0; else if(queue.length) loadTrack(currentIndex-1, isPlaying); });

audioEl.addEventListener("timeupdate", ()=>{
  const dur=audioEl.duration || queue[currentIndex]?.ref.duration ||0;
  const ratio=dur? audioEl.currentTime/dur:0;
  document.getElementById("seekFill").style.width=(ratio*100)+"%";
  document.getElementById("seekHandle").style.left=(ratio*100)+"%";
  document.getElementById("curTime").textContent=fmt(audioEl.currentTime);
});
audioEl.addEventListener("ended", ()=>{ if(queue.length) loadTrack(currentIndex+1, true); });
document.getElementById("seekTrack").addEventListener("click", e=>{
  const rect=e.currentTarget.getBoundingClientRect();
  const ratio=Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width));
  const dur=audioEl.duration || queue[currentIndex]?.ref.duration ||0;
  audioEl.currentTime=ratio*dur;
});
document.getElementById("volSlider").addEventListener("input", e=> audioEl.volume=parseFloat(e.target.value));

async function insertFiles(files){
  const list=Array.from(files).filter(f=> f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name));
  if(!list.length){ showToast("No audio files"); return; }
  for(const file of list){
    const base=file.name.replace(/\.[^.]+$/,"");
    const m=base.match(/^(.+?)\s*-\s*(.+)$/);
    const artist=m? m[1]: "Unknown Artist";
    const title=m? m[2]: base;
    // probe duration
    let duration=null;
    try{
      const url=URL.createObjectURL(file);
      duration=await new Promise((res)=>{ const a=new Audio(); a.src=url; a.addEventListener("loadedmetadata",()=>{ res(a.duration); URL.revokeObjectURL(url); }, {once:true}); setTimeout(()=>res(null),3000); });
    }catch{}
    const id=await idbAdd({title, artist, duration, blob:file, name:file.name});
    const url=URL.createObjectURL(file);
    personalTracks.push({id,title,artist,duration,url,blob:file});
  }
  rebuildQueue(); renderPersonal(); renderQueue();
  if(currentIndex===-1 && queue.length) loadTrack(0,false);
  document.getElementById("emptyState").hidden=true;
  document.getElementById("npContent").hidden=false;
}
document.getElementById("insertBig").addEventListener("click", ()=> document.getElementById("fileInput").click());
document.getElementById("fileInput").addEventListener("change", e=>{ if(e.target.files.length) insertFiles(e.target.files); e.target.value=""; });
const playerCard=document.getElementById("playerCard");
["dragenter","dragover"].forEach(ev=> playerCard.addEventListener(ev, e=>{ e.preventDefault(); playerCard.style.outline="2px dashed var(--accent)"; }));
["dragleave","drop"].forEach(ev=> playerCard.addEventListener(ev, e=>{ e.preventDefault(); playerCard.style.outline=""; }));
playerCard.addEventListener("drop", e=>{ if(e.dataTransfer.files.length) insertFiles(e.dataTransfer.files); });
document.getElementById("clearPersistBtn").addEventListener("click", async()=>{ await idbClear(); personalTracks.forEach(t=> URL.revokeObjectURL(t.url)); personalTracks=[]; rebuildQueue(); renderPersonal(); renderQueue(); });

// comments
document.getElementById("commentForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!me){ openAuth("login"); return; }
  const entry=queue[currentIndex];
  if(!entry || entry.kind!=="community"){ showToast("Pick a community track first"); return; }
  const text=document.getElementById("commentText").value.trim();
  if(!text) return;
  const r=await authedFetch(`/api/tracks/${entry.ref.id}/comments`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text})});
  const j=await r.json();
  if(!r.ok){ showToast(j.error); return; }
  document.getElementById("commentText").value="";
  loadTrackComments(entry.ref.id);
});
document.getElementById("likeBtn").addEventListener("click", async()=>{
  if(!me){ openAuth("login"); return; }
  const entry=queue[currentIndex];
  if(!entry || entry.kind!=="community") return;
  const r=await authedFetch(`/api/tracks/${entry.ref.id}/like`, {method:"POST"});
  const j=await r.json();
  document.getElementById("likeCount").textContent=`${j.likes} likes`;
});
document.getElementById("downloadBtn").addEventListener("click", ()=>{
  const entry=queue[currentIndex];
  if(!entry || entry.kind!=="community") return;
  window.location.href=`/api/tracks/${entry.ref.id}/download`;
});

// viz
let audioCtx, analyser, rafId;
function ensureAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const src=audioCtx.createMediaElementSource(audioEl);
  analyser=audioCtx.createAnalyser(); analyser.fftSize=64;
  src.connect(analyser); analyser.connect(audioCtx.destination);
}
function startViz(){
  if(!analyser) return;
  const data=new Uint8Array(analyser.frequencyBinCount);
  (function loop(){
    rafId=requestAnimationFrame(loop);
    analyser.getByteFrequencyData(data);
    const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const bars=24, gap=2, bw=(w-gap*(bars-1))/bars;
    for(let i=0;i<bars;i++){
      const v=data[Math.floor(i*data.length/bars)]/255;
      const bh=v*(h-4);
      ctx.fillStyle="#1a1a18";
      ctx.fillRect(i*(bw+gap), h-bh-2, bw, bh);
    }
  })();
}
function stopViz(){ cancelAnimationFrame(rafId); ctx.clearRect(0,0,canvas.width,canvas.height); }

// detect GitHub Pages static mode (no backend)
fetch("/api/health", {cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error(); }).catch(()=>{
  const b=document.getElementById("pagesBanner"); if(b) b.hidden=false;
  // also hint in community status
  const cs=document.getElementById("communityStatus"); if(cs) cs.textContent="Static demo — backend not reachable on GitHub Pages.";
});
// init
refreshMe().then(loadPersonal);
loadPersonal();
