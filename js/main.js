/* ============================================================
   MyDayDeck v5 — main.js
   3-column layout · SVG rings · Live sports · Zen mode ·
   Journal snapshots · Skeleton screens · Daily summary
   ============================================================ */
'use strict';

const KEY = 'mydaydeck_v5';

/* ── WMO codes ──────────────────────────────────────────── */
const WMO = {
  0:['☀️','Clear'],1:['🌤','Mainly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],
  45:['🌫️','Fog'],48:['🌫️','Icy fog'],51:['🌦','Light drizzle'],53:['🌦','Drizzle'],
  61:['🌧','Light rain'],63:['🌧','Rain'],65:['🌧','Heavy rain'],
  71:['❄️','Light snow'],73:['❄️','Snow'],75:['❄️','Heavy snow'],
  80:['🌦','Showers'],81:['🌧','Showers'],82:['⛈','Storms'],
  95:['⛈','Thunderstorm'],99:['⛈','Severe storm']
};

/* ── Words / Quotes ─────────────────────────────────────── */
const WORDS = [
  {w:'Sonder',pos:'noun',def:'The realization that each passerby has a life as vivid and complex as your own.'},
  {w:'Ephemeral',pos:'adj',def:'Lasting for a very short time; transitory.'},
  {w:'Eudaimonia',pos:'noun',def:'A state of happiness and flourishing; living in accordance with your values.'},
  {w:'Liminal',pos:'adj',def:'Relating to a transitional stage; between two states.'},
  {w:'Sanguine',pos:'adj',def:'Optimistic, especially in a difficult situation.'},
  {w:'Equanimity',pos:'noun',def:'Mental calmness, especially in difficult situations.'},
  {w:'Iconoclast',pos:'noun',def:'A person who attacks or criticizes cherished beliefs.'},
  {w:'Ineffable',pos:'adj',def:'Too great or extreme to be expressed in words.'},
  {w:'Perspicacious',pos:'adj',def:'Having a ready insight; shrewd and astute.'},
  {w:'Meliorism',pos:'noun',def:'The belief that the world can be made better by human effort.'},
];
const PROMPTS = [
  "What's the one thing that, if accomplished today, would make everything else easier?",
  "What are you most grateful for right now, and why?",
  "What challenge are you facing, and what's one step forward?",
  "Describe a recent win, no matter how small.",
  "What habit do you want to reinforce this week?",
  "What did you learn yesterday that you want to apply today?",
  "What would your future self thank you for doing today?",
  "What's draining your energy, and what can you do about it?",
  "What does success look like for you at the end of this week?",
  "What's one thing you've been avoiding that needs your attention?",
  "How are you taking care of yourself today — mentally, physically, emotionally?",
  "Describe your ideal day. What elements of it can you bring into today?",
  "What are you most excited about right now?",
  "What belief might be limiting you?",
  "Who made a positive impact on you recently, and how?",
];
const SPORT_CFG = {
  nba:{sport:'basketball',league:'nba',label:'NBA'},
  nfl:{sport:'americanfootball',league:'nfl',label:'NFL'},
  mlb:{sport:'baseball',league:'mlb',label:'MLB'},
  nhl:{sport:'hockey',league:'nhl',label:'NHL'}
};

/* ── Defaults ───────────────────────────────────────────── */
const DEFAULTS = {
  name:'', city:'Boston', accent:'clay', openai:'',
  leagues:['nba','mlb'], topics:'technology,finance,sports',
  dwGoal:3, wqPref:'quote',
  todos:[], habits:[], goals:[], journalEntries:[], shortcuts:[],
  calEvents:[],
  dwSeconds:0, dwSession:1, tasksCompleted:0, streak:0, lastActive:null,
  onboardingDone:false
};

let S = {};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
function formatTimeInput(val) {
  if (!val) return '';
  const [h, m] = val.split(':');
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

/* ══════════════════════════════════════════════════════════
   MODAL SYSTEM
══════════════════════════════════════════════════════════ */
const Modal = {
  _onSubmit: null,
  _onConfirm: null,
  _toastTimer: null,

  close() {
    $('app-modal').classList.add('hidden');
    $('app-modal-backdrop').classList.add('hidden');
    this._onSubmit = null;
    this._onConfirm = null;
  },

  _open(title, bodyHTML, footerHTML) {
    $('app-modal-title').textContent = title;
    $('app-modal-body').innerHTML = bodyHTML;
    $('app-modal-footer').innerHTML = footerHTML;
    $('app-modal').classList.remove('hidden');
    $('app-modal-backdrop').classList.remove('hidden');
    requestAnimationFrame(() => {
      const first = $('app-modal-body').querySelector('input,select,textarea');
      if (first) first.focus();
    });
  },

  form(title, fields, onSubmit, submitLabel = 'Save') {
    const bodyHTML = fields.map(f => {
      const optLabel = f.required === false ? ' <em>(optional)</em>' : '';
      if (f.type === 'select') {
        return `<label class="am-field"><span>${f.label}</span>
          <select class="inp-sunken styled-select" id="amf-${f.id}">
            ${f.options.map(o => `<option value="${esc(o.value)}"${(f.default||'')===o.value?' selected':''}>${esc(o.label)}</option>`).join('')}
          </select></label>`;
      }
      if (f.type === 'range') {
        const val = f.default || 0;
        return `<label class="am-field"><span>${f.label}</span>
          <div class="am-range-wrap">
            <input type="range" class="am-range" id="amf-${f.id}" min="${f.min||0}" max="${f.max||100}" value="${val}"
              oninput="$('amf-${f.id}-val').textContent=this.value+'%'"/>
            <span class="am-range-val" id="amf-${f.id}-val">${val}%</span>
          </div></label>`;
      }
      const typeAttr = f.type || 'text';
      const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
      const dv = f.default != null ? ` value="${esc(String(f.default))}"` : '';
      const extra = (f.min != null ? ` min="${f.min}"` : '') + (f.max != null ? ` max="${f.max}"` : '');
      return `<label class="am-field"><span>${f.label}${optLabel}</span>
        <input type="${typeAttr}" class="inp-sunken" id="amf-${f.id}"${ph}${dv}${extra}/></label>`;
    }).join('');

    this._open(title, bodyHTML,
      `<button class="btn-ghost" onclick="Modal.close()">Cancel</button>
       <button class="btn-primary" onclick="Modal._submit()">${esc(submitLabel)}</button>`
    );

    this._onSubmit = () => {
      const values = {};
      for (const f of fields) { values[f.id] = $(`amf-${f.id}`)?.value ?? ''; }
      if (onSubmit(values) !== false) this.close();
    };

    $('app-modal-body').querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') this._submit(); });
    });
  },

  _submit() { if (this._onSubmit) this._onSubmit(); },

  confirm(title, message, onConfirm, danger = false, confirmLabel = null) {
    const btnLabel = confirmLabel || (danger ? 'Delete' : 'Confirm');
    const btnClass = danger ? 'btn-danger' : 'btn-primary';
    this._open(title,
      `<p class="am-confirm-msg">${esc(message)}</p>`,
      `<button class="btn-ghost" onclick="Modal.close()">Cancel</button>
       <button class="${btnClass}" onclick="Modal._confirmYes()">${esc(btnLabel)}</button>`
    );
    this._onConfirm = () => { onConfirm(); this.close(); };
  },

  _confirmYes() { if (this._onConfirm) this._onConfirm(); },

  toast(msg, duration = 2500) {
    const el = $('app-toast'); if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.classList.add('hidden'), 300);
    }, duration);
  }
};

