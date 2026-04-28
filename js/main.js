/* ============================================================
   MyDayDeck v4 — main.js
   ============================================================ */
'use strict';

const STORAGE_KEY = 'mydaydeck_v4';

/* ── WMO weather codes ──────────────────────────────────── */
const WMO = {
  0:['☀️','Clear'],1:['🌤','Mainly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],
  45:['🌫️','Foggy'],48:['🌫️','Icy fog'],51:['🌦','Light drizzle'],53:['🌦','Drizzle'],
  61:['🌧','Light rain'],63:['🌧','Rain'],65:['🌧','Heavy rain'],
  71:['❄️','Light snow'],73:['❄️','Snow'],75:['❄️','Heavy snow'],
  80:['🌦','Showers'],81:['🌧','Showers'],82:['⛈','Storms'],
  95:['⛈','Thunderstorm'],99:['⛈','Severe storm']
};

/* ── Widget registry ────────────────────────────────────── */
const WIDGET_DEFS = [
  {id:'todo',     label:'Daily Checklist', icon:'✓',  wide:false},
  {id:'timer',    label:'Deep Work Timer', icon:'◷',  wide:false},
  {id:'habits',   label:'Habits',          icon:'◉',  wide:false},
  {id:'journal',  label:'Journal Prompt',  icon:'✎',  wide:false},
  {id:'goals',    label:'Goals Preview',   icon:'◎',  wide:false},
  {id:'news',     label:'News Feed',       icon:'⊞',  wide:false},
  {id:'sports',   label:'Sports Scores',   icon:'⚽',  wide:true },
  {id:'wordquote',label:'Quote / Word',    icon:'"',  wide:false},
  {id:'shortcuts',label:'Quick Links',     icon:'⊕',  wide:true },
];

/* ── Widget size system ─────────────────────────────────── */
const WIDGET_SIZES = {
  todo:      {cols:3, rows:2},
  timer:     {cols:3, rows:1},
  habits:    {cols:3, rows:2},
  journal:   {cols:3, rows:2},
  goals:     {cols:3, rows:1},
  news:      {cols:4, rows:3},
  sports:    {cols:6, rows:2},
  wordquote: {cols:3, rows:2},
  shortcuts: {cols:6, rows:1},
};
const SIZE_OPTIONS = [
  {label:'S 3x1',  cols:3,  rows:1},
  {label:'M 3x2',  cols:3,  rows:2},
  {label:'T 3x3',  cols:3,  rows:3},
  {label:'W 4x1',  cols:4,  rows:1},
  {label:'W 4x2',  cols:4,  rows:2},
  {label:'H 6x1',  cols:6,  rows:1},
  {label:'H 6x2',  cols:6,  rows:2},
  {label:'F 12x1', cols:12, rows:1},
  {label:'F 12x2', cols:12, rows:2},
];
function getSizeClass(id){
  const sizes = S.widgetSizes || {};
  const s = sizes[id] || WIDGET_SIZES[id] || {cols:3, rows:2};
  return `w-${s.cols}x${s.rows}`;
}


/* ── Journal prompts ────────────────────────────────────── */
const JOURNAL_PROMPTS = [
  "What's the one thing that, if accomplished today, would make everything else easier?",
  "What are you most grateful for right now, and why?",
  "What's a challenge you're currently facing, and what's one step forward?",
  "Describe a recent win, no matter how small.",
  "What habit or behavior do you want to reinforce this week?",
  "What did you learn yesterday that you want to apply today?",
  "Who made a positive impact on you recently, and how?",
  "What would your future self thank you for doing today?",
  "What's draining your energy right now, and what can you do about it?",
  "What does success look like for you at the end of this week?",
  "What's one thing you've been avoiding that needs your attention?",
  "How are you taking care of yourself today — mentally, physically, emotionally?",
  "What's a belief you hold that might be limiting you?",
  "Describe your ideal day. What elements of it can you bring into today?",
  "What are you most excited about right now?",
];

/* ── Word of the day list ───────────────────────────────── */
const WORDS = [
  {word:'Sonder',pos:'noun',def:'The realization that each passerby has a life as vivid and complex as your own.'},
  {word:'Ephemeral',pos:'adjective',def:'Lasting for a very short time; transitory.'},
  {word:'Eudaimonia',pos:'noun',def:'A state of happiness and flourishing; living in accordance with your values.'},
  {word:'Limerence',pos:'noun',def:'The state of being infatuated with another person, involuntary and obsessive.'},
  {word:'Hiraeth',pos:'noun',def:'A homesickness for a home you cannot return to, or that never was.'},
  {word:'Sanguine',pos:'adjective',def:'Optimistic, especially in a difficult situation.'},
  {word:'Perspicacious',pos:'adjective',def:'Having a ready insight into things; shrewd and astute.'},
  {word:'Liminal',pos:'adjective',def:'Relating to a transitional stage; between two states.'},
  {word:'Solipsism',pos:'noun',def:'The view that the self is all that can be known to exist.'},
  {word:'Verisimilitude',pos:'noun',def:'The appearance of being true or real; believability.'},
  {word:'Equanimity',pos:'noun',def:'Mental calmness, especially in difficult situations.'},
  {word:'Iconoclast',pos:'noun',def:'A person who attacks or criticizes cherished beliefs or institutions.'},
  {word:'Ineffable',pos:'adjective',def:'Too great or extreme to be expressed or described in words.'},
  {word:'Quixotic',pos:'adjective',def:'Exceedingly idealistic; unrealistic and impractical.'},
  {word:'Meliorism',pos:'noun',def:'The belief that the world can be made better by human effort.'},
];

/* ── Default state ──────────────────────────────────────── */
const DEFAULTS = {
  name:'', city:'Boston', accent:'clay', openai:'',
  leagues:['nba','mlb'], topics:'technology,finance,sports',
  dwGoal:3, wordquotePref:'quote',
  widgets:['todo','timer','habits','journal','goals','news','sports','wordquote','shortcuts'],
  widgetOrder:['todo','timer','habits','journal','goals','news','sports','wordquote','shortcuts'],
  todos:[], habits:[], goals:[], journalEntries:[], shortcuts:[], calEvents:[],
  dwSeconds:0, dwSession:1, tasksCompleted:0, streak:0, lastActive:null,
  widgetSizes:{},
  onboardingDone:false
};

let S = {};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch(e){} }
function merge(a,b) {
  const o={...a};
  for(const k of Object.keys(b||{})) {
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
    S.name   = $('ob-name').value.trim();
    S.city   = $('ob-city').value.trim()||'Boston';
    S.topics = $('ob-topics').value.trim()||'technology';
    S.wordquotePref = $('ob-wordquote').value;
    S.leagues = [...document.querySelectorAll('.league-toggles input:checked')].map(i=>i.value);
    if(!S.leagues.length) S.leagues=['nba'];
    const selected = [...document.querySelectorAll('.ob-wtog input:checked')].map(i=>i.closest('.ob-wtog').dataset.w);
    S.widgets = selected.length ? selected : WIDGET_DEFS.map(w=>w.id);
    S.widgetOrder = [...S.widgets];
    S.onboardingDone=true;
    save(); launch();
  }
};

