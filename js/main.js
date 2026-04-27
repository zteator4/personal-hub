/* ============================================================
   DayDeck v2 — main.js
   Full app: state, widgets, drag-and-drop editor, API integrations
   ============================================================ */
'use strict';

/* ── Constants ──────────────────────────────────────────────── */
const STORAGE_KEY = 'daydeck_v2';

const WEATHER_ICONS = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅','03d':'☁️','03n':'☁️',
  '04d':'☁️','04n':'☁️','09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌦️',
  '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️','50d':'🌫️','50n':'🌫️'
};

const BG_GRADIENTS = {
  aurora: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  ocean:  'linear-gradient(135deg,#0575e6,#021b79)',
  forest: 'linear-gradient(135deg,#134e5e,#71b280)',
  ember:  'linear-gradient(135deg,#232526,#414345)',
  rose:   'linear-gradient(135deg,#f953c6,#b91d73)',
  light:  'linear-gradient(135deg,#e0eafc,#cfdef3)'
};

const WIDGET_META = {
  clock:     { label:'Clock',      icon:'◷', defaultCols:2, defaultRows:1 },
  weather:   { label:'Weather',    icon:'☁', defaultCols:2, defaultRows:2 },
  todo:      { label:'To-Do',      icon:'✓', defaultCols:2, defaultRows:2 },
  news:      { label:'News',       icon:'⊞', defaultCols:2, defaultRows:2 },
  sports:    { label:'Sports',     icon:'⚽', defaultCols:2, defaultRows:1 },
  quote:     { label:'Quote',      icon:'"', defaultCols:2, defaultRows:1 },
  market:    { label:'Markets',    icon:'↗', defaultCols:2, defaultRows:2 },
  habit:     { label:'Habits',     icon:'◉', defaultCols:2, defaultRows:2 },
  countdown: { label:'Countdown',  icon:'⧗', defaultCols:1, defaultRows:1 },
  links:     { label:'Links',      icon:'⊕', defaultCols:2, defaultRows:1 },
};

const DEFAULTS = {
  name:'', city:'Boston', team:'', topics:'technology,sports,finance',
  theme:'dark', accent:'violet', bg:'aurora',
  apiKeys:{ weather:'', gnews:'', openai:'' },
  todos:[], habits:[], countdowns:[], links:[],
  widgets:[],  /* ordered array of widget configs */
  onboardingDone: false
};

/* ── State ──────────────────────────────────────────────────── */
let STATE = {};

/* ── Helpers ────────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch(e) {} }
function deepMerge(def, saved) {
  const out = {...def};
  for (const k of Object.keys(saved||{})) {
    if (k in out && typeof out[k]==='object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], saved[k]);
    } else { out[k] = saved[k]; }
  }
  return out;
}

/* ── Default widget list ────────────────────────────────────── */
function defaultWidgets(selectedMap) {
  const order = ['clock','weather','todo','news','sports','quote','market','habit','countdown','links'];
  return order
    .filter(id => selectedMap[id])
    .map(id => ({
      id,
      cols: WIDGET_META[id].defaultCols,
      rows: WIDGET_META[id].defaultRows,
      font:'cabinet', style:'glass', opacity:80, tint:'none', radius:20
    }));
}


