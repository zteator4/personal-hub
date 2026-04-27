/* ============================================================
   DayDeck v3 — main.js
   Warm editorial dashboard: sidebar nav, productivity + learning split
   ============================================================ */
'use strict';

const KEY = 'daydeck_v3';

/* ── WMO weather codes ─────────────────────────────────────── */
const WMO = {
  0:['☀️','Clear'],1:['🌤','Mainly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],
  45:['🌫️','Foggy'],48:['🌫️','Icy fog'],51:['🌦','Drizzle'],53:['🌦','Drizzle'],55:['🌧','Heavy drizzle'],
  61:['🌧','Light rain'],63:['🌧','Rain'],65:['🌧','Heavy rain'],71:['❄️','Light snow'],
  73:['❄️','Snow'],75:['❄️','Heavy snow'],80:['🌦','Showers'],81:['🌧','Showers'],82:['⛈','Storms'],
  95:['⛈','Thunderstorm'],96:['⛈','Thunderstorm'],99:['⛈','Severe storm']
};

/* ── Default state ──────────────────────────────────────────── */
const DEFAULTS = {
  name:'', city:'Boston', team:'', topics:'technology,finance,sports',
  accent:'clay', dwGoal:3, openai:'',
  todos:[], habits:[], ahas:[], readLater:[],
  winText:'', winProgress:0,
  dwSeconds:0, dwSession:1, dwDone:false,
  tasksCompleted:0, streak:0, lastActive:null,
  onboardingDone:false
};

let S = {};

/* ── Helpers ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
function merge(def, saved) {
  const out = {...def};
  for (const k of Object.keys(saved||{})) {
    if (k in out && typeof out[k]==='object' && !Array.isArray(out[k])) out[k]=merge(out[k],saved[k]);
    else out[k]=saved[k];
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════════ */
const OB = {
  step: 1,
  next() { if (this.step<4){this.step++;this.show(this.step);} },
  prev() { if (this.step>1){this.step--;this.show(this.step);} },
  show(n) {
    document.querySelectorAll('.ob-step').forEach(el=>el.classList.remove('active'));
    document.querySelector(`.ob-step[data-step="${n}"]`).classList.add('active');
    document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i===n-1));
  },
  setAccent(a,btn) {
    S.accent=a; document.documentElement.dataset.accent=a;
    document.querySelectorAll('.ob-acc').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  },
  finish() {
    S.name    = $('ob-name').value.trim();
    S.city    = $('ob-city').value.trim()||'Boston';
    S.team    = $('ob-team').value.trim();
    S.topics  = $('ob-topics').value.trim()||'technology';
    S.dwGoal  = parseInt($('ob-dwgoal').value)||3;
    S.onboardingDone=true;
    save(); launch();
  }
};

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
const Nav = {
  current:'home',
  go(view, btn) {
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    $(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.rail-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    this.current=view;
    /* Sync learn view lists */
    if (view==='learn') { Aha.renderFull(); ReadLater.renderFull(); NewsWidget.renderFull(); }
    if (view==='tasks') TaskView.render();
    if (view==='archive') Archive.render();
  }
};

/* ═══════════════════════════════════════════════════════════
   GREETING + STREAK
═══════════════════════════════════════════════════════════ */
function updateGreeting() {
  const h = new Date().getHours();
  const tod = h<12?'morning':h<17?'afternoon':'evening';
  const name = S.name?`, ${S.name}`:'';
  $('greeting').textContent = `Good ${tod}${name}.`;
  $('greeting-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  /* Streak logic */
  const today = new Date().toDateString();
  if (S.lastActive !== today) {
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (S.lastActive === yesterday) S.streak = (S.streak||0)+1;
    else if (S.lastActive !== today) S.streak = 1;
    S.lastActive = today;
    save();
  }
  $('pulse-streak').textContent = S.streak||0;
}

function updatePulse() {
  $('pulse-tasks').textContent = S.tasksCompleted||0;
  $('pulse-streak').textContent = S.streak||0;
}

function updateNextUp() {
  const first = S.todos.find(t=>!t.done);
  $('next-up-task').textContent = first ? first.text : 'Nothing scheduled — add a task below.';
}

/* ═══════════════════════════════════════════════════════════
   QUICK CAPTURE (NLP-style parser)
═══════════════════════════════════════════════════════════ */
const Capture = {
  init() {
    const inp = $('capture-input');
    inp.addEventListener('keydown', e => {
      if (e.key==='Enter' && inp.value.trim()) {
        this.parse(inp.value.trim());
        inp.value='';
      }
    });
  },

  parse(text) {
    const lower = text.toLowerCase();

    /* Detect "read: ..." or "read later: ..." */
    if (lower.startsWith('read:') || lower.startsWith('read later:')) {
      const content = text.replace(/^read later?:\s*/i,'').trim();
      ReadLater.addItem(content, text);
      this.flash('Added to Read Later ✓');
      return;
    }

    /* Detect "aha: ..." or "insight: ..." */
    if (lower.startsWith('aha:') || lower.startsWith('insight:') || lower.startsWith('note:')) {
      const content = text.replace(/^(aha|insight|note):\s*/i,'').trim();
      Aha.addItem(content);
      this.flash('Aha moment saved ✓');
      return;
    }

    /* Detect "win: ..." */
    if (lower.startsWith('win:')) {
      const content = text.replace(/^win:\s*/i,'').trim();
      S.winText = content; save(); Win.render();
      this.flash('Win the day updated ✓');
      return;
    }

    /* Default: add as task, try to extract time/day hints */
    let taskText = text;
    const timeMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}(am|pm|:\d{2}))/i);
    if (timeMatch) {
      /* Just append the parsed hint in parentheses for now */
      taskText = text;
    }
    S.todos.push({ text: taskText, done: false, id: Date.now(), tag: this.detectTag(lower) });
    save(); Todo.render(); updateNextUp();
    this.flash('Task added ✓');
  },

  detectTag(lower) {
    if (lower.includes('call')||lower.includes('email')||lower.includes('meet')) return 'comm';
    if (lower.includes('read')||lower.includes('research')||lower.includes('learn')) return 'learn';
    if (lower.includes('write')||lower.includes('draft')||lower.includes('create')) return 'create';
    if (lower.includes('review')||lower.includes('check')||lower.includes('audit')) return 'review';
    return 'task';
  },

  flash(msg) {
    const inp = $('capture-input');
    inp.placeholder = msg;
    setTimeout(()=>{ inp.placeholder="Quick capture — type anything and press Enter. Try: 'Call dentist Friday 3pm' or 'Read: article about AI'"; }, 2000);
  }
};