/* ══════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════ */
const Nav = {
  go(view,btn){
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    $(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.rail-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(view==='journal') Journal.renderArchive();
    if(view==='goals')   Goals.render();
    if(view==='tasks')   TaskView.render();
    if(view==='calendar') Cal.render();
    if(view==='focus')   Timer.syncFocusView();
  }
};

/* ══════════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════════ */
const Clock = {
  start(){
    this.tick();
    setInterval(()=>this.tick(),1000);
  },
  tick(){
    const now=new Date();
    const h=now.getHours(),m=String(now.getMinutes()).padStart(2,'0');
    const ampm=h>=12?'PM':'AM',h12=((h%12)||12);
    const el=$('hb-clock'); if(el) el.textContent=`${h12}:${m} ${ampm}`;
    const h2=now.getHours();
    const tod=h2<12?'morning':h2<17?'afternoon':'evening';
    const gr=$('hb-greeting'); if(gr) gr.textContent=`Good ${tod}${S.name?', '+S.name:''}.`;
    const de=$('hb-date'); if(de) de.textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  }
};

/* ══════════════════════════════════════════════════════════
   WEATHER — Open-Meteo (no key)
══════════════════════════════════════════════════════════ */
const Weather = {
  async init(){
    // Strip state/country suffixes like "Boston, MA" → "Boston"
    const rawCity = S.city||'Boston';
    const city = rawCity.split(',')[0].trim();
    try {
      const gr=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      if(!gr.ok) throw 0;
      const gd=await gr.json();
      if(!gd.results?.length) throw 0;
      const {latitude:lat,longitude:lon}=gd.results[0];
      const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`);
      if(!wr.ok) throw 0;
      const wd=await wr.json();
      const [icon,desc]=WMO[wd.current.weather_code]||['🌡️','—'];
      const temp=Math.round(wd.current.temperature_2m);
      const xi=$('hb-wx-icon'),xt=$('hb-wx-temp'),xd=$('hb-wx-desc');
      if(xi) xi.textContent=icon;
      if(xt) xt.textContent=`${temp}°F`;
      if(xd) xd.textContent=desc;
    } catch(e) {
      console.warn('Weather unavailable',e);
    }
  }
};

/* ══════════════════════════════════════════════════════════
   PULSE
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

/* ══════════════════════════════════════════════════════════
   SHORTCUTS
══════════════════════════════════════════════════════════ */
const Shortcuts = {
  render(){
    const el=$('shortcut-list'); if(!el) return;
    if(!S.shortcuts.length){el.innerHTML='';return;}
    el.innerHTML=S.shortcuts.map((s,i)=>`
      <a class="shortcut-item" href="${esc(s.url)}" target="_blank" rel="noopener">
        <img class="shortcut-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.url)}&sz=16" alt="" onerror="this.style.display='none'"/>
        ${esc(s.label)}
        <button class="shortcut-del" onclick="event.preventDefault();Shortcuts.remove(${i})" title="Remove">✕</button>
      </a>`).join('');
  },
  addPrompt(){
    const url=prompt('Enter URL (e.g. https://github.com):'); if(!url||!url.trim()) return;
    const label=prompt('Label (e.g. GitHub):',url.replace(/https?:\/\/(www\.)?/,'').split('/')[0]);
    if(!label) return;
    S.shortcuts.push({url:url.trim(),label:label.trim()});
    save(); this.render();
  },
  remove(i){S.shortcuts.splice(i,1);save();this.render();}
};

/* ══════════════════════════════════════════════════════════
   QUICK CAPTURE
══════════════════════════════════════════════════════════ */
const Capture = {
  init(){
    const inp=$('capture-input');
    if(!inp) return;
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&inp.value.trim()){
        this.parse(inp.value.trim()); inp.value='';
      }
    });
  },
  parse(text){
    const lo=text.toLowerCase();
    if(lo.startsWith('goal:')){ Goals.addItem(text.replace(/^goal:\s*/i,'').trim(),'short'); this.flash('Goal added ✓'); return; }
    if(lo.startsWith('longgoal:')){ Goals.addItem(text.replace(/^longgoal:\s*/i,'').trim(),'long'); this.flash('Long-term goal added ✓'); return; }
    if(lo.startsWith('journal:')){ Journal.quickEntry(text.replace(/^journal:\s*/i,'').trim()); this.flash('Journal entry saved ✓'); return; }
    if(lo.startsWith('link:')||lo.startsWith('shortcut:')){
      const content=text.replace(/^(link|shortcut):\s*/i,'').trim();
      const parts=content.split(' ');
      const url=parts[0]; const label=parts.slice(1).join(' ')||url;
      S.shortcuts.push({url,label}); save(); Shortcuts.render();
      this.flash('Shortcut added ✓'); return;
    }
    /* Default: task */
    S.todos.push({text,done:false,id:Date.now(),tag:this.tag(lo)});
    save(); WidgetRender.todo(); updatePulse();
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
    const orig=inp.placeholder;
    inp.placeholder=msg;
    setTimeout(()=>{inp.placeholder=orig;},2200);
  }
};

/* ══════════════════════════════════════════════════════════
   TO-DO
══════════════════════════════════════════════════════════ */
const Todo = {
  add(){
    const inp=$('todo-input'); if(!inp||!inp.value.trim()) return;
    S.todos.push({text:inp.value.trim(),done:false,id:Date.now(),tag:Capture.tag(inp.value.toLowerCase())});
    inp.value=''; save(); WidgetRender.todo(); updatePulse();
  },
  toggle(i){
    S.todos[i].done=!S.todos[i].done;
    S.tasksCompleted=(S.tasksCompleted||0)+(S.todos[i].done?1:-1);
    if(S.tasksCompleted<0) S.tasksCompleted=0;
    save(); WidgetRender.todo(); updatePulse();
    if(Nav.current==='tasks') TaskView.render();
  },
  remove(i){ S.todos.splice(i,1); save(); WidgetRender.todo(); }
};

/* ══════════════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════════════ */
const Timer = {
  _int:null, running:false,
  toggle(){this.running?this.pause():this.start();},
  start(){
    this.running=true;
    ['timer-start-btn','focus-main-btn'].forEach(id=>{const e=$(id);if(e)e.textContent='Pause';});
    this._int=setInterval(()=>{S.dwSeconds=(S.dwSeconds||0)+1;this.render();if(S.dwSeconds%30===0)save();},1000);
  },
  pause(){
    this.running=false; clearInterval(this._int); save();
    ['timer-start-btn','focus-main-btn'].forEach(id=>{const e=$(id);if(e)e.textContent=this.running?'Pause':'Resume';});
    const sb=$('timer-start-btn'); if(sb) sb.textContent='Resume';
    const fb=$('focus-main-btn'); if(fb) fb.textContent='Resume';
  },
  reset(){
    this.pause(); S.dwSeconds=0; S.dwSession=(S.dwSession||1)+1; save();
    ['timer-start-btn','focus-main-btn'].forEach(id=>{const e=$(id);if(e)e.textContent=id==='focus-main-btn'?'Start Session':'Start';});
    this.render();
  },
  render(){
    const s=S.dwSeconds||0,h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    const disp=h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    const pct=Math.min(100,Math.round((s/((S.dwGoal||3)*3600))*100));
    const td=$('timer-display'); if(td) td.textContent=disp;
    const tp=$('timer-prog-bar'); if(tp) tp.style.width=pct+'%';
    const ts=$('timer-session-lbl'); if(ts) ts.textContent=`Session ${S.dwSession||1}`;
    const dw=$('p-dw'); if(dw) dw.textContent=h>0?`${h}h ${m}m`:`${m}m`;
    this.syncFocusView(disp,pct);
  },
  syncFocusView(disp,pct){
    const ft=$('focus-timer-big'); if(ft&&disp) ft.textContent=disp;
    const fp=$('focus-prog'); if(fp&&pct!==undefined) fp.style.width=pct+'%';
    const fb2=$('focus-badge'); if(fb2) fb2.textContent=`Session ${S.dwSession||1}`;
    const fs=$('focus-sub'); if(fs) fs.textContent=this.running?`${pct||0}% of daily goal`:'Ready when you are';
    const fg=$('focus-goal-lbl'); if(fg) fg.textContent=`${S.dwGoal||3} hours`;
  }
};

/* ══════════════════════════════════════════════════════════
   HABITS
══════════════════════════════════════════════════════════ */
const HABIT_DEFAULTS=['Exercise','Read 30 min','Meditate','No phone before 9am'];
const Habits = {
  ensure(){
    if(!S.habits.length){S.habits=HABIT_DEFAULTS.map(n=>({name:n,done:false,streak:0,lastDate:null}));save();}
  },
  render(){
    this.ensure();
    const el=$('habit-list-widget'); if(!el) return;
    el.innerHTML=S.habits.map((h,i)=>`
      <div class="habit-item ${h.done?'done':''}" onclick="Habits.toggle(${i})">
        <div class="habit-chk">${h.done?'✓':''}</div>
        <span class="habit-name">${esc(h.name)}</span>
        <span class="habit-streak">${h.streak>0?h.streak+'🔥':''}</span>
      </div>`).join('');
    const meta=$('habit-meta-widget');
    if(meta) meta.textContent=`${S.habits.filter(h=>h.done).length}/${S.habits.length}`;
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
   JOURNAL
══════════════════════════════════════════════════════════ */
const Journal = {
  todayPrompt(){
    const day=new Date().getDay()+new Date().getDate();
    return JOURNAL_PROMPTS[day%JOURNAL_PROMPTS.length];
  },
  todayKey(){ return new Date().toDateString(); },
  loadToday(){
    const entry=S.journalEntries.find(e=>e.date===this.todayKey());
    const ta=$('journal-textarea'); if(ta&&entry) ta.value=entry.text;
    const pt=$('journal-prompt-text'); if(pt) pt.textContent=this.todayPrompt();
    const ed=$('journal-entry-date'); if(ed) ed.textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    // Widget prompt
    const wp=$('journal-prompt-widget'); if(wp) wp.textContent=this.todayPrompt();
  },
  save(){
    const ta=$('journal-textarea'); if(!ta) return;
    const text=ta.value.trim(); if(!text) return;
    const key=this.todayKey();
    const idx=S.journalEntries.findIndex(e=>e.date===key);
    const entry={date:key,prompt:this.todayPrompt(),text,ts:Date.now()};
    if(idx>=0) S.journalEntries[idx]=entry; else S.journalEntries.unshift(entry);
    save(); this.renderArchive();
    const msg=document.createElement('div');
    msg.style.cssText='position:fixed;bottom:2rem;right:2rem;background:var(--accent);color:#fff;padding:10px 18px;border-radius:8px;font-size:0.88rem;z-index:9999;animation:fadein 0.2s ease';
    msg.textContent='Entry saved ✓'; document.body.appendChild(msg);
    setTimeout(()=>msg.remove(),2200);
  },
  clear(){ const ta=$('journal-textarea'); if(ta) ta.value=''; },
  quickEntry(text){
    const key=this.todayKey();
    const idx=S.journalEntries.findIndex(e=>e.date===key);
    if(idx>=0){ S.journalEntries[idx].text+='\n'+text; }
    else { S.journalEntries.unshift({date:key,prompt:this.todayPrompt(),text,ts:Date.now()}); }
    save(); this.renderArchive();
  },
  renderArchive(){
    const el=$('journal-archive-list'); if(!el) return;
    if(!S.journalEntries.length){el.innerHTML='<p style="font-size:.85rem;color:var(--ink-3)">No entries yet.</p>';return;}
    el.innerHTML=S.journalEntries.map(e=>`
      <div class="ja-entry">
        <div class="ja-entry-date">${e.date}</div>
        <div class="ja-entry-prompt">${esc(e.prompt||'')}</div>
        <div class="ja-entry-preview">${esc((e.text||'').slice(0,120))}${e.text&&e.text.length>120?'…':''}</div>
      </div>`).join('');
  }
};

/* ══════════════════════════════════════════════════════════
   GOALS
══════════════════════════════════════════════════════════ */
const Goals = {
  render(){
    this.renderCol('short');
    this.renderCol('long');
  },
  renderCol(type){
    const el=$(type==='short'?'goals-short':'goals-long'); if(!el) return;
    const list=S.goals.filter(g=>g.type===type);
    if(!list.length){el.innerHTML='<p style="font-size:.85rem;color:var(--ink-3);padding:4px 0">No goals yet. Add one above →</p>';return;}
    el.innerHTML=list.map((g,i)=>{
      const gIdx=S.goals.indexOf(g);
      return `<div class="goal-item ${g.done?'goal-done':''}">
        <div class="goal-item-hdr">
          <div class="goal-item-text">${esc(g.text)}</div>
          <div class="goal-item-actions">
            <button class="icon-btn-sm" onclick="Goals.toggleDone(${gIdx})" title="${g.done?'Reopen':'Complete'}">✓</button>
            <button class="icon-btn-sm" onclick="Goals.updateProgress(${gIdx})" title="Update progress">↑</button>
            <button class="icon-btn-sm" onclick="Goals.remove(${gIdx})" title="Remove">✕</button>
          </div>
        </div>
        ${g.due?`<div class="goal-due">Due: ${esc(g.due)}</div>`:''}
        <div class="goal-prog-wrap"><div class="goal-prog-bar" style="width:${g.progress||0}%"></div></div>
        <div class="goal-prog-label">${g.progress||0}% complete</div>
      </div>`;
    }).join('');
  },
  addPrompt(){
    const text=prompt('Goal:'); if(!text) return;
    const type=prompt('Type: short or long?','short')==='long'?'long':'short';
    const due=prompt('Due date (optional, e.g. "June 2025"):')||'';
    this.addItem(text,type,due);
  },
  addItem(text,type,due=''){
    S.goals.push({text:text.trim(),type,due,progress:0,done:false,created:Date.now()});
    save(); this.render(); WidgetRender.goals();
  },
  toggleDone(i){ S.goals[i].done=!S.goals[i].done; save(); this.render(); },
  updateProgress(i){
    const p=prompt('Progress (0–100):',S.goals[i].progress||0);
    if(p===null) return;
    S.goals[i].progress=Math.min(100,Math.max(0,parseInt(p)||0));
    save(); this.render();
  },
  remove(i){ if(!confirm('Remove this goal?')) return; S.goals.splice(i,1); save(); this.render(); }
};

/* ══════════════════════════════════════════════════════════
   NEWS — RSS via allorigins
══════════════════════════════════════════════════════════ */
const FEEDS={
  technology:'http://feeds.arstechnica.com/arstechnica/index',
  finance:'https://feeds.reuters.com/reuters/businessNews',
  sports:'http://feeds.bbci.co.uk/sport/rss.xml',
  science:'https://www.sciencedaily.com/rss/all.xml',
  default:'http://feeds.bbci.co.uk/news/rss.xml'
};
const NewsWidget = {
  _articles:[],
  async refresh(){
    const el=$('news-list-widget'); if(!el) return;
    el.innerHTML='<p class="empty-msg loading">Loading headlines…</p>';
    const topic=(S.topics||'').split(',')[0].trim().toLowerCase();
    const feedUrl=FEEDS[topic]||FEEDS.default;
    const topicEl=$('news-topic-widget'); if(topicEl) topicEl.textContent=topic||'Top news';
    try {
      const r=await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`);
      if(!r.ok) throw 0;
      const {contents}=await r.json();
      const doc=new DOMParser().parseFromString(contents,'text/xml');
      const items=[...doc.querySelectorAll('item')].slice(0,7);
      if(!items.length) throw 0;
      this._articles=items.map(item=>({
        title:item.querySelector('title')?.textContent?.trim()||'Untitled',
        link:item.querySelector('link')?.textContent?.trim()||'#',
        pub:item.querySelector('pubDate')?.textContent||''
      }));
      el.innerHTML=this._articles.map(a=>`
        <div class="news-item">
          <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>
          <div class="news-src">${this.ago(a.pub)}</div>
        </div>`).join('');
    } catch { el.innerHTML='<p class="empty-msg">Couldn\'t load news. Try refreshing.</p>'; }
  },
  ago(s){
    if(!s) return '';
    const d=Math.floor((Date.now()-new Date(s))/60000);
    return d<60?`${d}m ago`:d<1440?`${Math.floor(d/60)}h ago`:`${Math.floor(d/1440)}d ago`;
  }
};