/* ═══════════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════════ */
const OB = {
  step: 1,
  next() {
    if (this.step < 5) { this.step++; this.showStep(this.step); }
  },
  prev() {
    if (this.step > 1) { this.step--; this.showStep(this.step); }
  },
  showStep(n) {
    document.querySelectorAll('.ob-step').forEach(el => el.classList.remove('active'));
    document.querySelector(`.ob-step[data-step="${n}"]`).classList.add('active');
    document.querySelectorAll('.ob-dot').forEach((d,i) => d.classList.toggle('active', i===n-1));
    this.step = n;
  },
  setBg(btn) {
    document.querySelectorAll('.ob-bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.bg = btn.dataset.bg;
    applyBg();
  },
  setAccent(accent, btn) {
    document.querySelectorAll('.ob-accent-row .accent-dot').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.accent = accent;
    document.documentElement.dataset.accent = accent;
  },
  finish() {
    STATE.name   = $('ob-name').value.trim();
    STATE.city   = $('ob-city').value.trim() || 'Boston';
    STATE.team   = $('ob-team').value.trim();
    STATE.topics = $('ob-topics').value.trim() || 'technology';

    const selected = {};
    document.querySelectorAll('.ob-wtoggle').forEach(label => {
      selected[label.dataset.w] = label.querySelector('input').checked;
    });

    STATE.widgets = defaultWidgets(selected);
    STATE.onboardingDone = true;
    save();
    launch();
  }
};


/* ═══════════════════════════════════════════════════════════
   BACKGROUND
═══════════════════════════════════════════════════════════ */
function applyBg() {
  document.body.dataset.bg = STATE.bg || 'aurora';
  /* Sync orb color to accent */
  document.documentElement.dataset.accent = STATE.accent || 'violet';
}


/* ═══════════════════════════════════════════════════════════
   CANVAS + WIDGET RENDERING
═══════════════════════════════════════════════════════════ */
const Canvas = {
  render() {
    const canvas = $('canvas');
    canvas.innerHTML = '';
    STATE.widgets.forEach((wc, idx) => {
      const el = this.buildWidget(wc, idx);
      canvas.appendChild(el);
    });
    /* Load data into each widget */
    Widgets.initAll();
    DragDrop.bind();
  },

  buildWidget(wc, idx) {
    const el = document.createElement('div');
    el.className  = 'widget';
    el.dataset.widget = wc.id;
    el.dataset.idx = idx;
    el.dataset.wstyle = wc.style || 'glass';
    if (wc.tint && wc.tint !== 'none') el.dataset.tint = wc.tint;
    if (wc.font) el.dataset.wfont = wc.font;

    /* Grid sizing */
    el.style.gridColumn = `span ${wc.cols || 2}`;
    el.style.gridRow    = `span ${wc.rows || 1}`;
    el.style.borderRadius = `${wc.radius ?? 20}px`;
    el.style.opacity = (wc.opacity ?? 80) / 100;

    el.innerHTML = `
      <div class="widget-edit-badge">✎</div>
      <div class="w-inner" id="wi-${wc.id}">
        ${this.getTemplate(wc.id)}
      </div>
    `;

    /* Edit mode click handler */
    el.addEventListener('click', () => {
      if ($('canvas').classList.contains('edit-mode')) {
        Editor.openPanel(idx);
      }
    });

    return el;
  },

  getTemplate(id) {
    switch(id) {
      case 'clock': return `
        <div class="clock-time" id="clock-time">--:--</div>
        <div class="clock-date" id="clock-date">---</div>`;

      case 'weather': return `
        <div class="w-hdr">
          <span class="w-label">Weather</span>
          <span class="wx-loc" id="wx-loc">--</span>
        </div>
        <div class="wx-main">
          <div class="wx-icon" id="wx-icon">⛅</div>
          <div class="wx-temp" id="wx-temp">--°</div>
        </div>
        <div class="wx-desc" id="wx-desc">--</div>
        <div class="wx-meta">
          <span id="wx-hum">Humidity: --%</span>
          <span id="wx-wind">Wind: -- mph</span>
        </div>
        <div class="wx-forecast" id="wx-forecast"></div>`;

      case 'todo': return `
        <div class="w-hdr">
          <span class="w-label">Today</span>
          <span class="todo-count" id="todo-count">0 left</span>
        </div>
        <div class="todo-list" id="todo-list"></div>
        <div class="todo-input-row">
          <input class="todo-inp" id="todo-input" placeholder="Add a task…" />
          <button class="todo-add" onclick="Widgets.todo.add()" title="Add">+</button>
        </div>`;

      case 'news': return `
        <div class="w-hdr">
          <span class="w-label">News</span>
          <button class="w-action" onclick="Widgets.news.refresh()" title="Refresh">↺</button>
        </div>
        <div class="news-list" id="news-list">
          <p class="news-empty">Loading…</p>
        </div>`;

      case 'sports': return `
        <div class="w-hdr">
          <span class="w-label" id="sports-label">Sports</span>
          <button class="w-action" onclick="Widgets.sports.refresh()">↺</button>
        </div>
        <div id="sports-content"><p class="sports-empty">Loading…</p></div>`;

      case 'quote': return `
        <div class="q-mark">"</div>
        <div class="q-text" id="q-text">Loading…</div>
        <div class="q-author" id="q-author">—</div>
        <button class="q-refresh" onclick="Widgets.quote.fetch()">↺</button>`;

      case 'market': return `
        <div class="w-hdr">
          <span class="w-label">Markets</span>
          <button class="w-action" onclick="Widgets.market.refresh()">↺</button>
        </div>
        <div class="mkt-list" id="mkt-list"><p class="news-empty">Loading…</p></div>`;

      case 'habit': return `
        <div class="w-hdr"><span class="w-label">Habits</span></div>
        <div class="habit-list" id="habit-list"></div>`;

      case 'countdown': return `
        <div class="w-hdr">
          <span class="w-label">Countdown</span>
          <button class="w-action" onclick="Widgets.countdown.addPrompt()">+</button>
        </div>
        <div class="cd-list" id="cd-list"></div>`;

      case 'links': return `
        <div class="w-hdr">
          <span class="w-label">Quick Links</span>
          <button class="w-action" onclick="Widgets.links.addPrompt()">+</button>
        </div>
        <div class="links-grid" id="links-grid"></div>`;

      default: return `<div class="w-label">${id}</div>`;
    }
  },

  refreshWidget(id) {
    const el = document.querySelector(`[data-widget="${id}"]`);
    if (!el) return;
    const idx = parseInt(el.dataset.idx);
    const wc  = STATE.widgets[idx];
    const inner = el.querySelector('.w-inner');
    inner.innerHTML = this.getTemplate(id);
    Widgets.initOne(id);
  }
};


/* ═══════════════════════════════════════════════════════════
   WIDGET DATA MODULES
═══════════════════════════════════════════════════════════ */
const Widgets = {
  initAll() {
    const ids = STATE.widgets.map(w => w.id);
    ids.forEach(id => this.initOne(id));
    /* Start clock ticker */
    this.clock.start();
    /* Bind todo Enter key (may be re-rendered, so always re-bind) */
    const ti = $('todo-input');
    if (ti) ti.onkeydown = e => { if(e.key==='Enter') this.todo.add(); };
  },

  initOne(id) {
    switch(id) {
      case 'clock':     break; /* handled by start() */
      case 'weather':   this.weather.init(); break;
      case 'todo':      this.todo.render(); break;
      case 'news':      this.news.init(); break;
      case 'sports':    this.sports.init(); break;
      case 'quote':     this.quote.fetch(); break;
      case 'market':    this.market.init(); break;
      case 'habit':     this.habit.render(); break;
      case 'countdown': this.countdown.render(); this.countdown.tick(); break;
      case 'links':     this.links.render(); break;
    }
  },

  /* ── Clock ─────────────────────────────────────────────── */
  clock: {
    _t: null,
    start() {
      clearInterval(this._t);
      this.tick();
      this._t = setInterval(() => this.tick(), 1000);
    },
    tick() {
      const now = new Date();
      const h   = now.getHours(), m = String(now.getMinutes()).padStart(2,'0');
      const ampm= h>=12?'PM':'AM', h12 = ((h%12)||12);
      const tel = $('clock-time'), del = $('clock-date');
      if (tel) tel.textContent = `${h12}:${m} ${ampm}`;
      if (del) del.textContent = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    }
  },

  /* ── Weather — Open-Meteo (no API key required) ───────── */
  weather: {
    /* WMO weather code → emoji + description */
    WMO: {
      0:['☀️','Clear sky'], 1:['🌤','Mainly clear'], 2:['⛅','Partly cloudy'], 3:['☁️','Overcast'],
      45:['🌫️','Foggy'], 48:['🌫️','Icy fog'],
      51:['🌦','Light drizzle'], 53:['🌦','Drizzle'], 55:['🌧','Heavy drizzle'],
      61:['🌧','Light rain'], 63:['🌧','Rain'], 65:['🌧','Heavy rain'],
      71:['❄️','Light snow'], 73:['❄️','Snow'], 75:['❄️','Heavy snow'], 77:['🌨','Snow grains'],
      80:['🌦','Rain showers'], 81:['🌧','Showers'], 82:['⛈','Violent showers'],
      85:['🌨','Snow showers'], 86:['🌨','Heavy snow showers'],
      95:['⛈','Thunderstorm'], 96:['⛈','Thunderstorm w/ hail'], 99:['⛈','Severe thunderstorm'],
    },

    async init() {
      const city = STATE.city || 'Boston';
      try {
        /* Step 1: geocode city name → lat/lon (Open-Meteo geocoding, free, no key) */
        const gr = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        if (!gr.ok) throw 0;
        const gd = await gr.json();
        if (!gd.results?.length) throw 0;
        const { latitude: lat, longitude: lon, name, country_code } = gd.results[0];

        /* Step 2: fetch current + hourly forecast (Open-Meteo, free, no key) */
        const wr = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
          `&daily=weather_code,temperature_2m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`
        );
        if (!wr.ok) throw 0;
        const wd = await wr.json();

        const cur  = wd.current;
        const code = cur.weather_code;
        const [icon, desc] = this.WMO[code] || ['🌡️','Unknown'];

        this.render(
          `${name}, ${country_code}`,
          icon,
          Math.round(cur.temperature_2m),
          desc,
          cur.relative_humidity_2m,
          Math.round(cur.wind_speed_10m)
        );
        this.forecast(wd.daily);
      } catch {
        /* Fallback: show placeholder with city name */
        this.render(city, '⛅', '—', 'Weather unavailable', '—', '—');
      }
    },

    render(loc, icon, temp, desc, hum, wind) {
      const set = (id, v) => { const el=$(id); if(el) el.textContent=v; };
      const tempStr = typeof temp === 'number' ? `${temp}°F` : temp;
      set('wx-loc', loc); set('wx-icon', icon); set('wx-temp', tempStr);
      set('wx-desc', desc);
      set('wx-hum',  hum  !== '—' ? `Humidity: ${hum}%`  : 'Humidity: —');
      set('wx-wind', wind !== '—' ? `Wind: ${wind} mph`   : 'Wind: —');
    },

    forecast(daily) {
      const el = $('wx-forecast'); if(!el) return;
      /* daily.time is array of date strings; skip index 0 (today) */
      const days = daily.time.slice(1,5).map((dateStr, i) => {
        const day  = new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});
        const code = daily.weather_code[i+1];
        const temp = Math.round(daily.temperature_2m_max[i+1]);
        const [icon] = this.WMO[code] || ['🌡️'];
        return { day, icon, temp };
      });
      el.innerHTML = days.map(d =>
        `<div class="wx-day">
           <span class="wx-day-label">${d.day}</span>
           <span class="wx-day-icon">${d.icon}</span>
           <span class="wx-day-temp">${d.temp}°</span>
         </div>`
      ).join('');
    }
  },

  /* ── To-Do ─────────────────────────────────────────────── */
  todo: {
    render() {
      const el = $('todo-list'); if(!el) return;
      const todos = STATE.todos;
      el.innerHTML = !todos.length
        ? `<p style="font-size:.78rem;color:var(--t3);padding:4px 0">No tasks yet.</p>`
        : todos.map((t,i)=>`
          <div class="todo-item ${t.done?'done':''}" onclick="Widgets.todo.toggle(${i})">
            <div class="todo-cb">${t.done?'✓':''}</div>
            <span class="todo-txt">${esc(t.text)}</span>
            <button class="todo-del" onclick="event.stopPropagation();Widgets.todo.remove(${i})">✕</button>
          </div>`).join('');
      const cnt = $('todo-count');
      if (cnt) cnt.textContent = `${todos.filter(t=>!t.done).length} left`;
    },
    add() {
      const inp = $('todo-input'); if(!inp||!inp.value.trim()) return;
      STATE.todos.push({text:inp.value.trim(),done:false});
      inp.value=''; save(); this.render();
    },
    toggle(i) { STATE.todos[i].done=!STATE.todos[i].done; save(); this.render(); },
    remove(i) { STATE.todos.splice(i,1); save(); this.render(); }
  },

  /* ── News — RSS feeds via allorigins proxy (no key required) */
  news: {
    /* Free public RSS feeds — no auth, proxied through allorigins to avoid CORS */
    FEEDS: [
      { name:'BBC News',    url:'http://feeds.bbci.co.uk/news/rss.xml' },
      { name:'Reuters',     url:'https://feeds.reuters.com/reuters/topNews' },
      { name:'AP News',     url:'https://rsshub.app/apnews/topics/apf-topnews' },
      { name:'NPR',         url:'https://feeds.npr.org/1001/rss.xml' },
      { name:'The Guardian',url:'https://www.theguardian.com/world/rss' },
    ],

    async init() { await this.refresh(); },

    async refresh() {
      const el = $('news-list'); if(!el) return;
      el.innerHTML = `<p class="news-empty shimmer-text">Loading headlines…</p>`;

      /* Pick feed based on user topics; default to BBC */
      const topic   = (STATE.topics||'').toLowerCase();
      let   feed    = this.FEEDS[0];
      if (topic.includes('sport'))   feed = { name:'BBC Sport',   url:'http://feeds.bbci.co.uk/sport/rss.xml' };
      if (topic.includes('tech'))    feed = { name:'Ars Technica', url:'http://feeds.arstechnica.com/arstechnica/index' };
      if (topic.includes('finance') || topic.includes('business'))
                                     feed = { name:'Reuters Biz',  url:'https://feeds.reuters.com/reuters/businessNews' };
      if (topic.includes('science')) feed = { name:'ScienceDaily', url:'https://www.sciencedaily.com/rss/all.xml' };

      try {
        /* allorigins.win converts any RSS to JSON — completely free, no key */
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
        const r = await fetch(proxy);
        if (!r.ok) throw 0;
        const { contents } = await r.json();

        /* Parse RSS XML */
        const parser = new DOMParser();
        const doc    = parser.parseFromString(contents, 'text/xml');
        const items  = [...doc.querySelectorAll('item')].slice(0, 7);

        if (!items.length) throw 0;

        el.innerHTML = items.map(item => {
          const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
          const link  = item.querySelector('link')?.textContent?.trim()  || '#';
          const pub   = item.querySelector('pubDate')?.textContent;
          const ago   = pub ? this.ago(pub) : '';
          return `
            <div class="news-item">
              <a href="${link}" target="_blank" rel="noopener">${esc(title)}</a>
              <div class="news-src">${feed.name}${ago ? ' · ' + ago : ''}</div>
            </div>`;
        }).join('');
      } catch {
        /* Try a second feed as fallback */
        try {
          const fb = this.FEEDS[1];
          const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(fb.url)}`;
          const r2 = await fetch(proxy2);
          if (!r2.ok) throw 0;
          const { contents: c2 } = await r2.json();
          const doc2  = new DOMParser().parseFromString(c2, 'text/xml');
          const items2 = [...doc2.querySelectorAll('item')].slice(0,7);
          el.innerHTML = items2.map(item => {
            const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
            const link  = item.querySelector('link')?.textContent?.trim()  || '#';
            return `<div class="news-item"><a href="${link}" target="_blank" rel="noopener">${esc(title)}</a><div class="news-src">${fb.name}</div></div>`;
          }).join('');
        } catch {
          el.innerHTML = `<p class="news-empty">Couldn't load news right now. Try refreshing.</p>`;
        }
      }
    },

    ago(s) {
      const diff = Math.floor((Date.now()-new Date(s))/60000);
      if (diff < 60)   return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
      return `${Math.floor(diff/1440)}d ago`;
    }
  },

  /* ── Sports ────────────────────────────────────────────── */
  sports: {
    async init() { await this.refresh(); },
    async refresh() {
      const el = $('sports-content'); if(!el) return;
      const team = STATE.team;
      if (!team) { el.innerHTML=`<p class="sports-empty">Set your team in Settings.</p>`; return; }
      const label = $('sports-label'); if(label) label.textContent = team;
      el.innerHTML = `<p class="sports-empty" style="animation:shimmer-anim 1.5s infinite">Loading…</p>`;
      try {
        const sr = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`);
        const sd = await sr.json();
        if (!sd.teams?.length) { el.innerHTML=`<p class="sports-empty">Team not found.</p>`; return; }
        const tid = sd.teams[0].idTeam;
        const nr = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${tid}`);
        const nd = await nr.json();
        if (!nd.events?.length) { el.innerHTML=`<p class="sports-empty">No upcoming games.</p>`; return; }
        const ev = nd.events[0];
        const date = new Date(ev.dateEvent+'T'+(ev.strTime||'00:00:00'));
        const dlabel = date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        el.innerHTML = `
          <div class="sports-matchup">
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
          <div class="sports-info">${dlabel} · ${esc(ev.strLeague)}</div>`;
      } catch { el.innerHTML=`<p class="sports-empty">Couldn't load sports data.</p>`; }
    }
  },

  /* ── Quote ─────────────────────────────────────────────── */
  quote: {
    FALLBACKS: [
      {content:'The secret of getting ahead is getting started.',author:'Mark Twain'},
      {content:'Simplicity is the ultimate sophistication.',author:'Leonardo da Vinci'},
      {content:'It does not matter how slowly you go as long as you do not stop.',author:'Confucius'},
      {content:'What we think, we become.',author:'Buddha'},
    ],
    async fetch() {
      const te=$('q-text'), ae=$('q-author'); if(!te||!ae) return;
      te.textContent='Loading…'; ae.textContent='—';
      try {
        const r = await fetch('https://api.quotable.io/random?maxLength=120');
        if (!r.ok) throw 0;
        const d = await r.json();
        te.textContent=d.content; ae.textContent=`— ${d.author}`;
      } catch {
        const q = this.FALLBACKS[Math.floor(Math.random()*this.FALLBACKS.length)];
        te.textContent=q.content; ae.textContent=`— ${q.author}`;
      }
    }
  },

  /* ── Market ────────────────────────────────────────────── */
  market: {
    COINS:['bitcoin','ethereum','solana'],
    NAMES:{bitcoin:'Bitcoin',ethereum:'Ethereum',solana:'Solana'},
    async init() { await this.refresh(); },
    async refresh() {
      const el=$('mkt-list'); if(!el) return;
      el.innerHTML=`<p class="news-empty" style="animation:shimmer-anim 1.5s infinite">Loading…</p>`;
      try {
        const ids=this.COINS.join(',');
        const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if(!r.ok) throw 0;
        const d=await r.json();
        el.innerHTML=this.COINS.map(id=>{
          if(!d[id]) return '';
          const p=d[id].usd, ch=d[id].usd_24h_change, dir=ch>=0?'up':'down', sign=ch>=0?'+':'';
          return `<div class="mkt-item">
            <div><div class="mkt-name">${this.NAMES[id]||id}</div><div class="mkt-sym">${id.slice(0,3).toUpperCase()}</div></div>
            <div style="text-align:right"><div class="mkt-price">$${p.toLocaleString('en-US',{maximumFractionDigits:2})}</div>
            <div class="mkt-${dir}">${sign}${ch.toFixed(2)}%</div></div></div>`;
        }).join('');
      } catch { el.innerHTML=`<p class="news-empty">Couldn't load market data.</p>`; }
    }
  },

  /* ── Habits ────────────────────────────────────────────── */
  habit: {
    DEFAULTS:['Exercise','Read','Meditate'],
    render() {
      if (!STATE.habits.length) {
        STATE.habits=this.DEFAULTS.map(name=>({name,streak:0,done:false,lastDate:null}));
        save();
      }
      const el=$('habit-list'); if(!el) return;
      el.innerHTML=STATE.habits.map((h,i)=>`
        <div class="habit-item ${h.done?'done':''}" onclick="Widgets.habit.toggle(${i})">
          <div class="habit-chk">${h.done?'✓':''}</div>
          <span class="habit-name">${esc(h.name)}</span>
          <span class="habit-streak">${h.streak>0?h.streak+'🔥':''}</span>
        </div>`).join('');
    },
    toggle(i) {
      const h=STATE.habits[i], yest=new Date(Date.now()-86400000).toDateString();
      h.done=!h.done;
      if (h.done) {
        h.streak=(h.lastDate&&new Date(h.lastDate).toDateString()===yest)?h.streak+1:1;
        h.lastDate=new Date().toISOString();
      } else { h.streak=Math.max(0,h.streak-1); }
      save(); this.render();
    }
  },

  /* ── Countdown ─────────────────────────────────────────── */
  countdown: {
    _t:null,
    render() {
      const el=$('cd-list'); if(!el) return;
      if (!STATE.countdowns.length) { el.innerHTML=`<p class="cd-empty">Add an event with the + button.</p>`; return; }
      const now=Date.now();
      el.innerHTML=STATE.countdowns.map(c=>{
        const diff=new Date(c.date).getTime()-now;
        const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000);
        const label=diff<0?'Passed':`${d}d ${h}h ${m}m`;
        return `<div class="cd-item"><div class="cd-name">${esc(c.name)}</div><div class="cd-val">${label}</div><div class="cd-sub">${new Date(c.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div>`;
      }).join('');
    },
    tick() { clearInterval(this._t); this._t=setInterval(()=>this.render(),60000); },
    addPrompt() {
      const name=prompt('Event name:'); if(!name) return;
      const date=prompt('Date (YYYY-MM-DD):'); if(!date) return;
      STATE.countdowns.push({name:name.trim(),date});
      save(); this.render();
    }
  },

  /* ── Links ─────────────────────────────────────────────── */
  links: {
    DEFAULTS:[
      {label:'Gmail',url:'https://mail.google.com',icon:'✉'},
      {label:'Canvas',url:'https://canvas.instructure.com',icon:'◎'},
      {label:'GitHub',url:'https://github.com',icon:'◈'},
      {label:'Calendar',url:'https://calendar.google.com',icon:'◷'},
    ],
    render() {
      if (!STATE.links.length) { STATE.links=[...this.DEFAULTS]; save(); }
      const el=$('links-grid'); if(!el) return;
      el.innerHTML=STATE.links.map(l=>`
        <a class="link-item" href="${l.url}" target="_blank" rel="noopener">
          <div class="link-icon">${l.icon||'◉'}</div>
          <span class="link-lbl">${esc(l.label)}</span>
        </a>`).join('');
    },
    addPrompt() {
      const label=prompt('Label:'); if(!label) return;
      const url=prompt('URL (https://…):'); if(!url) return;
      const icon=prompt('Icon (emoji/symbol):','◉')||'◉';
      STATE.links.push({label:label.trim(),url:url.trim(),icon});
      save(); this.render();
    }
  }
};