/* ═══════════════════════════════════════════════════════════
   TO-DO
═══════════════════════════════════════════════════════════ */
const Todo = {
  render() {
    const el = $('todo-list'); if(!el) return;
    el.innerHTML = !S.todos.length
      ? `<p class="empty-msg">No tasks yet — use the capture bar above.</p>`
      : S.todos.slice(0,8).map((t,i)=>`
        <div class="todo-item ${t.done?'done':''}" onclick="Todo.toggle(${i})">
          <div class="todo-cb">${t.done?'✓':''}</div>
          <span class="todo-txt">${esc(t.text)}</span>
          <button class="todo-del" onclick="event.stopPropagation();Todo.remove(${i})">✕</button>
        </div>`).join('');
    const left = S.todos.filter(t=>!t.done).length;
    const meta = $('todo-meta'); if(meta) meta.textContent=`${left} left`;
    updateNextUp();
    updatePulse();
  },
  add() {
    const inp=$('todo-input'); if(!inp||!inp.value.trim()) return;
    S.todos.push({text:inp.value.trim(),done:false,id:Date.now(),tag:Capture.detectTag(inp.value.toLowerCase())});
    inp.value=''; save(); this.render();
  },
  toggle(i) {
    S.todos[i].done=!S.todos[i].done;
    if(S.todos[i].done){ S.tasksCompleted=(S.tasksCompleted||0)+1; }
    else { S.tasksCompleted=Math.max(0,(S.tasksCompleted||1)-1); }
    save(); this.render(); updatePulse();
  },
  remove(i) { S.todos.splice(i,1); save(); this.render(); }
};