/* ══════════════════════════════════════════════════════════
   SPORTS — ESPN unofficial API (no key, CORS-friendly)
══════════════════════════════════════════════════════════ */
const SPORT_CONFIG={
  nba:{sport:'basketball',league:'nba',label:'NBA'},
  nfl:{sport:'americanfootball',league:'nfl',label:'NFL'},
  mlb:{sport:'baseball',league:'mlb',label:'MLB'},
  nhl:{sport:'hockey',league:'nhl',label:'NHL'}
};
const Sports = {
  _data:{}, _active:null,
  async fetchAll(){
    const leagues=S.leagues||['nba'];
    this._active=leagues[0];
    for(const lg of leagues){ await this.fetchLeague(lg); }
    this.renderTabs(); this.renderScores(this._active);
  },
  async fetchLeague(lg){
    const cfg=SPORT_CONFIG[lg]; if(!cfg) return;
    try {
      const url=`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`;
      const r=await fetch(url);
      if(!r.ok) throw 0;
      const d=await r.json();
      this._data[lg]=d.events||[];
    } catch(e){ this._data[lg]=[]; console.warn(`Sports ${lg} failed`,e); }
  },
  renderTabs(){
    const el=$('sports-tabs-widget'); if(!el) return;
    const leagues=S.leagues||['nba'];
    el.innerHTML=leagues.map(lg=>`
      <button class="league-tab ${lg===this._active?'active':''}" onclick="Sports.switchTab('${lg}',this)">
        ${SPORT_CONFIG[lg]?.label||lg.toUpperCase()}
      </button>`).join('');
  },
  switchTab(lg,btn){
    this._active=lg;
    document.querySelectorAll('.league-tab').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    this.renderScores(lg);
  },
  renderScores(lg){
    const el=$('sports-scores-widget'); if(!el) return;
    const events=this._data[lg]||[];
    if(!events.length){
      el.innerHTML=`<p class="scores-empty">No games today for ${SPORT_CONFIG[lg]?.label||lg.toUpperCase()}.</p>`;
      return;
    }
    el.innerHTML=events.slice(0,5).map(ev=>{
      const comps=ev.competitions?.[0];
      if(!comps) return '';
      const home=comps.competitors?.find(c=>c.homeAway==='home');
      const away=comps.competitors?.find(c=>c.homeAway==='away');
      if(!home||!away) return '';
      const homeScore=home.score||'0', awayScore=away.score||'0';
      const homeWin=parseInt(homeScore)>parseInt(awayScore);
      const awayWin=parseInt(awayScore)>parseInt(homeScore);
      const status=comps.status?.type?.shortDetail||ev.status?.type?.shortDetail||'Scheduled';
      const homeName=home.team?.shortDisplayName||home.team?.displayName||'Home';
      const awayName=away.team?.shortDisplayName||away.team?.displayName||'Away';
      return `<div class="score-item">
        <div class="score-teams">
          <div class="score-team-row">
            <span class="score-team-name">${esc(awayName)}</span>
            <span class="score-val ${awayWin?'winner':''}">${awayScore}</span>
          </div>
          <div class="score-team-row">
            <span class="score-team-name">${esc(homeName)}</span>
            <span class="score-val ${homeWin?'winner':''}">${homeScore}</span>
          </div>
          <div class="score-status">${esc(status)}</div>
        </div>
      </div>`;
    }).join('');
  }
};