/* ═══════════════════════════════════════════════════════════
   DRAG & DROP (reorder widgets)
═══════════════════════════════════════════════════════════ */
const DragDrop = {
  dragIdx: null,

  bind() {
    document.querySelectorAll('.widget').forEach((el, idx) => {
      el.setAttribute('draggable', true);

      el.addEventListener('dragstart', e => {
        if (!$('canvas').classList.contains('edit-mode')) { e.preventDefault(); return; }
        this.dragIdx = idx;
        el.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('is-dragging');
        document.querySelectorAll('.widget').forEach(w => w.classList.remove('drag-over'));
      });

      el.addEventListener('dragover', e => {
        if (!$('canvas').classList.contains('edit-mode')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.widget').forEach(w => w.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });

      el.addEventListener('drop', e => {
        e.preventDefault();
        if (this.dragIdx === null || this.dragIdx === idx) return;
        /* Swap in STATE.widgets array */
        const arr = STATE.widgets;
        [arr[this.dragIdx], arr[idx]] = [arr[idx], arr[this.dragIdx]];
        save();
        Canvas.render();
        this.dragIdx = null;
      });
    });
  }
};


/* ═══════════════════════════════════════════════════════════
   WIDGET EDITOR
═══════════════════════════════════════════════════════════ */
const Editor = {
  activeIdx: null,

  toggle() {
    const canvas  = $('canvas');
    const toolbar = $('edit-toolbar');
    const btn     = $('edit-btn');
    const label   = $('edit-label');
    const isEdit  = canvas.classList.toggle('edit-mode');
    toolbar.classList.toggle('hidden', !isEdit);
    btn.classList.toggle('active', isEdit);
    if (label) label.textContent = isEdit ? 'Editing…' : 'Edit';
    if (!isEdit) this.closePanel();
  },

  openPanel(idx) {
    this.activeIdx = idx;
    const wc = STATE.widgets[idx];
    const meta = WIDGET_META[wc.id];

    $('wpanel-title').textContent = meta?.label || wc.id;

    /* Sync size buttons */
    document.querySelectorAll('.size-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.cols)===wc.cols && parseInt(b.dataset.rows)===wc.rows);
    });

    /* Sync font buttons */
    document.querySelectorAll('.font-btn').forEach(b => b.classList.toggle('active', b.dataset.font===wc.font));

    /* Sync style buttons */
    document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style===wc.style));

    /* Sync opacity */
    $('opacity-slider').value = wc.opacity ?? 80;
    $('opacity-val').textContent = `${wc.opacity ?? 80}%`;

    /* Sync tint */
    document.querySelectorAll('.tint-dot').forEach(b => b.classList.toggle('active', b.dataset.tint===(wc.tint||'none')));

    /* Sync radius */
    $('radius-slider').value = wc.radius ?? 20;
    $('radius-val').textContent = `${wc.radius ?? 20}px`;

    $('wpanel').classList.add('open');
    $('wpanel-backdrop').classList.remove('hidden');
  },

  closePanel() {
    $('wpanel').classList.remove('open');
    $('wpanel-backdrop').classList.add('hidden');
    this.activeIdx = null;
  },

  _updateWidget() {
    if (this.activeIdx === null) return;
    const wc = STATE.widgets[this.activeIdx];
    const el = document.querySelector(`[data-idx="${this.activeIdx}"]`);
    if (!el) return;

    el.style.gridColumn   = `span ${wc.cols}`;
    el.style.gridRow      = `span ${wc.rows}`;
    el.style.opacity      = (wc.opacity ?? 80) / 100;
    el.style.borderRadius = `${wc.radius ?? 20}px`;
    el.dataset.wstyle     = wc.style || 'glass';
    el.dataset.wfont      = wc.font  || 'cabinet';

    if (wc.tint && wc.tint !== 'none') { el.dataset.tint = wc.tint; }
    else { delete el.dataset.tint; }
    save();
  },

  setSize(cols, rows, btn) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].cols = cols;
    STATE.widgets[this.activeIdx].rows = rows;
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._updateWidget();
  },

  setFont(font, btn) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].font = font;
    document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._updateWidget();
  },

  setStyle(style, btn) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].style = style;
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._updateWidget();
  },

  setOpacity(val) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].opacity = parseInt(val);
    $('opacity-val').textContent = `${val}%`;
    this._updateWidget();
  },

  setTint(tint, btn) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].tint = tint;
    document.querySelectorAll('.tint-dot').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._updateWidget();
  },

  setRadius(val) {
    if (this.activeIdx === null) return;
    STATE.widgets[this.activeIdx].radius = parseInt(val);
    $('radius-val').textContent = `${val}px`;
    this._updateWidget();
  },

  removeWidget() {
    if (this.activeIdx === null) return;
    if (!confirm('Remove this widget?')) return;
    STATE.widgets.splice(this.activeIdx, 1);
    save();
    this.closePanel();
    Canvas.render();
  },

  addWidget() {
    /* Build add-widget list */
    const list = $('add-widget-list');
    const existing = new Set(STATE.widgets.map(w => w.id));
    list.innerHTML = Object.entries(WIDGET_META).map(([id, meta]) => `
      <button class="add-w-btn" ${existing.has(id)?'disabled title="Already on dashboard"':''} onclick="Editor.doAdd('${id}')">
        <i>${meta.icon}</i>${meta.label}
      </button>`).join('');
    $('add-modal').classList.remove('hidden');
    $('modal-backdrop').classList.remove('hidden');
  },

  doAdd(id) {
    const meta = WIDGET_META[id];
    STATE.widgets.push({ id, cols:meta.defaultCols, rows:meta.defaultRows, font:'cabinet', style:'glass', opacity:80, tint:'none', radius:20 });
    save();
    this.closeAdd();
    Canvas.render();
  },

  closeAdd() {
    $('add-modal').classList.add('hidden');
    $('modal-backdrop').classList.add('hidden');
  }
};