function merge(a,b) {
  const o={...a};
  for(const k of Object.keys(b||{})){
    if(k in o && typeof o[k]==='object' && !Array.isArray(o[k])) o[k]=merge(o[k],b[k]);
    else o[k]=b[k];
  }
  return o;
}

/* ══════════════════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════════════════ */
const OB = {
  step:1,
  next(){if(this.step<5){this.step++;this.show(this.step);}},
  prev(){if(this.step>1){this.step--;this.show(this.step);}},
  show(n){
    document.querySelectorAll('.ob-step').forEach(el=>el.classList.remove('active'));
    document.querySelector(`.ob-step[data-step="${n}"]`).classList.add('active');
    document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i===n-1));
    this.step=n;
  },
  setAccent(a,btn){
    S.accent=a; document.documentElement.dataset.accent=a;
    document.querySelectorAll('.ob-acc').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  },
  finish(){
    S.name   =$('ob-name').value.trim();
    S.city   =$('ob-city').value.trim()||'Boston';
    S.topics =$('ob-topics').value.trim()||'technology';
    S.wqPref =$('ob-wq').value;
    S.dwGoal =parseInt($('ob-dw').value)||3;
    S.leagues=[...document.querySelectorAll('.league-toggles input:checked')].map(i=>i.value);
    if(!S.leagues.length) S.leagues=['nba'];
    S.onboardingDone=true;
    save(); launch();
  }
};

/* ══════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════ */
const Nav = {
  current:'home',
  go(view,btn){
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    const el=$(`view-${view}`); if(el) el.classList.remove('hidden');
    document.querySelectorAll('.rail-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    this.current=view;
    if(view==='journal') Journal.renderArchive();
    if(view==='goals')   Goals.render();
    if(view==='tasks')   TaskView.render();
    if(view==='calendar') Cal.render();
    if(view==='focus')   Timer.syncFocus();
  }
};

/* ══════════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════════ */
const Clock = {
  start(){this.tick();setInterval(()=>this.tick(),1000);},
  tick(){
    const now=new Date();
    const h=now.getHours(),m=String(now.getMinutes()).padStart(2,'0');
    const ampm=h>=12?'PM':'AM',h12=((h%12)||12);
    const t=`${h12}:${m} ${ampm}`;
    const tc=$('tb-clock'); if(tc) tc.textContent=t;
    const cc=$('cx-clock'); if(cc) cc.textContent=t;
    const zc=$('zen-timer'); if(zc&&!Timer.running) {} // zen timer updates from Timer
    const tod=h<12?'morning':h<17?'afternoon':'evening';
    const gr=$('tb-greeting'); if(gr) gr.textContent=`Good ${tod}${S.name?', '+S.name:''}.`;
    const de=$('tb-date'); if(de) de.textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  }
};

/* ══════════════════════════════════════════════════════════
   WEATHER — Open-Meteo (no key, strips state from city)
══════════════════════════════════════════════════════════ */
const Weather = {
  _cache:null,
  async init(){
    const cityRaw=S.city||'Boston';
    const city=cityRaw.split(',')[0].trim();
    try {
      const gr=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      if(!gr.ok) throw 0;
      const gd=await gr.json();
      if(!gd.results?.length) throw 0;
      const {latitude:lat,longitude:lon,name,country_code}=gd.results[0];
      const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
      if(!wr.ok) throw 0;
      const wd=await wr.json();
      const code=wd.current.weather_code;
      const [icon,desc]=WMO[code]||['🌡️','—'];
      const temp=Math.round(wd.current.temperature_2m);
      const hum=wd.current.relative_humidity_2m;
      const wind=Math.round(wd.current.wind_speed_10m);
      this._cache={icon,desc,temp,hum,wind,city:name,country:country_code};
      this.render();
      DailySummary.update();
    } catch(e){
      console.warn('Weather failed',e);
      const tw=$('tb-weather'); if(tw) tw.textContent='Weather unavailable';
      const cw=$('cx-weather'); if(cw) cw.innerHTML='<span style="font-size:.82rem;color:var(--ink-3)">Weather unavailable</span>';
    }
  },
  render(){
    const d=this._cache; if(!d) return;
    const tw=$('tb-weather');
    if(tw) tw.innerHTML=`${d.icon} ${d.temp}°F <span style="color:var(--ink-3);font-size:.8rem">${d.desc}</span>`;
    const cw=$('cx-weather');
    if(cw) cw.innerHTML=`
      <div class="cx-wx-main">
        <span class="cx-wx-icon">${d.icon}</span>
        <span class="cx-wx-temp">${d.temp}°F</span>
      </div>
      <div class="cx-wx-desc">${d.desc}</div>
      <div class="cx-wx-meta">${d.city}, ${d.country} · Humidity ${d.hum}% · Wind ${d.wind} mph</div>`;
  },
  get(){ return this._cache; }
};

/* ══════════════════════════════════════════════════════════
   PULSE + STREAK + DAILY SUMMARY
══════════════════════════════════════════════════════════ */
function updatePulse(){
  const pt=$('p-tasks'); if(pt) pt.textContent=S.tasksCompleted||0;
  const ps=$('p-streak'); if(ps) ps.textContent=S.streak||0;
}
function updateStreak(){
  const today=new Date().toDateString();
  if(S.lastActive!==today){
    const yest=new Date(Date.now()-86400000).toDateString();
    S.streak=(S.lastActive===yest)?(S.streak||0)+1:1;
    S.lastActive=today; save();
  }
  updatePulse();
}

const DailySummary = {
  update(){
    const el=$('tb-summary'); if(!el) return;
    const left=S.todos.filter(t=>!t.done).length;
    const wx=Weather.get();
    const topGoal=S.goals.filter(g=>!g.done&&g.progress>0).sort((a,b)=>b.progress-a.progress)[0];
    const parts=[];
    if(left>0) parts.push(`${left} task${left>1?'s':''} left`);
    if(wx) parts.push(`${wx.temp}°F & ${wx.desc.toLowerCase()}`);
    if(topGoal) parts.push(`"${topGoal.text.slice(0,20)}…" is ${topGoal.progress}% done`);
    el.textContent=parts.length?parts.join(' · '):'';
    el.style.display=parts.length?'inline-block':'none';
  }
};

/* ══════════════════════════════════════════════════════════
   SHORTCUTS
══════════════════════════════════════════════════════════ */
const Shortcuts = {
  render(){
    const el=$('sd-links'); if(!el) return;
    if(!S.shortcuts.length){el.innerHTML='<span style="font-size:.78rem;color:var(--ink-3)">Add shortcuts →</span>';return;}
    el.innerHTML=S.shortcuts.map((s,i)=>`
      <a class="sd-item" href="${esc(s.url)}" target="_blank" rel="noopener">
        <img class="sd-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.url)}&sz=16" alt="" onerror="this.style.display='none'"/>
        ${esc(s.label)}
        <button class="sd-del" onclick="event.preventDefault();event.stopPropagation();Shortcuts.remove(${i})">✕</button>
      </a>`).join('');
  },
  addPrompt(){
    Modal.form('Add Shortcut', [
      {id:'url', label:'URL', type:'text', placeholder:'https://github.com', required:true},
      {id:'label', label:'Label', type:'text', placeholder:'GitHub', required:true}
    ], ({url, label}) => {
      if (!url?.trim() || !label?.trim()) return false;
      S.shortcuts.push({url:url.trim(), label:label.trim()});
      save(); this.render();
    }, 'Add Shortcut');
  },
  remove(i){S.shortcuts.splice(i,1);save();this.render();}
};

/* ══════════════════════════════════════════════════════════
   CAPTURE
══════════════════════════════════════════════════════════ */
const Capture = {
  init(){
    const inp=$('capture-input'); if(!inp) return;
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&inp.value.trim()){this.parse(inp.value.trim());inp.value='';}
    });
  },
  parse(text){
    const lo=text.toLowerCase();
    if(lo.startsWith('goal:')){ Goals.addItem(text.replace(/^goal:\s*/i,'').trim(),'short'); this.flash('Short-term goal added ✓'); return; }
    if(lo.startsWith('longgoal:')){ Goals.addItem(text.replace(/^longgoal:\s*/i,'').trim(),'long'); this.flash('Long-term goal added ✓'); return; }
    if(lo.startsWith('link:')||lo.startsWith('shortcut:')){
      const c=text.replace(/^(link|shortcut):\s*/i,'').trim();
      const parts=c.split(' ');
      S.shortcuts.push({url:parts[0],label:parts.slice(1).join(' ')||parts[0]});
      save(); Shortcuts.render(); this.flash('Shortcut added ✓'); return;
    }
    S.todos.push({text,done:false,id:Date.now(),tag:this.tag(lo)});
    save(); Todo.render(); DailySummary.update(); updatePulse();
    this.flash('Task added ✓');
  },
  tag(lo){
    if(lo.match(/call|email|meet|slack/)) return 'comm';
    if(lo.match(/read|research|learn|study/)) return 'learn';
    if(lo.match(/write|draft|create|design/)) return 'create';
    if(lo.match(/review|check|audit|fix/)) return 'review';
    return 'task';
  },
  flash(msg){
    const inp=$('capture-input'); if(!inp) return;
    const o=inp.placeholder; inp.placeholder=msg;
    setTimeout(()=>{inp.placeholder=o;},2200);
  }
};