/* ══════════════════════════════════════════════════════════
   WORD / QUOTE
══════════════════════════════════════════════════════════ */
const WordQuote = {
  _quoteCache:null,
  async render(){
    const el=$('wq-content'); if(!el) return;
    const pref=S.wordquotePref||'quote';
    if(pref==='none'){el.innerHTML='<p class="empty-msg">Disabled in Settings.</p>';return;}
    if(pref==='word'||pref==='both'){ this.renderWord(el,pref==='both'); }
    if(pref==='quote'||pref==='both'){ await this.renderQuote(el,pref==='both'); }
  },
  renderWord(container,append){
    const day=new Date().getDay()+new Date().getDate();
    const w=WORDS[day%WORDS.length];
    const html=`<div class="${append?'':''}wq-word">${esc(w.word)}</div>
      <div class="wq-pos">${esc(w.pos)}</div>
      <div class="wq-def">${esc(w.def)}</div>`;
    if(append) container.insertAdjacentHTML('beforeend',`<div style="margin-bottom:0.75rem">${html}</div>`);
    else container.innerHTML=html;
  },
  async renderQuote(container,append){
    try {
      if(!this._quoteCache){
        const r=await fetch('https://api.quotable.io/random?maxLength=140');
        if(!r.ok) throw 0;
        this._quoteCache=await r.json();
      }
      const q=this._quoteCache;
      const html=`<div class="wq-quote-mark">"</div>
        <div class="wq-text">${esc(q.content)}</div>
        <div class="wq-author">— ${esc(q.author)}</div>`;
      if(append) container.insertAdjacentHTML('beforeend',html);
      else container.innerHTML=html;
    } catch {
      const fallbacks=['The secret of getting ahead is getting started. — Mark Twain','Simplicity is the ultimate sophistication. — Da Vinci'];
      const f=fallbacks[Math.floor(Math.random()*fallbacks.length)].split(' — ');
      const html=`<div class="wq-quote-mark">"</div><div class="wq-text">${esc(f[0])}</div><div class="wq-author">— ${esc(f[1])}</div>`;
      if(append) container.insertAdjacentHTML('beforeend',html);
      else container.innerHTML=html;
    }
  },
  async refresh(){ this._quoteCache=null; await this.render(); }
};