/* ═══════════════════════════════════════════════════════════
   DEEP WORK TIMER
═══════════════════════════════════════════════════════════ */
const Timer = {
  _interval: null,
  running: false,

  init() {
    const goalSecs = (S.dwGoal||3)*3600;
    const label = $('timer-goal-label'); if(label) label.textContent=`Goal: ${S.dwGoal}h`;
    const fg = $('focus-goal-display'); if(fg) fg.textContent=`${S.dwGoal} hours`;
    this.render();
  },

  toggle() {
    if (this.running) { this.pause(); } else { this.start(); }
  },

  start() {
    this.running=true;
    $('timer-start-btn').textContent='Pause';
    const fb=$('focus-start-btn'); if(fb) fb.textContent='Pause';
    this._interval=setInterval(()=>{
      S.dwSeconds=(S.dwSeconds||0)+1;
      this.render();
      /* Auto-save every 30s */
      if(S.dwSeconds%30===0) save();
    },1000);
  },

  pause() {
    this.running=false;
    clearInterval(this._interval);
    $('timer-start-btn').textContent='Resume';
    const fb=$('focus-start-btn'); if(fb) fb.textContent='Resume';
    save();
  },

  reset() {
    this.pause();
    S.dwSeconds=0; S.dwSession=(S.dwSession||1)+1;
    $('timer-start-btn').textContent='Start';
    const fb=$('focus-start-btn'); if(fb) fb.textContent='Start Session';
    save(); this.render();
  },

  render() {
    const secs = S.dwSeconds||0;
    const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
    const display=h>0?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    const td=$('timer-display'); if(td) td.textContent=display;
    const ft=$('focus-timer');   if(ft) ft.textContent=display;

    const pct=Math.min(100,Math.round((secs/((S.dwGoal||3)*3600))*100));
    const tp=$('timer-progress'); if(tp) tp.style.width=`${pct}%`;
    const fp=$('focus-progress-bar'); if(fp) fp.style.width=`${pct}%`;

    const sl=$('timer-session'); if(sl) sl.textContent=`Session ${S.dwSession||1}`;
    const sb=$('focus-session-badge'); if(sb) sb.textContent=`Session ${S.dwSession||1}`;
    const fl=$('focus-label'); if(fl) fl.textContent=this.running?`${pct}% of daily goal`:'Ready to focus';

    /* Update pulse */
    const dw=$('dw-display');
    if(dw) dw.textContent=h>0?`${h}:${String(m).padStart(2,'0')}`:`${m}m`;
  }
};

/* ═══════════════════════════════════════════════════════════
   HABITS
═══════════════════════════════════════════════════════════ */
const Habits = {
  DEFAULTS:['Exercise','Read 30 min','Meditate','No phone morning'],
  render() {
    if (!S.habits.length) {
      S.habits=this.DEFAULTS.map(name=>({name,done:false,streak:0,lastDate:null}));
      save();
    }
    const el=$('habit-grid'); if(!el) return;
    el.innerHTML=S.habits.map((h,i)=>`
      <div class="habit-item ${h.done?'done':''}" onclick="Habits.toggle(${i})">
        <div class="habit-chk">${h.done?'✓':''}</div>
        <span class="habit-name">${esc(h.name)}</span>
        <span class="habit-streak">${h.streak>0?h.streak+'🔥':''}</span>
      </div>`).join('');
    const done=S.habits.filter(h=>h.done).length;
    const meta=$('habit-meta'); if(meta) meta.textContent=`${done}/${S.habits.length}`;
  },
  toggle(i) {
    const h=S.habits[i], yest=new Date(Date.now()-86400000).toDateString();
    h.done=!h.done;
    if(h.done){h.streak=(h.lastDate&&new Date(h.lastDate).toDateString()===yest)?h.streak+1:1;h.lastDate=new Date().toISOString();}
    else{h.streak=Math.max(0,h.streak-1);}
    save(); this.render();
  }
};