/* ══════════════════════════════════════════════════════════
   TO-DO
══════════════════════════════════════════════════════════ */
const Todo = {
  add(){
    const inp=$('todo-input'); if(!inp||!inp.value.trim()) return;
    S.todos.push({text:inp.value.trim(),done:false,id:Date.now(),tag:Capture.tag(inp.value.toLowerCase())});
    inp.value=''; save(); this.render(); DailySummary.update(); updatePulse();
  },
  render(){
    const el=$('todo-list'); if(!el) return;
    el.innerHTML=!S.todos.length
      ?'<p class="empty-msg">No tasks yet. Use Quick Capture above.</p>'
      :S.todos.slice(0,10).map((t,i)=>`
        <div class="todo-item${t.done?' done':''}" onclick="Todo.toggle(${i})">
          <div class="todo-cb">${t.done?'✓':''}</div>
          <span class="todo-txt">${esc(t.text)}</span>
          <button class="todo-del" onclick="event.stopPropagation();Todo.remove(${i})">✕</button>
        </div>`).join('');
    const m=$('todo-meta'); if(m) m.textContent=`${S.todos.filter(t=>!t.done).length} left`;
    this.updateZenTask();
  },
  toggle(i){
    S.todos[i].done=!S.todos[i].done;
    S.tasksCompleted=(S.tasksCompleted||0)+(S.todos[i].done?1:-1);
    if(S.tasksCompleted<0)S.tasksCompleted=0;
    save(); this.render(); updatePulse(); DailySummary.update();
    if(Nav.current==='tasks') TaskView.render();
  },
  remove(i){S.todos.splice(i,1);save();this.render();DailySummary.update();},
  updateZenTask(){
    const first=S.todos.find(t=>!t.done);
    const zt=$('zen-task'); if(zt) zt.textContent=first?first.text:'No active task';
  }
};