/* ══════════════════════════════════════════════════════════
   BRIEF
══════════════════════════════════════════════════════════ */
const Brief = {
  async fetch(){
    const el=$('brief-text'); if(!el) return;
    const key=S.openai;
    if(!key){ el.textContent='Add an OpenAI key in Settings for a personalized daily brief.'; return; }
    el.innerHTML='<span class="loading">Generating your brief…</span>';
    const todos=S.todos.filter(t=>!t.done).map(t=>t.text).join(', ')||'none';
    const h=new Date().getHours();
    const tod=h<12?'morning':h<17?'afternoon':'evening';
    const prompt=`Write a 2-sentence ${tod} brief for ${S.name||'the user'} in ${S.city}. Date: ${new Date().toDateString()}. Tasks: ${todos}. Warm, direct, end with one focus tip. No bullets.`;
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
   TASK FULL VIEW
══════════════════════════════════════════════════════════ */
const TAG_LABELS={task:'Task',comm:'Comm',learn:'Learn',create:'Create',review:'Review'};
const TaskView = {
  _f:'all',
  filter(f,btn){ this._f=f; document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); this.render(); },
  render(){
    const el=$('task-full-list'); if(!el) return;
    let todos=S.todos;
    if(this._f==='active') todos=todos.filter(t=>!t.done);
    if(this._f==='done')   todos=todos.filter(t=>t.done);
    if(!todos.length){el.innerHTML='<p style="font-size:.9rem;color:var(--ink-3);padding:.5rem">No tasks here.</p>';return;}
    el.innerHTML=todos.map(t=>{
      const i=S.todos.indexOf(t);
      return `<div class="task-full-item${t.done?' done':''}" onclick="Todo.toggle(${i});TaskView.render()">
        <div class="todo-cb">${t.done?'✓':''}</div>
        <span style="flex:1;font-size:.9rem;color:var(--ink)${t.done?';text-decoration:line-through;color:var(--ink-3)':''}">${esc(t.text)}</span>
        ${t.tag?`<span class="task-tag">${TAG_LABELS[t.tag]||t.tag}</span>`:''}
        <button class="todo-del" style="opacity:1;font-size:.75rem" onclick="event.stopPropagation();S.todos.splice(${i},1);save();TaskView.render()">✕</button>
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
    const done=S.todos.filter(t=>t.done);
    const habits=S.habits.filter(h=>h.done);
    const topGoals=S.goals.filter(g=>g.progress>0||g.done).slice(0,5);
    const entries=S.journalEntries.slice(0,3);
    el.innerHTML=`
      <div>
        <div class="ws-section-title">✓ Tasks completed (${done.length})</div>
        ${done.slice(0,10).map(t=>`<div class="ws-item">${esc(t.text)}</div>`).join('')||'<div class="ws-item">None yet.</div>'}
      </div>
      <div>
        <div class="ws-section-title">◉ Habits done today (${habits.length}/${S.habits.length})</div>
        ${habits.map(h=>`<div class="ws-item">${esc(h.name)} ${h.streak>1?'— '+h.streak+' day streak':''}</div>`).join('')||'<div class="ws-item">None yet.</div>'}
      </div>
      <div>
        <div class="ws-section-title">◎ Goals in progress</div>
        ${topGoals.map(g=>`<div class="ws-item">${esc(g.text)} — ${g.progress}%${g.done?' ✓':''}</div>`).join('')||'<div class="ws-item">No goals tracked yet.</div>'}
      </div>
      <div>
        <div class="ws-section-title">✎ Recent journal entries</div>
        ${entries.map(e=>`<div class="ws-item"><strong>${e.date}</strong> — ${esc((e.text||'').slice(0,80))}…</div>`).join('')||'<div class="ws-item">No entries yet.</div>'}
      </div>`;
    $('weekly-modal').classList.remove('hidden');
    $('modal-backdrop').classList.remove('hidden');
  },
  close(){ $('weekly-modal').classList.add('hidden'); $('modal-backdrop').classList.add('hidden'); }
};

/* ══════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════ */
const Cal = {
  _year:new Date().getFullYear(), _month:new Date().getMonth(),
  _view:'month', _selectedDate:null,

  render(){ if(this._view==='month') this.renderMonth(); },

  renderMonth(){
    const el=$('cal-grid'); if(!el) return;
    const lbl=$('cal-month-label');
    if(lbl) lbl.textContent=new Date(this._year,this._month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html=days.map(d=>`<div class="cal-day-header">${d}</div>`).join('');

    const first=new Date(this._year,this._month,1).getDay();
    const total=new Date(this._year,this._month+1,0).getDate();
    const prevTotal=new Date(this._year,this._month,0).getDate();
    const today=new Date();

    for(let i=0;i<first;i++){
      const d=prevTotal-first+i+1;
      html+=`<div class="cal-cell other-month"><div class="cal-day-num">${d}</div></div>`;
    }
    for(let d=1;d<=total;d++){
      const isToday=today.getFullYear()===this._year&&today.getMonth()===this._month&&today.getDate()===d;
      const dateStr=`${this._year}-${String(this._month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const evts=S.calEvents.filter(e=>e.date===dateStr);
      const dots=evts.slice(0,3).map(e=>`<div class="cal-event-dot">${esc(e.title)}</div>`).join('');
      const more=evts.length>3?`<div class="cal-more">+${evts.length-3} more</div>`:'';
      html+=`<div class="cal-cell${isToday?' today':''}" onclick="Cal.selectDate('${dateStr}')">
        <div class="cal-day-num">${d}</div>${dots}${more}
      </div>`;
    }
    const remaining=(7-((first+total)%7))%7;
    for(let i=1;i<=remaining;i++){
      html+=`<div class="cal-cell other-month"><div class="cal-day-num">${i}</div></div>`;
    }
    el.innerHTML=html;
  },

  selectDate(dateStr){
    this._selectedDate=dateStr;
    const panel=$('cal-events-panel'); if(!panel) return;
    panel.style.display='block';
    const lbl=$('cep-date-label');
    if(lbl) lbl.textContent=new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    const evts=S.calEvents.filter(e=>e.date===dateStr);
    const list=$('cep-events-list'); if(!list) return;
    list.innerHTML=!evts.length?`<p class="cep-empty">No events on this day.</p>`:
      evts.map((e,i)=>{
        const gIdx=S.calEvents.indexOf(e);
        return `<div class="cep-event">
          <div class="cep-event-dot"></div>
          <div class="cep-event-info">
            <div class="cep-event-title">${esc(e.title)}</div>
            <div class="cep-event-time">${e.time?esc(e.time):''} ${e.notes?'· '+esc(e.notes):''}</div>
          </div>
          <button class="cep-event-del" onclick="Cal.removeEvent(${gIdx})" title="Delete">✕</button>
        </div>`;
      }).join('');
  },

  closePanel(){
    const p=$('cal-events-panel'); if(p) p.style.display='none';
    this._selectedDate=null;
  },

  addEvent(){
    const dateStr=prompt('Date (YYYY-MM-DD):',new Date().toISOString().split('T')[0]); if(!dateStr) return;
    this.addEventOnDate(dateStr);
  },

  addEventOnDate(dateStr){
    const d=dateStr||this._selectedDate||new Date().toISOString().split('T')[0];
    const title=prompt('Event title:'); if(!title) return;
    const time=prompt('Time (e.g. 2:00 PM, optional):')||'';
    const notes=prompt('Notes (optional):')||'';
    S.calEvents.push({date:d,title:title.trim(),time,notes,id:Date.now()});
    save(); this.render();
    if(this._selectedDate===d) this.selectDate(d);
  },

  removeEvent(i){ S.calEvents.splice(i,1); save(); this.render(); if(this._selectedDate) this.selectDate(this._selectedDate); },
  prevMonth(){ if(this._month===0){this._month=11;this._year--;}else{this._month--;} this.render(); },
  nextMonth(){ if(this._month===11){this._month=0;this._year++;}else{this._month++;} this.render(); },
  setView(v,btn){ this._view=v; document.querySelectorAll('.cal-vbtn').forEach(b=>b.classList.remove('active')); if(btn) btn.classList.add('active'); this.render(); },

  importICS(input){
    const file=input.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const text=e.target.result;
        const events=this.parseICS(text);
        S.calEvents=[...S.calEvents,...events];
        save(); this.render();
        alert(`Imported ${events.length} event(s) successfully!`);
      } catch(err){ alert('Error parsing .ics file. Make sure it\'s a valid calendar file.'); }
    };
    reader.readAsText(file);
    input.value='';
  },

  parseICS(text){
    const events=[];
    const lines=text.replace(/\r\n|\r/g,'\n').split('\n');
    let current=null;
    for(const line of lines){
      if(line==='BEGIN:VEVENT'){ current={}; }
      else if(line==='END:VEVENT'&&current){
        if(current.title&&current.date){ events.push(current); }
        current=null;
      } else if(current){
        if(line.startsWith('SUMMARY:')) current.title=line.slice(8).trim();
        else if(line.startsWith('DTSTART')){ 
          const val=line.split(':').pop().trim();
          if(val.length>=8){
            const y=val.slice(0,4),mo=val.slice(4,6),d=val.slice(6,8);
            current.date=`${y}-${mo}-${d}`;
            if(val.length>8&&val.includes('T')){
              const t=val.slice(9,13);
              const h=parseInt(t.slice(0,2)),m=t.slice(2,4);
              current.time=`${h>12?h-12:h||12}:${m} ${h>=12?'PM':'AM'}`;
            }
          }
        }
        else if(line.startsWith('DESCRIPTION:')) current.notes=line.slice(12).trim().slice(0,60);
        else if(line.startsWith('LOCATION:')) current.notes=(current.notes?current.notes+' · ':'')+line.slice(9).trim().slice(0,40);
      }
    }
    return events;
  }
};

/* ══════════════════════════════════════════════════════════
   WIDGET EDITOR
══════════════════════════════════════════════════════════ */
const WidgetEditor = {
  open(){
    const el=$('we-list'); if(!el) return;
    el.innerHTML=WIDGET_DEFS.map(w=>{
      const on=S.widgets.includes(w.id);
      return `<div class="we-row" draggable="true" data-wid="${w.id}">
        <span class="we-drag">⠿</span>
        <span style="flex:1">${w.icon} ${w.label}</span>
        <label class="toggle-sw">
          <input type="checkbox" ${on?'checked':''} data-wid="${w.id}" onchange="WidgetEditor.toggleCheck(this)"/>
          <span class="toggle-sl"></span>
        </label>
      </div>`;
    }).join('');
    this.initDrag();
    $('widget-editor-modal').classList.remove('hidden');
    $('modal-backdrop').classList.remove('hidden');
  },
  toggleCheck(cb){
    const id=cb.dataset.wid;
    if(cb.checked){ if(!S.widgets.includes(id)) S.widgets.push(id); }
    else { S.widgets=S.widgets.filter(w=>w!==id); }
  },
  initDrag(){
    const list=$('we-list'); if(!list) return;
    let dragged=null;
    list.querySelectorAll('.we-row').forEach(row=>{
      row.addEventListener('dragstart',()=>dragged=row);
      row.addEventListener('dragover',e=>{e.preventDefault();const after=row;if(after!==dragged){list.insertBefore(dragged,after);}});
    });
  },
  save(){
    /* Read order from DOM */
    const order=[...$('we-list').querySelectorAll('.we-row')].map(r=>r.dataset.wid);
    S.widgetOrder=order;
    save();
    this.close();
    WidgetRender.all();
  },
  close(){ $('widget-editor-modal').classList.add('hidden'); $('modal-backdrop').classList.add('hidden'); }
};

/* ══════════════════════════════════════════════════════════
   WIDGET RENDERER (builds home canvas)
══════════════════════════════════════════════════════════ */
/* ── Canvas edit mode ───────────────────────────────────── */
const CanvasEdit = {
  active: false,
  toggle(){
    this.active = !this.active;
    const canvas = $('widget-canvas');
    const banner = $('edit-banner');
    if(canvas) canvas.classList.toggle('canvas-edit-mode', this.active);
    if(banner) banner.classList.toggle('show', this.active);
    document.querySelectorAll('[id^="canvas-edit-btn"]').forEach(b=>{
      b.textContent = this.active ? 'Done' : 'Edit layout';
    });
    if(!this.active){ WidgetRender.closeAllPickers(); save(); }
  },
  closeAllPickers(){ document.querySelectorAll('.size-picker.open').forEach(p=>p.classList.remove('open')); },
  setSize(id, cols, rows){
    if(!S.widgetSizes) S.widgetSizes = {};
    S.widgetSizes[id] = {cols, rows};
    save();
    WidgetRender.all();
  }
};

const WidgetRender = {
  all(){
    const canvas=$('widget-canvas'); if(!canvas) return;
    canvas.innerHTML='';
    if(!S.widgetSizes) S.widgetSizes = {};
    const order=S.widgetOrder||S.widgets;
    for(const id of order){
      if(!S.widgets.includes(id)) continue;
      const def=WIDGET_DEFS.find(w=>w.id===id); if(!def) continue;
      const sizeClass = getSizeClass(id);
      const card=document.createElement('div');
      card.className=`card ${sizeClass}`;
      card.style.position = 'relative';
      card.style.overflow = 'hidden';
      card.dataset.widget=id;
      // Add drag + resize handles (shown only in edit mode via CSS)
      card.innerHTML=`
        <button class="drag-btn" title="Drag to reorder">⠿</button>
        ${this.sizePicker(id)}
        <button class="resize-btn" onclick="CanvasEdit.closeAllPickers();this.nextElementSibling||this.previousElementSibling;this.closest('.card').querySelector('.size-picker').classList.toggle('open')" title="Resize">⤢</button>
        ${this.template(id)}`;
      canvas.appendChild(card);
    }
    if(CanvasEdit.active) canvas.classList.add('canvas-edit-mode');
    this.bindAll();
    this.initDrag();
  },

  sizePicker(id){
    const cur = (S.widgetSizes||{})[id] || WIDGET_SIZES[id] || {cols:3,rows:2};
    const btns = SIZE_OPTIONS.map(o=>`
      <button class="sp-btn${o.cols===cur.cols&&o.rows===cur.rows?' active':''}"
        onclick="CanvasEdit.setSize('${id}',${o.cols},${o.rows});this.closest('.size-picker').classList.remove('open')"
      >${o.label}</button>`).join('');
    return `<div class="size-picker"><span class="sp-label">Widget size</span>${btns}</div>`;
  },

  template(id){
    switch(id){
      case 'todo': return `
        <div class="card-hdr"><span class="card-title">Daily Checklist</span><span class="card-meta" id="todo-meta-widget">0 left</span></div>
        <div class="todo-list" id="todo-list-widget"></div>
        <div class="todo-add-row">
          <input type="text" class="todo-inp" id="todo-input-widget" placeholder="Add a task…"/>
          <button class="add-btn" onclick="Todo.add()">+</button>
        </div>`;

      case 'timer': return `
        <div class="card-hdr"><span class="card-title">Deep Work</span><span class="card-meta" id="timer-goal-widget">Goal: ${S.dwGoal||3}h</span></div>
        <div class="timer-display" id="timer-display">00:00</div>
        <div class="timer-prog-wrap"><div class="timer-prog-bar" id="timer-prog-bar"></div></div>
        <div class="timer-controls">
          <button class="timer-btn" id="timer-start-btn" onclick="Timer.toggle()">Start</button>
          <button class="timer-btn timer-btn-ghost" onclick="Timer.reset()">Reset</button>
        </div>
        <div class="timer-session" id="timer-session-lbl">Session 1</div>`;

      case 'habits': return `
        <div class="card-hdr"><span class="card-title">Habit Time</span><span class="card-meta" id="habit-meta-widget"></span></div>
        <div class="habit-list" id="habit-list-widget"></div>`;

      case 'journal': return `
        <div class="card-hdr"><span class="card-title">Today's Prompt</span></div>
        <div class="jp-label">Journal</div>
        <div class="jp-prompt" id="journal-prompt-widget" style="font-size:.9rem;color:var(--ink-2);line-height:1.5;font-style:italic">Loading…</div>
        <button class="btn-sm" style="margin-top:4px" onclick="Nav.go('journal',document.querySelector('[data-view=journal]'))">Open journal →</button>`;

      case 'goals': return `
        <div class="card-hdr"><span class="card-title">Goals</span><button class="card-action" onclick="Goals.addPrompt()">+</button></div>
        <div id="goals-preview-widget"></div>
        <button class="btn-sm" style="margin-top:4px;background:none;color:var(--accent);border:1px solid var(--border);font-size:.78rem" onclick="Nav.go('goals',document.querySelector('[data-view=goals]'))">View all goals →</button>`;

      case 'news': return `
        <div class="card-hdr"><span class="card-title">News Feed</span><button class="card-action" id="news-refresh-btn" onclick="NewsWidget.refresh()">↺</button></div>
        <div class="news-topic" id="news-topic-widget"></div>
        <div class="news-list" id="news-list-widget"><p class="empty-msg loading">Loading…</p></div>`;

      case 'sports': return `
        <div class="card-hdr"><span class="card-title">Sports Scores</span><button class="card-action" onclick="Sports.fetchAll()">↺</button></div>
        <div class="sports-league-tabs" id="sports-tabs-widget"></div>
        <div class="sports-scores" id="sports-scores-widget"><p class="scores-empty loading">Loading scores…</p></div>`;

      case 'wordquote': return `
        <div class="card-hdr"><span class="card-title">${S.wordquotePref==='word'?'Word of the Day':S.wordquotePref==='both'?'Quote & Word':'Quote of the Day'}</span><button class="card-action wq-refresh" onclick="WordQuote.refresh()">↺</button></div>
        <div id="wq-content"><p class="empty-msg loading">Loading…</p></div>`;

      case 'shortcuts': return `
        <div class="card-hdr"><span class="card-title">Quick Links</span><button class="card-action" onclick="Shortcuts.addPrompt()">+ Add</button></div>
        <div class="shortcut-list" id="shortcut-list-widget"></div>`;

      default: return `<div class="card-hdr"><span class="card-title">${id}</span></div>`;
    }
  },

  bindAll(){
    /* Re-bind todo input */
    const ti=$('todo-input-widget');
    if(ti) ti.onkeydown=e=>{if(e.key==='Enter') Todo.add();};
    /* Render all data */
    this.todo();
    Habits.render();
    Journal.loadToday();
    this.goals();
    Timer.render();
    NewsWidget.refresh();
    Sports.fetchAll();
    WordQuote.render();
    this.shortcuts();
  },

  todo(){
    const el=$('todo-list-widget'); if(!el) return;
    const todos=S.todos;
    el.innerHTML=!todos.length
      ?'<p style="font-size:.88rem;color:var(--ink-3);padding:3px 0">No tasks yet.</p>'
      :todos.slice(0,8).map((t,i)=>`
        <div class="todo-item${t.done?' done':''}" onclick="Todo.toggle(${i})">
          <div class="todo-cb">${t.done?'✓':''}</div>
          <span class="todo-txt">${esc(t.text)}</span>
          <button class="todo-del" onclick="event.stopPropagation();Todo.remove(${i})">✕</button>
        </div>`).join('');
    const left=todos.filter(t=>!t.done).length;
    const meta=$('todo-meta-widget'); if(meta) meta.textContent=`${left} left`;
  },

  goals(){
    const el=$('goals-preview-widget'); if(!el) return;
    const active=S.goals.filter(g=>!g.done).slice(0,3);
    if(!active.length){el.innerHTML='<p style="font-size:.85rem;color:var(--ink-3)">No active goals.</p>';return;}
    el.innerHTML=active.map(g=>`
      <div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.88rem;color:var(--ink)">
        ${esc(g.text)}<br/>
        <div style="margin-top:4px;height:3px;background:var(--bg-card2);border-radius:999px;overflow:hidden">
          <div style="height:100%;background:var(--accent);width:${g.progress||0}%"></div>
        </div>
      </div>`).join('');
  },

  shortcuts(){
    const el=$('shortcut-list-widget'); if(!el) return;
    el.innerHTML=S.shortcuts.map((s,i)=>`
      <a class="shortcut-item" href="${esc(s.url)}" target="_blank" rel="noopener">
        <img class="shortcut-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.url)}&sz=16" alt="" onerror="this.style.display='none'"/>
        ${esc(s.label)}
        <button class="shortcut-del" onclick="event.preventDefault();Shortcuts.remove(${i})" title="Remove">✕</button>
      </a>`).join('');
  },

  initDrag(){
    const canvas=$('widget-canvas'); if(!canvas) return;
    let dragged=null;
    canvas.querySelectorAll('.card').forEach(card=>{
      card.setAttribute('draggable','true');
      // Only allow drag from drag-btn in edit mode
      card.addEventListener('dragstart',e=>{
        if(!CanvasEdit.active){ e.preventDefault(); return; }
        dragged=card;
        setTimeout(()=>card.classList.add('is-dragging'),0);
      });
      card.addEventListener('dragend',()=>{
        card.classList.remove('is-dragging');
        canvas.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-target'));
        const newOrder=[...canvas.querySelectorAll('.card')].map(c=>c.dataset.widget);
        S.widgetOrder=newOrder; save();
      });
      card.addEventListener('dragover',e=>{
        e.preventDefault();
        if(dragged&&dragged!==card){
          canvas.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-target'));
          card.classList.add('drag-target');
          const rect=card.getBoundingClientRect();
          const midY=rect.top+rect.height/2;
          if(e.clientY<midY) canvas.insertBefore(dragged,card);
          else canvas.insertBefore(dragged,card.nextSibling);
        }
      });
      card.addEventListener('dragleave',()=>card.classList.remove('drag-target'));
      card.addEventListener('drop',e=>{ e.preventDefault(); card.classList.remove('drag-target'); });
    });
    // Resize button click
    canvas.querySelectorAll('.resize-btn').forEach(btn=>{
      btn.onclick = e=>{
        e.stopPropagation();
        CanvasEdit.closeAllPickers();
        const picker = btn.closest('.card').querySelector('.size-picker');
        if(picker) picker.classList.toggle('open');
      };
    });
    // Close pickers on outside click
    document.addEventListener('click', e=>{
      if(!e.target.closest('.size-picker')&&!e.target.closest('.resize-btn')){
        CanvasEdit.closeAllPickers();
      }
    }, {once:false});
  }
};

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
const Settings = {
  open(){
    $('s-name').value  =S.name;
    $('s-city').value  =S.city;
    $('s-topics').value=S.topics;
    $('s-dwgoal').value=S.dwGoal||3;
    $('s-openai').value=S.openai||'';
    $('s-wordquote').value=S.wordquotePref||'quote';
    ['nba','nfl','mlb','nhl'].forEach(lg=>{ const el=$(`sl-${lg}`); if(el) el.checked=(S.leagues||[]).includes(lg); });
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
    S.topics =$('s-topics').value.trim();
    S.dwGoal =parseInt($('s-dwgoal').value)||3;
    S.openai =$('s-openai').value.trim();
    S.wordquotePref=$('s-wordquote').value;
    S.leagues=['nba','nfl','mlb','nhl'].filter(lg=>$(`sl-${lg}`)?.checked);
    if(!S.leagues.length) S.leagues=['nba'];
    save();
    Weather.init(); Brief.fetch(); Sports.fetchAll();
    this.close();
    WidgetRender.all();
  },
  reset(){ if(!confirm('Reset all MyDayDeck data? This cannot be undone.')) return; localStorage.removeItem(STORAGE_KEY); location.reload(); }
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
    Journal.loadToday();
    WidgetRender.all();
  });
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  try {
    // Try v4 key first, fall back to migrating v3 data
    const v4raw = localStorage.getItem(STORAGE_KEY);
    const v3raw = localStorage.getItem('daydeck_v3');
    const raw = v4raw || v3raw || null;
    const saved = JSON.parse(raw||'null');
    S = merge(DEFAULTS, saved||{});
    // If we migrated from v3, save under v4 key
    if(!v4raw && v3raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
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