/* ═══════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════ */
const Settings = {
  open() {
    $('s-name').value   = STATE.name;
    $('s-city').value   = STATE.city;
    $('s-team').value   = STATE.team;
    $('s-topics').value = STATE.topics;
    $('s-openai').value = STATE.apiKeys.openai;

    /* Sync bg buttons */
    document.querySelectorAll('.s-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg===STATE.bg));
    document.querySelectorAll('.s-accent-row .accent-dot').forEach(b => b.classList.toggle('active', b.dataset.accent===STATE.accent));

    this.buildWidgetToggles();
    $('settings-panel').classList.add('open');
    $('settings-backdrop').classList.remove('hidden');
  },

  close() {
    $('settings-panel').classList.remove('open');
    $('settings-backdrop').classList.add('hidden');
  },

  save() {
    STATE.name   = $('s-name').value.trim();
    STATE.city   = $('s-city').value.trim() || 'Boston';
    STATE.team   = $('s-team').value.trim();
    STATE.topics = $('s-topics').value.trim();
    STATE.apiKeys.openai  = $('s-openai').value.trim();

    save();
    applyBg();
    updateGreeting();
    Widgets.weather.init();
    Widgets.news.init();
    Widgets.sports.init();
    App.brief.fetch();
    this.close();
  },

  setBg(bg, btn) {
    STATE.bg = bg;
    applyBg();
    document.querySelectorAll('.s-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg===bg));
  },

  setAccent(accent, btn) {
    STATE.accent = accent;
    document.documentElement.dataset.accent = accent;
    document.querySelectorAll('.s-accent-row .accent-dot').forEach(b => b.classList.toggle('active', b.dataset.accent===accent));
  },

  buildWidgetToggles() {
    const el = $('s-widget-toggles'); if(!el) return;
    const existing = new Set(STATE.widgets.map(w=>w.id));
    el.innerHTML = Object.entries(WIDGET_META).map(([id, meta]) => {
      const on = existing.has(id);
      return `<div class="s-widget-toggle">
        <span>${meta.label}</span>
        <label class="toggle-sw">
          <input type="checkbox" ${on?'checked':''} onchange="Settings.toggleWidget('${id}',this.checked)"/>
          <span class="toggle-sl"></span>
        </label>
      </div>`;
    }).join('');
  },

  toggleWidget(id, on) {
    if (on) {
      if (!STATE.widgets.find(w=>w.id===id)) {
        const meta=WIDGET_META[id];
        STATE.widgets.push({id,cols:meta.defaultCols,rows:meta.defaultRows,font:'cabinet',style:'glass',opacity:80,tint:'none',radius:20});
      }
    } else {
      STATE.widgets = STATE.widgets.filter(w=>w.id!==id);
    }
    save(); Canvas.render();
  },

  reset() {
    if (!confirm('Reset all DayDeck data? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};


/* ═══════════════════════════════════════════════════════════
   AI BRIEF
═══════════════════════════════════════════════════════════ */
const App = {
  brief: {
    async fetch() {
      const key = STATE.apiKeys.openai;
      const el  = $('brief-text');
      if (!key) {
        el.innerHTML = `<span style="color:var(--t3)">Add your OpenAI key in Settings to enable AI daily briefs.</span>`;
        return;
      }
      el.innerHTML = `<span class="shimmer-text">Generating your daily brief…</span>`;
      const name  = STATE.name || 'there';
      const city  = STATE.city || 'your city';
      const todos = STATE.todos.filter(t=>!t.done).map(t=>t.text).join(', ') || 'none';
      const tod   = ['morning','afternoon','evening'][Math.floor(new Date().getHours()/8)|0>2?2:Math.floor(new Date().getHours()/8)|0];
      const prompt= `You are a smart personal assistant. Write a warm, 2-sentence daily brief for ${name} in ${city}. It is ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} ${tod}. Their open tasks: ${todos}. Be concise, personal, and end with a subtle motivational nudge. No bullet points. No greeting prefix.`;
      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
          body:JSON.stringify({model:'gpt-4o-mini',max_tokens:100,messages:[{role:'user',content:prompt}]})
        });
        if(!r.ok) throw 0;
        const d = await r.json();
        el.textContent = d.choices[0].message.content.trim();
      } catch {
        el.innerHTML=`<span style="color:var(--t3)">Couldn't generate brief. Check your OpenAI key.</span>`;
      }
    }
  },

  focusMode: {
    on: false,
    toggle() {
      this.on = !this.on;
      document.body.classList.toggle('focus-mode', this.on);
      $('focus-btn').classList.toggle('active', this.on);
    }
  }
};


/* ═══════════════════════════════════════════════════════════
   GREETING
═══════════════════════════════════════════════════════════ */
function updateGreeting() {
  const h = new Date().getHours();
  const tod = h<12?'morning':h<17?'afternoon':'evening';
  const name = STATE.name ? `, ${STATE.name}` : '';
  const el = $('greeting'); if(el) el.textContent = `Good ${tod}${name}`;
}


/* ═══════════════════════════════════════════════════════════
   LAUNCH
═══════════════════════════════════════════════════════════ */
function launch() {
  $('onboarding').classList.add('hidden');
  $('app').classList.remove('hidden');

  applyBg();
  updateGreeting();
  Canvas.render();
  App.brief.fetch();
}


/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Load state */
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    STATE = deepMerge(DEFAULTS, saved||{});
  } catch { STATE = {...DEFAULTS}; }

  /* Apply accent immediately (before any render) */
  document.documentElement.dataset.accent = STATE.accent || 'violet';

  if (!STATE.onboardingDone) {
    /* Show onboarding with current bg */
    applyBg();
    $('onboarding').classList.remove('hidden');
  } else {
    launch();
  }
});