/* ══════════════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════════════ */
const Timer = {
  _int:null, running:false,
  toggle(){this.running?this.pause():this.start();},
  start(){
    this.running=true;
    this.setBtn('Pause');
    this._int=setInterval(()=>{
      S.dwSeconds=(S.dwSeconds||0)+1;
      this.render();
      if(S.dwSeconds%30===0)save();
    },1000);
  },
  pause(){
    this.running=false; clearInterval(this._int); save();
    this.setBtn(S.dwSeconds>0?'Resume':'Start');
  },
  reset(){
    this.pause(); S.dwSeconds=0; S.dwSession=(S.dwSession||1)+1; save();
    this.setBtn('Start'); this.render();
  },
  setBtn(txt){
    ['timer-btn','focus-main-btn','zen-start-btn'].forEach(id=>{const e=$(id);if(e)e.textContent=txt;});
  },
  render(){
    const s=S.dwSeconds||0;
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    const d=h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    const pct=Math.min(100,Math.round((s/((S.dwGoal||3)*3600))*100));
    ['timer-display'].forEach(id=>{const e=$(id);if(e)e.textContent=d;});
    ['timer-prog','focus-prog','zen-prog'].forEach(id=>{const e=$(id);if(e)e.style.width=pct+'%';});
    const tp=$('p-dw'); if(tp) tp.textContent=h>0?`${h}h${m}m`:`${m}m`;
    this.syncFocus(d,pct);
  },
  syncFocus(d,pct){
    const ft=$('focus-timer'); if(ft&&d) ft.textContent=d;
    const zt=$('zen-timer'); if(zt&&d) zt.textContent=d;
    const fb=$('focus-badge'); if(fb) fb.textContent=`Session ${S.dwSession||1}`;
    const fs=$('focus-sub'); if(fs) fs.textContent=this.running?`${pct||0}% of daily goal`:'Ready when you are';
    const fg=$('focus-goal-lbl'); if(fg) fg.textContent=`${S.dwGoal||3}h`;
    const tg=$('timer-goal-lbl'); if(tg) tg.textContent=`Goal: ${S.dwGoal||3}h`;
    const ts=$('timer-session'); if(ts) ts.textContent=`Session ${S.dwSession||1}`;
  }
};

/* ══════════════════════════════════════════════════════════
   HABITS + RING
══════════════════════════════════════════════════════════ */
const HABIT_DEFAULTS=['Exercise','Read 30 min','Meditate','No phone before 9am'];
const Habits = {
  ensure(){if(!S.habits.length){S.habits=HABIT_DEFAULTS.map(n=>({name:n,done:false,streak:0,lastDate:null}));save();}},
  render(){
    this.ensure();
    const el=$('habit-list'); if(!el) return;
    el.innerHTML=S.habits.map((h,i)=>`
      <div class="habit-item${h.done?' done':''}" onclick="Habits.toggle(${i})">
        <div class="habit-chk">${h.done?'✓':''}</div>
        <span class="habit-name">${esc(h.name)}</span>
        <span class="habit-streak">${h.streak>1?h.streak+'🔥':''}</span>
      </div>`).join('');
    const done=S.habits.filter(h=>h.done).length;
    const total=S.habits.length;
    const pct=total?Math.round((done/total)*100):0;
    const m=$('habit-meta'); if(m) m.textContent=`${done}/${total}`;
    const p=$('habit-ring-pct'); if(p) p.textContent=`${pct}%`;
    /* SVG ring: circumference = 2πr = 2*π*22 ≈ 138.2 */
    const circ=138.2;
    const ring=$('habit-ring-circle');
    if(ring) ring.style.strokeDashoffset=circ-(circ*(pct/100));
  },
  toggle(i){
    const h=S.habits[i],yest=new Date(Date.now()-86400000).toDateString();
    h.done=!h.done;
    if(h.done){h.streak=(h.lastDate&&new Date(h.lastDate).toDateString()===yest)?h.streak+1:1;h.lastDate=new Date().toISOString();}
    else{h.streak=Math.max(0,h.streak-1);}
    save(); this.render();
  }
};

/* ══════════════════════════════════════════════════════════
   SPORTS — ESPN unofficial API with live detection + pagination
══════════════════════════════════════════════════════════ */
const Sports = {
  _data:{}, _active:null, _page:0, _perPage:2,
  async refresh(){
    const leagues=S.leagues||['nba'];
    this._active=this._active||leagues[0];
    for(const lg of leagues) await this.fetchLeague(lg);
    this.renderTabs(); this.renderGames();
  },
  async fetchLeague(lg){
    const cfg=SPORT_CFG[lg]; if(!cfg) return;
    try {
      const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`);
      if(!r.ok) throw 0;
      const d=await r.json();
      this._data[lg]=d.events||[];
    } catch { this._data[lg]=[]; }
  },
  renderTabs(){
    const el=$('sports-tabs'); if(!el) return;
    const leagues=S.leagues||['nba'];
    el.innerHTML=leagues.map(lg=>`
      <button class="stab${lg===this._active?' active':''}" onclick="Sports.switchTab('${lg}',this)">
        ${SPORT_CFG[lg]?.label||lg.toUpperCase()}
      </button>`).join('');
  },
  switchTab(lg,btn){
    this._active=lg; this._page=0;
    document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    this.renderGames();
  },
  renderGames(){
    const el=$('sports-games'); if(!el) return;
    const events=(this._data[this._active]||[]);
    if(!events.length){
      el.innerHTML=`<p class="scores-empty">No games today for ${SPORT_CFG[this._active]?.label||this._active.toUpperCase()}.</p>`;
      const pager=$('sports-pager'); if(pager) pager.classList.add('hidden');
      return;
    }
    const total=events.length;
    const start=this._page*this._perPage;
    const slice=events.slice(start,start+this._perPage);
    el.innerHTML=slice.map(ev=>{
      const c=ev.competitions?.[0]; if(!c) return '';
      const home=c.competitors?.find(t=>t.homeAway==='home');
      const away=c.competitors?.find(t=>t.homeAway==='away');
      if(!home||!away) return '';
      const hs=home.score||'0',as=away.score||'0';
      const hw=parseInt(hs)>parseInt(as),aw=parseInt(as)>parseInt(hs);
      const statusType=c.status?.type; 
      const isLive=statusType?.state==='in';
      const status=statusType?.shortDetail||ev.status?.type?.shortDetail||'Scheduled';
      return `<div class="score-card">
        <div class="score-row">
          <span class="score-team">${esc(away.team?.shortDisplayName||away.team?.displayName||'Away')}</span>
          <span class="score-val${aw?' winner':''}">${as}</span>
        </div>
        <div class="score-row">
          <span class="score-team">${esc(home.team?.shortDisplayName||home.team?.displayName||'Home')}</span>
          <span class="score-val${hw?' winner':''}">${hs}</span>
        </div>
        <div class="score-status">
          ${isLive?'<span class="live-dot"></span>':''}<span>${esc(status)}</span>
        </div>
      </div>`;
    }).join('');
    const pager=$('sports-pager');
    if(total>this._perPage&&pager){
      pager.classList.remove('hidden');
      const inf=$('spn-info'); if(inf) inf.textContent=`${this._page+1}/${Math.ceil(total/this._perPage)}`;
    } else if(pager) { pager.classList.add('hidden'); }
  },
  next(){
    const total=(this._data[this._active]||[]).length;
    if((this._page+1)*this._perPage<total){this._page++;this.renderGames();}
  },
  prev(){if(this._page>0){this._page--;this.renderGames();}}
};

/* ══════════════════════════════════════════════════════════
   NEWS
══════════════════════════════════════════════════════════ */
const FEEDS={
  technology:'http://feeds.arstechnica.com/arstechnica/index',
  finance:'https://feeds.reuters.com/reuters/businessNews',
  sports:'http://feeds.bbci.co.uk/sport/rss.xml',
  science:'https://www.sciencedaily.com/rss/all.xml',
  default:'http://feeds.bbci.co.uk/news/rss.xml'
};
const NewsWidget = {
  async refresh(){
    const el=$('news-list'); if(!el) return;
    el.innerHTML='<div class="skel-block"><div class="skel skel-line"></div><div class="skel skel-line" style="width:85%"></div><div class="skel skel-line" style="width:90%"></div></div>';
    const topic=(S.topics||'').split(',')[0].trim().toLowerCase();
    const feed=FEEDS[topic]||FEEDS.default;
    const topicEl=$('news-topic'); if(topicEl) topicEl.textContent=topic||'Top news';
    try {
      const r=await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feed)}`);
      if(!r.ok) throw 0;
      const {contents}=await r.json();
      const doc=new DOMParser().parseFromString(contents,'text/xml');
      const items=[...doc.querySelectorAll('item')].slice(0,7);
      if(!items.length) throw 0;
      el.innerHTML=items.map(item=>{
        const title=item.querySelector('title')?.textContent?.trim()||'Untitled';
        const link=item.querySelector('link')?.textContent?.trim()||'#';
        const pub=item.querySelector('pubDate')?.textContent||'';
        const ago=this.ago(pub);
        return `<div class="news-item"><a href="${esc(link)}" target="_blank" rel="noopener">${esc(title)}</a><div class="news-src">${ago}</div></div>`;
      }).join('');
    } catch {
      el.innerHTML='<p class="empty-msg">Couldn\'t load news. Try refreshing.</p>';
    }
  },
  ago(s){
    if(!s) return '';
    const d=Math.floor((Date.now()-new Date(s))/60000);
    return d<60?`${d}m ago`:d<1440?`${Math.floor(d/60)}h ago`:`${Math.floor(d/1440)}d ago`;
  }
};