/* ═══════════════════════════════════════════════════════════
   WIN THE DAY
═══════════════════════════════════════════════════════════ */
const Win = {
  render() {
    const el=$('win-text'); if(!el) return;
    el.textContent=S.winText||"What's the one thing that would make today a win?";
    const pw=$('win-progress-wrap');
    if(S.winText&&S.winProgress>0){
      if(pw) pw.classList.remove('hidden');
      const bar=$('win-progress-bar'); if(bar) bar.style.setProperty('--prog',S.winProgress+'%');
      const lbl=$('win-progress-label'); if(lbl) lbl.textContent=S.winProgress+'%';
    } else { if(pw) pw.classList.add('hidden'); }
  },
  edit() {
    const text=prompt('What would make today a win?',S.winText||'');
    if(text===null) return;
    S.winText=text.trim();
    if(S.winText){
      const pct=prompt('Progress? (0-100)','0');
      S.winProgress=Math.min(100,Math.max(0,parseInt(pct)||0));
    }
    save(); this.render();
  }
};

/* ═══════════════════════════════════════════════════════════
   NEWS (RSS via allorigins)
═══════════════════════════════════════════════════════════ */
const NewsWidget = {
  FEEDS:{
    technology:'http://feeds.arstechnica.com/arstechnica/index',
    finance:'https://feeds.reuters.com/reuters/businessNews',
    sports:'http://feeds.bbci.co.uk/sport/rss.xml',
    science:'https://www.sciencedaily.com/rss/all.xml',
    default:'http://feeds.bbci.co.uk/news/rss.xml'
  },
  _articles:[],

  async refresh() {
    const els=[$('news-list')].filter(Boolean);
    els.forEach(el=>{ el.innerHTML=`<p class="empty-msg loading-pulse">Loading…</p>`; });

    const topic=(S.topics||'').split(',')[0].trim().toLowerCase();
    const feedUrl=this.FEEDS[topic]||this.FEEDS.default;
    const topicLabel=$('news-topic-tag');
    if(topicLabel) topicLabel.textContent=topic||'Top news';

    try {
      const r=await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`);
      if(!r.ok) throw 0;
      const {contents}=await r.json();
      const doc=new DOMParser().parseFromString(contents,'text/xml');
      const items=[...doc.querySelectorAll('item')].slice(0,8);
      if(!items.length) throw 0;

      this._articles=items.map(item=>({
        title:item.querySelector('title')?.textContent?.trim()||'Untitled',
        link:item.querySelector('link')?.textContent?.trim()||'#',
        pub:item.querySelector('pubDate')?.textContent||''
      }));
      this.renderAll();
    } catch {
      els.forEach(el=>{ el.innerHTML=`<p class="empty-msg">Couldn't load news. Try refreshing.</p>`; });
    }
  },

  renderAll() {
    const html=this._articles.map(a=>`
      <div class="news-item">
        <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>
        <div class="news-src">${this.ago(a.pub)}</div>
      </div>`).join('');
    const el=$('news-list'); if(el) el.innerHTML=html||`<p class="empty-msg">No articles.</p>`;
  },

  renderFull() {
    const html=this._articles.map(a=>`
      <div class="news-item">
        <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>
        <div class="news-src">${this.ago(a.pub)}</div>
      </div>`).join('');
    const el=$('news-list-full'); if(el) el.innerHTML=html||`<p class="empty-msg">No articles loaded yet.</p>`;
  },

  ago(s) {
    if(!s) return '';
    const diff=Math.floor((Date.now()-new Date(s))/60000);
    if(diff<60) return `${diff}m ago`;
    if(diff<1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  }
};

/* ═══════════════════════════════════════════════════════════
   AHA MOMENTS
═══════════════════════════════════════════════════════════ */
const Aha = {
  render() {
    const el=$('aha-list'); if(!el) return;
    if(!S.ahas.length){el.innerHTML=`<p class="empty-msg">No insights yet — capture an aha moment below.</p>`;return;}
    el.innerHTML=S.ahas.slice(0,4).map((a,i)=>`
      <div class="aha-item">
        ${esc(a.text)}
        <button class="aha-del" onclick="Aha.remove(${i})">✕</button>
      </div>`).join('');
  },
  renderFull() {
    const el=$('aha-list-full'); if(!el) return;
    if(!S.ahas.length){el.innerHTML=`<p class="empty-msg">No insights yet.</p>`;return;}
    el.innerHTML=S.ahas.map((a,i)=>`
      <div class="aha-item">
        ${esc(a.text)}
        <span class="aha-del" style="opacity:1;font-size:0.6rem;color:var(--ink-3)">${a.date||''}</span>
      </div>`).join('');
  },
  add() {
    const row=$('aha-add-row'); if(row) row.classList.toggle('hidden');
    const inp=$('aha-input'); if(inp) inp.focus();
  },
  addItem(text) {
    S.ahas.unshift({text,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
    save(); this.render();
  },
  save() {
    const inp=$('aha-input'); if(!inp||!inp.value.trim()) return;
    this.addItem(inp.value.trim());
    inp.value='';
    $('aha-add-row').classList.add('hidden');
  },
  remove(i){ S.ahas.splice(i,1); save(); this.render(); }
};

/* ═══════════════════════════════════════════════════════════
   READ LATER
═══════════════════════════════════════════════════════════ */
const ReadLater = {
  render() {
    const el=$('read-list'); if(!el) return;
    if(!S.readLater.length){el.innerHTML=`<p class="empty-msg">Nothing queued — type 'Read: [URL or title]' to add.</p>`;return;}
    el.innerHTML=S.readLater.slice(0,6).map((r,i)=>`
      <div class="read-item ${r.done?'read-done':''}">
        <div class="read-dot"></div>
        <a class="read-link" href="${r.url&&r.url.startsWith('http')?esc(r.url):'#'}"
           target="_blank" rel="noopener" onclick="${r.url?'':'event.preventDefault()'}">${esc(r.title)}</a>
        <button class="read-del" onclick="ReadLater.toggle(${i})">${r.done?'↺':'✓'}</button>
        <button class="read-del" onclick="ReadLater.remove(${i})">✕</button>
      </div>`).join('');
  },
  renderFull() {
    const el=$('read-list-full'); if(!el) return;
    if(!S.readLater.length){el.innerHTML=`<p class="empty-msg">Nothing queued yet.</p>`;return;}
    el.innerHTML=S.readLater.map((r,i)=>`
      <div class="read-item ${r.done?'read-done':''}">
        <div class="read-dot"></div>
        <a class="read-link" href="${r.url&&r.url.startsWith('http')?esc(r.url):'#'}"
           target="_blank" rel="noopener">${esc(r.title)}</a>
        <button class="read-del" onclick="ReadLater.toggle(${i})">${r.done?'↺':'✓'}</button>
        <button class="read-del" onclick="ReadLater.remove(${i})">✕</button>
      </div>`).join('');
  },
  addItem(title, raw) {
    /* Try to extract URL from raw text */
    const urlMatch = raw.match(/https?:\/\/\S+/);
    S.readLater.unshift({title, url:urlMatch?urlMatch[0]:'', done:false, added:Date.now()});
    save(); this.render();
  },
  addPrompt() {
    const t=prompt('Title or URL to save:'); if(!t) return;
    this.addItem(t,t); this.renderFull();
  },
  toggle(i){ S.readLater[i].done=!S.readLater[i].done; save(); this.render(); this.renderFull(); },
  remove(i){ S.readLater.splice(i,1); save(); this.render(); this.renderFull(); }
};

/* ═══════════════════════════════════════════════════════════
   SPORTS (TheSportsDB free tier)
═══════════════════════════════════════════════════════════ */
const Sports = {
  async refresh() {
    const team=S.team; const el=$('sports-content'); if(!el) return;
    const title=$('sports-title'); if(title&&team) title.textContent=team;
    if(!team){el.innerHTML=`<p class="empty-msg">Set your team in Settings.</p>`;return;}
    el.innerHTML=`<p class="empty-msg loading-pulse">Loading…</p>`;
    try {
      const sr=await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`);
      const sd=await sr.json();
      if(!sd.teams?.length) throw 0;
      const tid=sd.teams[0].idTeam;
      const nr=await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${tid}`);
      const nd=await nr.json();
      if(!nd.events?.length) throw 0;
      const ev=nd.events[0];
      const date=new Date(ev.dateEvent+'T'+(ev.strTime||'00:00:00'));
      const dlabel=date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      el.innerHTML=`
        <div class="sports-match">
          <div class="sports-teams">
            <div class="sports-team">
              <span class="sports-tname">${esc(ev.strHomeTeam)}</span>
              <span class="sports-score">${ev.intHomeScore??'–'}</span>
            </div>
            <span class="sports-vs">vs</span>
            <div class="sports-team">
              <span class="sports-tname">${esc(ev.strAwayTeam)}</span>
              <span class="sports-score">${ev.intAwayScore??'–'}</span>
            </div>
          </div>
          <div class="sports-info">${dlabel}</div>
        </div>`;
    } catch { el.innerHTML=`<p class="empty-msg">Couldn't load. Check team name.</p>`; }
  }
};

/* ═══════════════════════════════════════════════════════════
   WEATHER (Open-Meteo, no key)
═══════════════════════════════════════════════════════════ */
const Weather = {
  async init() {
    const city=S.city||'Boston';
    try {
      const gr=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      if(!gr.ok) throw 0;
      const gd=await gr.json();
      if(!gd.results?.length) throw 0;
      const {latitude:lat,longitude:lon,name,country_code}=gd.results[0];
      const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`);
      if(!wr.ok) throw 0;
      const wd=await wr.json();
      const code=wd.current.weather_code;
      const [icon,desc]=WMO[code]||['🌡️','—'];
      const temp=Math.round(wd.current.temperature_2m);
      const xi=$('wx-icon'),xt=$('wx-temp'),xd=$('wx-desc'),xl=$('wx-loc');
      if(xi) xi.textContent=icon;
      if(xt) xt.textContent=`${temp}°F`;
      if(xd) xd.textContent=desc;
      if(xl) xl.textContent=`${name}, ${country_code}`;
    } catch {
      const xi=$('wx-icon'),xt=$('wx-temp');
      if(xi) xi.textContent='⛅'; if(xt) xt.textContent='—°';
    }
  }
};

/* ═══════════════════════════════════════════════════════════
   AI BRIEF (OpenAI)
═══════════════════════════════════════════════════════════ */
const Brief = {
  async fetch() {
    const el=$('brief-text'); if(!el) return;
    const key=S.openai;
    if(!key){
      el.innerHTML=`Add an OpenAI key in Settings to enable your AI daily brief.`;
      return;
    }
    el.innerHTML=`<span class="loading-pulse">Generating your brief…</span>`;
    const todos=S.todos.filter(t=>!t.done).map(t=>t.text).join(', ')||'none';
    const h=new Date().getHours();
    const tod=h<12?'morning':h<17?'afternoon':'evening';
    const prompt=`Write a concise 2-sentence ${tod} brief for ${S.name||'the user'} in ${S.city}. Today is ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}. Open tasks: ${todos}. Be direct, warm, end with one sharp focus recommendation. No bullet points.`;
    try {
      const r=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
        body:JSON.stringify({model:'gpt-4o-mini',max_tokens:90,messages:[{role:'user',content:prompt}]})
      });
      if(!r.ok) throw 0;
      const d=await r.json();
      el.textContent=d.choices[0].message.content.trim();
    } catch { el.textContent='Couldn\'t generate brief — check your OpenAI key in Settings.'; }
  }
};

/* ═══════════════════════════════════════════════════════════
   TASK FULL VIEW
═══════════════════════════════════════════════════════════ */
const TAG_LABELS={task:'Task',comm:'Comm',learn:'Learn',create:'Create',review:'Review'};
const TaskView = {
  _filter:'all',
  filter(f,btn) {
    this._filter=f;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    this.render();
  },
  render() {
    const el=$('task-full-list'); if(!el) return;
    let todos=S.todos;
    if(this._filter==='active') todos=todos.filter(t=>!t.done);
    if(this._filter==='done')   todos=todos.filter(t=>t.done);
    if(!todos.length){el.innerHTML=`<p class="empty-msg" style="padding:.5rem">No tasks here.</p>`;return;}
    el.innerHTML=todos.map((t,i)=>`
      <div class="task-full-item ${t.done?'done':''}" onclick="Todo.toggle(${S.todos.indexOf(t)});TaskView.render()">
        <div class="todo-cb">${t.done?'✓':''}</div>
        <span class="todo-txt" style="font-size:0.85rem">${esc(t.text)}</span>
        ${t.tag?`<span class="task-tag">${TAG_LABELS[t.tag]||t.tag}</span>`:''}
        <button class="todo-del" style="opacity:1" onclick="event.stopPropagation();Todo.remove(${S.todos.indexOf(t)});TaskView.render()">✕</button>
      </div>`).join('');
  }
};

/* ═══════════════════════════════════════════════════════════
   ARCHIVE
═══════════════════════════════════════════════════════════ */
const Archive = {
  render() {
    const el=$('archive-list'); if(!el) return;
    const done=S.todos.filter(t=>t.done);
    if(!done.length){el.innerHTML=`<p class="empty-msg" style="padding:.5rem">No completed tasks yet.</p>`;return;}
    el.innerHTML=done.map((t,i)=>`
      <div class="task-full-item done">
        <div class="todo-cb" style="background:var(--accent);border-color:var(--accent);color:#fff;font-size:.6rem">✓</div>
        <span class="todo-txt" style="text-decoration:line-through;color:var(--ink-3)">${esc(t.text)}</span>
      </div>`).join('');
  }
};

/* ═══════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════ */
const Settings = {
  open() {
    $('s-name').value  =S.name;
    $('s-city').value  =S.city;
    $('s-team').value  =S.team;
    $('s-topics').value=S.topics;
    $('s-dwgoal').value=S.dwGoal;
    $('s-openai').value=S.openai||'';
    document.querySelectorAll('.s-accents .ob-acc').forEach(b=>b.classList.toggle('active',b.dataset.accent===S.accent));
    $('settings-overlay').classList.remove('hidden');
  },
  close(){ $('settings-overlay').classList.add('hidden'); },
  setAccent(a,btn){
    S.accent=a; document.documentElement.dataset.accent=a;
    document.querySelectorAll('.ob-acc').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  },
  save(){
    S.name   =$('s-name').value.trim();
    S.city   =$('s-city').value.trim()||'Boston';
    S.team   =$('s-team').value.trim();
    S.topics =$('s-topics').value.trim();
    S.dwGoal =parseInt($('s-dwgoal').value)||3;
    S.openai =$('s-openai').value.trim();
    save();
    updateGreeting(); Timer.init();
    Weather.init(); Sports.refresh(); Brief.fetch();
    this.close();
  },
  reset(){ if(!confirm('Reset all data?')) return; localStorage.removeItem(KEY); location.reload(); }
};

/* ═══════════════════════════════════════════════════════════
   LAUNCH
═══════════════════════════════════════════════════════════ */
function launch() {
  $('onboarding').classList.add('hidden');
  $('app').classList.remove('hidden');
  document.documentElement.dataset.accent = S.accent||'clay';

  updateGreeting();
  updatePulse();
  Todo.render();
  Todo.init?.();
  Habits.render();
  Win.render();
  Timer.init();
  Aha.render();
  ReadLater.render();
  Capture.init();
  Weather.init();
  Sports.refresh();
  NewsWidget.refresh();
  Brief.fetch();

  /* Todo Enter key */
  const ti=$('todo-input');
  if(ti) ti.addEventListener('keydown',e=>{ if(e.key==='Enter') Todo.add(); });

  /* Aha Enter (ctrl+enter saves) */
  const ai=$('aha-input');
  if(ai) ai.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) Aha.save(); });
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    S=merge(DEFAULTS,saved||{});
  } catch { S={...DEFAULTS}; }

  document.documentElement.dataset.accent=S.accent||'clay';

  if(!S.onboardingDone){
    $('onboarding').classList.remove('hidden');
    $('app').classList.add('hidden');
  } else {
    $('onboarding').classList.add('hidden');
    launch();
  }
});