/* ══════════════════════════════════════════════════════════
   GOAL RINGS (SVG)
══════════════════════════════════════════════════════════ */
const GoalRings = {
  render(){
    const el=$('goal-rings'); if(!el) return;
    const active=S.goals.filter(g=>!g.done).slice(0,4);
    if(!active.length){
      el.innerHTML='<p class="goal-rings-empty">No active goals. Add some in Goals →</p>';
      return;
    }
    /* SVG ring: r=20, circ=2π*20≈125.7 */
    const circ=125.7, r=20, cx=24, cy=24;
    el.innerHTML=active.map(g=>{
      const pct=g.progress||0;
      const offset=circ-(circ*(pct/100));
      const type=g.type==='long'?'Long-term':'Short-term';
      return `<div class="goal-ring-row">
        <svg class="goal-ring-svg" width="48" height="48" viewBox="0 0 48 48">
          <circle class="goal-ring-track" cx="${cx}" cy="${cy}" r="${r}"/>
          <circle class="goal-ring-fill" cx="${cx}" cy="${cy}" r="${r}"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="goal-ring-info">
          <div class="goal-ring-text" title="${esc(g.text)}">${esc(g.text.slice(0,28))}${g.text.length>28?'…':''}</div>
          <div class="goal-ring-sub">${type} · <span class="goal-ring-pct">${pct}%</span></div>
        </div>
      </div>`;
    }).join('');
  }
};

/* ══════════════════════════════════════════════════════════
   WORD / QUOTE
══════════════════════════════════════════════════════════ */
const WordQuote = {
  _quote:null,
  async render(){
    const el=$('wq-content'); if(!el) return;
    const pref=S.wqPref||'quote';
    if(pref==='none'){el.innerHTML='<p class="empty-msg">Disabled in Settings.</p>';return;}
    let html='';
    if(pref==='word'||pref==='both'){
      const day=new Date().getDay()+new Date().getDate();
      const w=WORDS[day%WORDS.length];
      html+=`<div class="wq-word">${esc(w.w)}</div><div class="wq-pos">${esc(w.pos)}</div><div class="wq-def">${esc(w.def)}</div>`;
    }
    if(pref==='quote'||pref==='both'){
      const q=await this.getQuote();
      if(q) html+=`<div class="wq-mark" style="margin-top:${pref==='both'?'12px':'0'}">"</div><div class="wq-text">${esc(q.content)}</div><div class="wq-author">— ${esc(q.author)}</div>`;
    }
    el.innerHTML=html||'<p class="empty-msg">Loading…</p>';
  },
  async getQuote(){
    if(this._quote) return this._quote;
    try {
      const r=await fetch('https://api.quotable.io/random?maxLength=130');
      if(!r.ok) throw 0;
      this._quote=await r.json();
      return this._quote;
    } catch {
      const fallbacks=[
        {content:'The secret of getting ahead is getting started.',author:'Mark Twain'},
        {content:'Simplicity is the ultimate sophistication.',author:'Da Vinci'},
        {content:'It does not matter how slowly you go as long as you do not stop.',author:'Confucius'},
      ];
      return fallbacks[Math.floor(Math.random()*fallbacks.length)];
    }
  },
  async refresh(){this._quote=null;await this.render();}
};

/* ══════════════════════════════════════════════════════════
   JOURNAL — with daily snapshot
══════════════════════════════════════════════════════════ */
const Journal = {
  todayKey(){return new Date().toDateString();},
  todayPrompt(){
    const day=new Date().getDay()+new Date().getDate();
    return PROMPTS[day%PROMPTS.length];
  },
  loadToday(){
    const prompt=this.todayPrompt();
    const hp=$('jp-home'); if(hp) hp.textContent=prompt;
    const jp=$('journal-prompt'); if(jp) jp.textContent=prompt;
    const jd=$('journal-date'); if(jd) jd.textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    /* Pre-fill textarea if entry exists */
    const entry=S.journalEntries.find(e=>e.date===this.todayKey());
    const ta=$('journal-textarea'); if(ta&&entry) ta.value=entry.text||'';
  },
  quickSave(){
    const ta=$('jp-quick'); if(!ta||!ta.value.trim()) return;
    this._save(ta.value.trim());
    ta.value='';
    this.flash('Saved ✓');
  },
  save(){
    const ta=$('journal-textarea'); if(!ta||!ta.value.trim()) return;
    this._save(ta.value.trim());
    this.renderArchive();
    this.flash('Entry saved ✓');
  },
  _save(text){
    const key=this.todayKey();
    const prompt=this.todayPrompt();
    /* Build snapshot */
    const snapshot={
      tasks:S.todos.filter(t=>t.done).map(t=>t.text),
      weather:Weather.get()?`${Weather.get().temp}°F, ${Weather.get().desc}`:null,
      habitsCompleted:S.habits.filter(h=>h.done).length,
      habitsTotal:S.habits.length
    };
    const entry={date:key,prompt,text,snapshot,ts:Date.now()};
    const idx=S.journalEntries.findIndex(e=>e.date===key);
    if(idx>=0) S.journalEntries[idx]=entry; else S.journalEntries.unshift(entry);
    save();
  },
  clear(){const ta=$('journal-textarea');if(ta)ta.value='';},
  flash(msg){
    const btn=document.querySelector('.journal-btns .btn-primary'); if(!btn) return;
    const orig=btn.textContent; btn.textContent=msg;
    setTimeout(()=>{btn.textContent=orig;},2000);
  },
  renderArchive(){
    const el=$('ja-list'); if(!el) return;
    if(!S.journalEntries.length){el.innerHTML='<p style="font-size:.82rem;color:var(--ink-3)">No entries yet.</p>';return;}
    el.innerHTML=S.journalEntries.map(e=>{
      const snap=e.snapshot||{};
      const tags=[
        snap.weather&&`🌤 ${snap.weather}`,
        snap.tasks?.length&&`✓ ${snap.tasks.length} tasks`,
        snap.habitsCompleted&&`◉ ${snap.habitsCompleted}/${snap.habitsTotal} habits`
      ].filter(Boolean);
      return `<div class="ja-entry">
        <div class="ja-entry-date">${e.date}</div>
        <div class="ja-entry-prompt">${esc(e.prompt||'')}</div>
        <div class="ja-entry-text">${esc((e.text||'').slice(0,140))}${(e.text||'').length>140?'…':''}</div>
        ${tags.length?`<div class="ja-snapshot">${tags.map(t=>`<span class="ja-snap-tag">${esc(t)}</span>`).join('')}</div>`:''}
      </div>`;
    }).join('');
  }
};

/* ══════════════════════════════════════════════════════════
   GOALS
══════════════════════════════════════════════════════════ */
const Goals = {
  render(){['short','long'].forEach(t=>this.renderCol(t));},
  renderCol(type){
    const el=$(`goals-${type}`); if(!el) return;
    const list=S.goals.filter(g=>g.type===type);
    if(!list.length){el.innerHTML='<p class="empty-msg">No goals yet.</p>';return;}
    el.innerHTML=list.map((g,i)=>{
      const gi=S.goals.indexOf(g);
      return `<div class="goal-item${g.done?' goal-done':''}">
        <div class="goal-item-hdr">
          <div class="goal-text">${esc(g.text)}</div>
          <div class="goal-actions">
            <button class="icon-btn-sm" onclick="Goals.toggleDone(${gi})" title="${g.done?'Reopen':'Complete'}">✓</button>
            <button class="icon-btn-sm" onclick="Goals.setProgress(${gi})" title="Update progress">↑</button>
            <button class="icon-btn-sm" onclick="Goals.remove(${gi})" title="Remove">✕</button>
          </div>
        </div>
        ${g.due?`<div class="goal-due">Due: ${esc(g.due)}</div>`:''}
        <div class="goal-prog-wrap"><div class="goal-prog-bar" style="width:${g.progress||0}%"></div></div>
        <div class="goal-prog-lbl">${g.progress||0}% complete</div>
      </div>`;
    }).join('');
  },
  addPrompt(){
    Modal.form('Add Goal', [
      {id:'text', label:'Goal', type:'text', placeholder:'e.g. Run a 5K', required:true},
      {id:'type', label:'Timeframe', type:'select', options:[
        {value:'short', label:'Short-term (this week / month)'},
        {value:'long',  label:'Long-term (this year / beyond)'}
      ], default:'short'},
      {id:'due', label:'Due date', type:'date', required:false}
    ], ({text, type, due}) => {
      if (!text?.trim()) return false;
      this.addItem(text, type, due);
    }, 'Add Goal');
  },
  addItem(text,type,due=''){
    S.goals.push({text:text.trim(),type,due,progress:0,done:false,created:Date.now()});
    save(); this.render(); GoalRings.render(); DailySummary.update();
  },
  toggleDone(i){S.goals[i].done=!S.goals[i].done;save();this.render();GoalRings.render();},
  setProgress(i){
    Modal.form('Update Progress', [
      {id:'progress', label:'Progress', type:'range', min:0, max:100, default:S.goals[i].progress||0}
    ], ({progress}) => {
      S.goals[i].progress = Math.min(100, Math.max(0, parseInt(progress)||0));
      save(); this.render(); GoalRings.render(); DailySummary.update();
    }, 'Update');
  },
  remove(i){
    Modal.confirm('Remove Goal', 'Remove this goal? This cannot be undone.', () => {
      S.goals.splice(i,1); save(); this.render(); GoalRings.render();
    }, true, 'Remove');
  }
};

/* ══════════════════════════════════════════════════════════
   TASK VIEW
══════════════════════════════════════════════════════════ */
const TAG_LABELS={task:'Task',comm:'Comm',learn:'Learn',create:'Create',review:'Review'};
const TaskView = {
  _f:'all',
  filter(f,btn){this._f=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');this.render();},
  render(){
    const el=$('task-full-list'); if(!el) return;
    let list=S.todos;
    if(this._f==='active') list=list.filter(t=>!t.done);
    if(this._f==='done')   list=list.filter(t=>t.done);
    if(!list.length){el.innerHTML='<p class="empty-msg" style="padding:.5rem">No tasks here.</p>';return;}
    el.innerHTML=list.map(t=>{
      const i=S.todos.indexOf(t);
      return `<div class="task-full-item${t.done?' done':''}" onclick="Todo.toggle(${i});TaskView.render()">
        <div class="todo-cb">${t.done?'✓':''}</div>
        <span style="flex:1;font-size:.9rem;color:${t.done?'var(--ink-3)':'var(--ink)'};${t.done?'text-decoration:line-through':''}">${esc(t.text)}</span>
        ${t.tag?`<span class="task-tag">${TAG_LABELS[t.tag]||t.tag}</span>`:''}
        <button class="todo-del" style="opacity:1;font-size:.72rem" onclick="event.stopPropagation();Todo.remove(${i});TaskView.render()">✕</button>
      </div>`;
    }).join('');
  }
};

/* ══════════════════════════════════════════════════════════
   WEEKLY SUMMARY
══════════════════════════════════════════════════════════ */
const WeeklySummary = {
  show(){
    const el=$('weekly-content'); if(!el) return;
    const sections=[
      {title:`✓ Tasks completed (${S.todos.filter(t=>t.done).length})`,items:S.todos.filter(t=>t.done).slice(0,10).map(t=>t.text)},
      {title:`◉ Habits today (${S.habits.filter(h=>h.done).length}/${S.habits.length})`,items:S.habits.filter(h=>h.done).map(h=>`${h.name}${h.streak>1?' — '+h.streak+' day streak':''}`)},
      {title:'◎ Goals in progress',items:S.goals.filter(g=>!g.done&&g.progress>0).map(g=>`${g.text} — ${g.progress}%`)},
      {title:'✎ Recent journal',items:S.journalEntries.slice(0,3).map(e=>`${e.date}: ${(e.text||'').slice(0,80)}…`)},
    ];
    el.innerHTML=sections.map(s=>`
      <div class="ws-section">
        <div class="ws-title">${esc(s.title)}</div>
        ${s.items.length?s.items.map(i=>`<div class="ws-item">${esc(i)}</div>`).join(''):'<div class="ws-item" style="color:var(--ink-3)">Nothing yet.</div>'}
      </div>`).join('');
    $('weekly-modal').classList.remove('hidden');
    $('modal-backdrop').classList.remove('hidden');
  },
  close(){$('weekly-modal').classList.add('hidden');$('modal-backdrop').classList.add('hidden');}
};

/* ══════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════ */
const Cal = {
  _y:new Date().getFullYear(),_m:new Date().getMonth(),_sel:null,
  render(){
    const el=$('cal-grid'); if(!el) return;
    const lbl=$('cal-month-label');
    if(lbl) lbl.textContent=new Date(this._y,this._m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html=days.map(d=>`<div class="cal-day-hdr">${d}</div>`).join('');
    const first=new Date(this._y,this._m,1).getDay();
    const total=new Date(this._y,this._m+1,0).getDate();
    const prev=new Date(this._y,this._m,0).getDate();
    const today=new Date();
    for(let i=0;i<first;i++) html+=`<div class="cal-cell other-month"><div class="cal-day-num">${prev-first+i+1}</div></div>`;
    for(let d=1;d<=total;d++){
      const isToday=today.getFullYear()===this._y&&today.getMonth()===this._m&&today.getDate()===d;
      const ds=`${this._y}-${String(this._m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const evts=S.calEvents.filter(e=>e.date===ds);
      html+=`<div class="cal-cell${isToday?' today':''}" onclick="Cal.select('${ds}')">
        <div class="cal-day-num">${d}</div>
        ${evts.slice(0,2).map(e=>`<div class="cal-ev-dot">${esc(e.title)}</div>`).join('')}
        ${evts.length>2?`<div style="font-size:.6rem;color:var(--ink-3)">+${evts.length-2}</div>`:''}
      </div>`;
    }
    const rem=(7-((first+total)%7))%7;
    for(let i=1;i<=rem;i++) html+=`<div class="cal-cell other-month"><div class="cal-day-num">${i}</div></div>`;
    el.innerHTML=html;
  },
  select(ds){
    this._sel=ds;
    const panel=$('cal-panel'); if(!panel) return;
    panel.classList.remove('hidden');
    const lbl=$('cep-date-lbl');
    if(lbl) lbl.textContent=new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    const evts=S.calEvents.filter(e=>e.date===ds);
    const list=$('cep-events'); if(!list) return;
    list.innerHTML=!evts.length?'<p class="empty-msg">No events.</p>':
      evts.map((e,i)=>{
        const gi=S.calEvents.indexOf(e);
        return `<div class="cep-event"><div class="cep-dot"></div>
          <div><div class="cep-title">${esc(e.title)}</div><div class="cep-time">${e.time||''} ${e.notes?'· '+esc(e.notes):''}</div></div>
          <button class="cep-del" onclick="Cal.removeEvent(${gi})">✕</button></div>`;
      }).join('');
  },
  closePanel(){const p=$('cal-panel');if(p)p.classList.add('hidden');this._sel=null;},
  addEvent(){
    const today = new Date().toISOString().split('T')[0];
    Modal.form('Add Event', [
      {id:'date',  label:'Date',  type:'date', default:today, required:true},
      {id:'title', label:'Title', type:'text', placeholder:'e.g. Team meeting', required:true},
      {id:'time',  label:'Time',  type:'time', required:false}
    ], ({date, title, time}) => {
      if (!date || !title?.trim()) return false;
      S.calEvents.push({date, title:title.trim(), time:formatTimeInput(time), notes:'', id:Date.now()});
      save(); this.render(); if(this._sel===date) this.select(date);
    }, 'Add Event');
  },
  addEventOnDate(){
    const ds = this._sel || new Date().toISOString().split('T')[0];
    const displayDate = new Date(ds+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'});
    Modal.form(`Add Event — ${displayDate}`, [
      {id:'title', label:'Title', type:'text', placeholder:'e.g. Team meeting', required:true},
      {id:'time',  label:'Time',  type:'time', required:false}
    ], ({title, time}) => {
      if (!title?.trim()) return false;
      S.calEvents.push({date:ds, title:title.trim(), time:formatTimeInput(time), notes:'', id:Date.now()});
      save(); this.render(); this.select(ds);
    }, 'Add Event');
  },
  removeEvent(i){S.calEvents.splice(i,1);save();this.render();if(this._sel)this.select(this._sel);},
  prevMonth(){if(this._m===0){this._m=11;this._y--;}else this._m--;this.render();},
  nextMonth(){if(this._m===11){this._m=0;this._y++;}else this._m++;this.render();},
  importICS(input){
    const file=input.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const evts=this.parseICS(e.target.result);
        S.calEvents=[...S.calEvents,...evts];
        save(); this.render();
        Modal.toast(`Imported ${evts.length} event(s) ✓`);
      }catch(err){Modal.toast('Error parsing .ics file.');}
    };
    reader.readAsText(file); input.value='';
  },
  parseICS(text){
    const evts=[]; const lines=text.replace(/\r\n|\r/g,'\n').split('\n');
    let cur=null;
    for(const line of lines){
      if(line==='BEGIN:VEVENT'){cur={};}
      else if(line==='END:VEVENT'&&cur){if(cur.title&&cur.date)evts.push(cur);cur=null;}
      else if(cur){
        if(line.startsWith('SUMMARY:')) cur.title=line.slice(8).trim();
        else if(line.startsWith('DTSTART')){
          const v=line.split(':').pop().trim();
          if(v.length>=8){
            cur.date=`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
            if(v.includes('T')){
              const h=parseInt(v.slice(9,11)),m=v.slice(11,13);
              cur.time=`${h>12?h-12:h||12}:${m} ${h>=12?'PM':'AM'}`;
            }
          }
        }
        else if(line.startsWith('DESCRIPTION:')) cur.notes=line.slice(12).trim().slice(0,60);
      }
    }
    return evts;
  }
};

/* ══════════════════════════════════════════════════════════
   ZEN MODE
══════════════════════════════════════════════════════════ */
const ZenMode = {
  active:false,
  toggle(){
    this.active=!this.active;
    const overlay=$('zen-overlay');
    if(overlay) overlay.classList.toggle('hidden',!this.active);
    const btn=$('zen-rail-btn');
    if(btn) btn.classList.toggle('active',this.active);
    if(this.active){
      /* Sync current timer state */
      Timer.render();
      Todo.updateZenTask?.();
    }
  }
};

/* ══════════════════════════════════════════════════════════
   AI BRIEF
══════════════════════════════════════════════════════════ */
const Brief = {
  async fetch(){
    const el=$('brief-text'); if(!el) return;
    const key=S.openai;
    if(!key){el.textContent='Add an OpenAI key in Settings for a personalized daily brief.';return;}
    el.innerHTML='<span style="animation:shimmer 1.5s infinite">Generating…</span>';
    const todos=S.todos.filter(t=>!t.done).map(t=>t.text).join(', ')||'none';
    const h=new Date().getHours();
    const tod=h<12?'morning':h<17?'afternoon':'evening';
    const prompt=`2-sentence ${tod} brief for ${S.name||'the user'} in ${S.city}. Date: ${new Date().toDateString()}. Open tasks: ${todos}. Warm, direct, one focus tip. No bullets or greetings.`;
    try {
      const r=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
        body:JSON.stringify({model:'gpt-4o-mini',max_tokens:90,messages:[{role:'user',content:prompt}]})
      });
      if(!r.ok) throw 0;
      const d=await r.json();
      el.textContent=d.choices[0].message.content.trim();
    } catch { el.textContent='Couldn\'t generate brief — check your OpenAI key in Settings.'; }
  }
};

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
const Settings = {
  open(){
    $('s-name').value=$('s-name').value=S.name;
    $('s-city').value=S.city;
    $('s-topics').value=S.topics;
    $('s-dwgoal').value=S.dwGoal||3;
    $('s-openai').value=S.openai||'';
    $('s-wq').value=S.wqPref||'quote';
    ['nba','nfl','mlb','nhl'].forEach(lg=>{const e=$(`sl-${lg}`);if(e)e.checked=(S.leagues||[]).includes(lg);});
    document.querySelectorAll('.s-accents .ob-acc').forEach(b=>b.classList.toggle('active',b.dataset.accent===S.accent));
    $('settings-overlay').classList.remove('hidden');
    $('settings-backdrop').classList.remove('hidden');
  },
  close(){$('settings-overlay').classList.add('hidden');$('settings-backdrop').classList.add('hidden');},
  setAccent(a,btn){
    S.accent=a; document.documentElement.dataset.accent=a;
    document.querySelectorAll('.ob-acc').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  },
  save(){
    S.name   =$('s-name').value.trim();
    S.city   =$('s-city').value.trim()||'Boston';
    S.topics =$('s-topics').value.trim();
    S.dwGoal =parseInt($('s-dwgoal').value)||3;
    S.openai =$('s-openai').value.trim();
    S.wqPref =$('s-wq').value;
    S.leagues=['nba','nfl','mlb','nhl'].filter(lg=>$(`sl-${lg}`)?.checked);
    if(!S.leagues.length)S.leagues=['nba'];
    save();
    Weather.init(); Brief.fetch(); Sports.refresh();
    Timer.syncFocus();
    this.close();
  },
  reset(){
    Modal.confirm('Reset All Data',
      'This will permanently delete all your MyDayDeck data. This cannot be undone.', () => {
        localStorage.removeItem(KEY); location.reload();
      }, true, 'Reset');
  }
};

/* ══════════════════════════════════════════════════════════
   LAUNCH
══════════════════════════════════════════════════════════ */
function launch(){
  const ob=$('onboarding'); if(ob) ob.classList.add('hidden');
  const app=$('app'); if(app) app.classList.remove('hidden');
  document.documentElement.dataset.accent=S.accent||'clay';

  requestAnimationFrame(()=>{
    Clock.start();
    updateStreak();
    Weather.init();
    Shortcuts.render();
    Capture.init();
    Brief.fetch();
    Todo.render();
    Habits.render();
    Goals.render();
    GoalRings.render();
    Journal.loadToday();
    Timer.render();
    Timer.syncFocus();
    NewsWidget.refresh();
    Sports.refresh();
    WordQuote.render();
    DailySummary.update();

    /* Todo input enter key */
    const ti=$('todo-input');
    if(ti) ti.onkeydown=e=>{if(e.key==='Enter')Todo.add();};
    /* Journal quick save ctrl+enter */
    const jq=$('jp-quick');
    if(jq) jq.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))Journal.quickSave();});
    const jt=$('journal-textarea');
    if(jt) jt.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))Journal.save();});
  });
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.close(); });

document.addEventListener('DOMContentLoaded',()=>{
  try {
    /* Try v5, fall back to migrating v4/v3 data */
    const v5=localStorage.getItem(KEY);
    const legacy=localStorage.getItem('mydaydeck_v4')||localStorage.getItem('daydeck_v3');
    const raw=v5||legacy||null;
    const saved=JSON.parse(raw||'null');
    S=merge(DEFAULTS,saved||{});
    if(!v5&&legacy) localStorage.setItem(KEY,JSON.stringify(S));
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