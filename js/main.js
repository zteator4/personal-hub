/* ============================================================
   DayDeck — main.js
   Core application logic. Organized as a single App namespace
   with sub-modules for each feature area.
   ============================================================ */

'use strict';

/* ── Default state (used when no localStorage data exists) ─── */
const DEFAULTS = {
  name: '',
  city: 'Boston',
  team: '',
  topics: 'technology,science,business',
  theme: 'dark',
  accent: 'blue',
  widgets: {
    clock: true, weather: true, todo: true,
    news: true, sports: true, quote: true,
    market: false, habit: false, countdown: false, links: false
  },
  apiKeys: { openai: '', weather: '', news: '' },
  todos: [],
  habits: [],
  countdowns: [],
  links: [],
  onboardingDone: false
};

/* ── Widget metadata for labels ─────────────────────────────── */
const WIDGET_LABELS = {
  clock: 'Clock', weather: 'Weather', todo: 'To-Do',
  news: 'News', sports: 'Sports', quote: 'Quote',
  market: 'Markets', habit: 'Habits', countdown: 'Countdowns', links: 'Quick Links'
};

/* ── Weather icon map (OpenWeatherMap condition codes) ──────── */
const WEATHER_ICONS = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅',
  '03d':'☁️','03n':'☁️','04d':'☁️','04n':'☁️',
  '09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌦️',
  '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️',
  '50d':'🌫️','50n':'🌫️'
};

/* ============================================================
   App — Main namespace
   ============================================================ */
const App = {

  /* ── State ─────────────────────────────────────────────── */
  state: {},

  /* ── Init ──────────────────────────────────────────────── */
  init() {
    this.state = this.storage.load();

    if (!this.state.onboardingDone) {
      this.onboarding.show();
    } else {
      this.launch();
    }
  },

  launch() {
    /* Apply theme & accent before revealing the app */
    this.theme.apply();
    this.widgets.applyVisibility();

    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    /* Start all modules */
    this.clock.start();
    this.greeting.update();
    this.weather.init();
    this.todo.render();
    this.news.init();
    this.sports.init();
    this.quote.fetch();
    this.market.init();
    this.habit.render();
    this.countdown.render();
    this.countdown.startTick();
    this.links.render();
    this.brief.fetch();
    this.settings.buildToggles();

    /* Wire to-do input Enter key */
    document.getElementById('todo-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') App.todo.add();
    });
  },


  /* ── Storage ────────────────────────────────────────────── */
  storage: {
    KEY: 'daydeck_state',

    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(App.storage.KEY) || 'null');
        /* Deep merge saved over defaults so new keys always exist */
        return App.storage.merge(DEFAULTS, saved || {});
      } catch {
        return { ...DEFAULTS };
      }
    },

    save() {
      try {
        localStorage.setItem(App.storage.KEY, JSON.stringify(App.state));
      } catch (e) {
        console.warn('DayDeck: could not save state', e);
      }
    },

    /* Recursive merge: defaults <- saved */
    merge(defaults, saved) {
      const result = { ...defaults };
      for (const key of Object.keys(saved)) {
        if (key in result && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = App.storage.merge(result[key], saved[key] || {});
        } else {
          result[key] = saved[key];
        }
      }
      return result;
    }
  },


  /* ── Onboarding ─────────────────────────────────────────── */
  onboarding: {
    currentStep: 1,
    totalSteps: 5,

    show() {
      document.getElementById('onboarding').classList.remove('hidden');
      /* Pre-apply current theme for onboarding */
      App.theme.apply();
    },

    showStep(n) {
      document.querySelectorAll('.ob-step').forEach(el => el.classList.remove('active'));
      document.querySelector(`.ob-step[data-step="${n}"]`).classList.add('active');
      document.querySelectorAll('.ob-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === n - 1);
      });
      this.currentStep = n;
    },

    next() {
      if (this.currentStep < this.totalSteps) {
        this.showStep(this.currentStep + 1);
      }
    },

    prev() {
      if (this.currentStep > 1) {
        this.showStep(this.currentStep - 1);
      }
    },

    finish() {
      /* Collect all onboarding values */
      App.state.name   = document.getElementById('ob-name').value.trim();
      App.state.city   = document.getElementById('ob-city').value.trim() || 'Boston';
      App.state.team   = document.getElementById('ob-team').value.trim();
      App.state.topics = document.getElementById('ob-topics').value.trim() || 'technology,sports';

      /* Collect widget selections */
      document.querySelectorAll('.ob-widget-toggle').forEach(label => {
        const widget = label.dataset.widget;
        const checked = label.querySelector('input').checked;
        App.state.widgets[widget] = checked;
      });

      App.state.onboardingDone = true;
      App.storage.save();
      App.launch();
    }
  },


  /* ── Theme ──────────────────────────────────────────────── */
  theme: {
    apply() {
      document.documentElement.dataset.theme  = App.state.theme;
      document.documentElement.dataset.accent = App.state.accent;

      /* Sync active states in both onboarding and settings */
      document.querySelectorAll('.theme-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === App.state.theme);
      });
      document.querySelectorAll('.accent-dot').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.accent === App.state.accent);
      });
    },

    set(theme, btn) {
      App.state.theme = theme;
      App.storage.save();
      this.apply();
    },

    setAccent(accent, btn) {
      App.state.accent = accent;
      App.storage.save();
      this.apply();
    }
  },


  /* ── Widgets visibility ─────────────────────────────────── */
  widgets: {
    applyVisibility() {
      document.querySelectorAll('[data-widget]').forEach(el => {
        const name = el.dataset.widget;
        const visible = App.state.widgets[name] !== false;
        el.classList.toggle('hidden', !visible);
      });
    },

    toggle(name, visible) {
      App.state.widgets[name] = visible;
      App.storage.save();
      this.applyVisibility();
    },

    /* Build the toggle list inside settings panel */
    buildToggles() {
      const container = document.getElementById('settings-widget-toggles');
      container.innerHTML = '';
      for (const [name, label] of Object.entries(WIDGET_LABELS)) {
        const enabled = App.state.widgets[name] !== false;
        const row = document.createElement('div');
        row.className = 'settings-widget-toggle';
        row.innerHTML = `
          <span>${label}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${enabled ? 'checked' : ''}
              onchange="App.widgets.toggle('${name}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        `;
        container.appendChild(row);
      }
    }
  },


  /* ── Clock ──────────────────────────────────────────────── */
  clock: {
    _timer: null,

    start() {
      this.tick();
      this._timer = setInterval(() => this.tick(), 1000);
    },

    tick() {
      const now = new Date();
      /* Format time as 12-hour with AM/PM */
      const hours   = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm    = hours >= 12 ? 'PM' : 'AM';
      const h12     = ((hours % 12) || 12);

      document.getElementById('clock-time').textContent = `${h12}:${minutes} ${ampm}`;

      /* Format date as "Monday, April 23" */
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      });
      document.getElementById('clock-date').textContent = dateStr;
    }
  },


  /* ── Greeting ───────────────────────────────────────────── */
  greeting: {
    update() {
      const hour = new Date().getHours();
      const tod  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const name = App.state.name ? `, ${App.state.name}` : '';
      document.getElementById('header-greeting').textContent = `Good ${tod}${name}`;
    }
  },


  /* ── Weather ────────────────────────────────────────────── */
  weather: {
    async init() {
      const key  = App.state.apiKeys.weather;
      const city = App.state.city || 'Boston';

      if (!key) {
        this.showDemo(city);
        return;
      }

      try {
        /* Current weather */
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=imperial`
        );
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();

        document.getElementById('weather-location').textContent = data.name;
        document.getElementById('weather-icon').textContent     = WEATHER_ICONS[data.weather[0].icon] || '🌡️';
        document.getElementById('weather-temp').textContent     = `${Math.round(data.main.temp)}°F`;
        document.getElementById('weather-desc').textContent     = data.weather[0].description;
        document.getElementById('weather-humidity').textContent = `Humidity: ${data.main.humidity}%`;
        document.getElementById('weather-wind').textContent     = `Wind: ${Math.round(data.wind.speed)} mph`;

        /* Forecast */
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=imperial&cnt=24`
        );
        if (forecastRes.ok) {
          const fData = await forecastRes.json();
          this.renderForecast(fData.list);
        }
      } catch (e) {
        console.warn('Weather fetch failed:', e);
        this.showDemo(city);
      }
    },

    renderForecast(list) {
      /* Show one reading per day (every 8th entry = 24hrs apart) */
      const days = [];
      const seen = new Set();
      for (const item of list) {
        const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
        if (!seen.has(day)) {
          seen.add(day);
          days.push({ day, icon: WEATHER_ICONS[item.weather[0].icon] || '🌡️', temp: Math.round(item.main.temp) });
        }
        if (days.length >= 4) break;
      }

      const container = document.getElementById('weather-forecast');
      container.innerHTML = days.map(d => `
        <div class="forecast-day">
          <span class="fd-label">${d.day}</span>
          <span class="fd-icon">${d.icon}</span>
          <span class="fd-temp">${d.temp}°</span>
        </div>
      `).join('');
    },

    showDemo(city) {
      /* Placeholder data when no API key is configured */
      document.getElementById('weather-location').textContent = city;
      document.getElementById('weather-icon').textContent     = '⛅';
      document.getElementById('weather-temp').textContent     = '68°F';
      document.getElementById('weather-desc').textContent     = 'Partly cloudy';
      document.getElementById('weather-humidity').textContent = 'Humidity: 58%';
      document.getElementById('weather-wind').textContent     = 'Wind: 12 mph';
      document.getElementById('weather-forecast').innerHTML   = `
        <div class="forecast-day"><span class="fd-label">Tue</span><span class="fd-icon">☀️</span><span class="fd-temp">72°</span></div>
        <div class="forecast-day"><span class="fd-label">Wed</span><span class="fd-icon">🌧️</span><span class="fd-temp">61°</span></div>
        <div class="forecast-day"><span class="fd-label">Thu</span><span class="fd-icon">⛅</span><span class="fd-temp">66°</span></div>
        <div class="forecast-day"><span class="fd-label">Fri</span><span class="fd-icon">☀️</span><span class="fd-temp">74°</span></div>
      `;
    }
  },


  /* ── To-Do ──────────────────────────────────────────────── */
  todo: {
    render() {
      const list = document.getElementById('todo-list');
      const todos = App.state.todos;

      list.innerHTML = todos.length === 0
        ? `<p style="font-size:0.82rem;color:var(--text-3);padding:0.5rem 0;">No tasks yet — add one below.</p>`
        : todos.map((t, i) => `
          <div class="todo-item ${t.done ? 'done' : ''}" onclick="App.todo.toggle(${i})">
            <div class="todo-checkbox">${t.done ? '✓' : ''}</div>
            <span class="todo-text">${this.escape(t.text)}</span>
            <button class="todo-delete" onclick="event.stopPropagation(); App.todo.remove(${i})" title="Delete">✕</button>
          </div>
        `).join('');

      const remaining = todos.filter(t => !t.done).length;
      document.getElementById('todo-count').textContent = `${remaining} left`;
    },

    add() {
      const input = document.getElementById('todo-input');
      const text  = input.value.trim();
      if (!text) return;

      App.state.todos.push({ text, done: false, id: Date.now() });
      App.storage.save();
      input.value = '';
      this.render();
    },

    toggle(i) {
      App.state.todos[i].done = !App.state.todos[i].done;
      App.storage.save();
      this.render();
    },

    remove(i) {
      App.state.todos.splice(i, 1);
      App.storage.save();
      this.render();
    },

    /* Basic HTML escape to prevent XSS from user input */
    escape(str) {
      return str
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  },


  /* ── News ───────────────────────────────────────────────── */
  news: {
    async init() { await this.refresh(); },

    async refresh() {
      const key    = App.state.apiKeys.news;
      const topics = App.state.topics || 'technology';
      const list   = document.getElementById('news-list');

      if (!key) {
        list.innerHTML = `
          <p class="news-empty">Add your NewsAPI key in Settings to load headlines.</p>
          <p class="news-api-note">Free key at <a href="https://newsapi.org" target="_blank">newsapi.org</a></p>
        `;
        return;
      }

      list.innerHTML = `<div class="skeleton" style="height:16px;width:80%;margin:4px 0"></div>
                        <div class="skeleton" style="height:16px;width:70%;margin:4px 0"></div>
                        <div class="skeleton" style="height:16px;width:85%;margin:4px 0"></div>`;

      try {
        const query = topics.split(',')[0].trim();
        const res   = await fetch(
          `https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(query)}&language=en&pageSize=7&apiKey=${key}`
        );
        if (!res.ok) throw new Error('News API error');
        const data = await res.json();

        if (!data.articles || data.articles.length === 0) {
          list.innerHTML = `<p class="news-empty">No headlines found for "${query}".</p>`;
          return;
        }

        list.innerHTML = data.articles.map(a => `
          <div class="news-item">
            <a href="${a.url}" target="_blank" rel="noopener">${a.title}</a>
            <span class="news-source">${a.source.name} · ${this.timeAgo(a.publishedAt)}</span>
          </div>
        `).join('');
      } catch (e) {
        console.warn('News fetch failed:', e);
        list.innerHTML = `<p class="news-empty">Couldn't load news. Check your API key in Settings.</p>`;
      }
    },

    timeAgo(dateStr) {
      const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
      return `${Math.floor(diff/1440)}d ago`;
    }
  },


  /* ── Sports ─────────────────────────────────────────────── */
  sports: {
    async init() { await this.refresh(); },

    async refresh() {
      const team    = App.state.team;
      const content = document.getElementById('sports-content');

      if (!team) {
        content.innerHTML = `<p class="sports-empty">Add your favorite team in Settings.</p>`;
        return;
      }

      document.getElementById('sports-team-name').textContent = team;
      content.innerHTML = `<div class="skeleton" style="height:60px;border-radius:8px;"></div>`;

      try {
        /* TheSportsDB free API — search events for team */
        const searchRes = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`
        );
        const searchData = await searchRes.json();

        if (!searchData.teams || searchData.teams.length === 0) {
          content.innerHTML = `<p class="sports-empty">Team not found. Try a different name.</p>`;
          return;
        }

        const teamId = searchData.teams[0].idTeam;

        /* Get next event */
        const nextRes  = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${teamId}`);
        const nextData = await nextRes.json();

        if (!nextData.events || nextData.events.length === 0) {
          content.innerHTML = `<p class="sports-empty">No upcoming games found.</p>`;
          return;
        }

        const evt = nextData.events[0];
        const gameDate = new Date(evt.dateEvent + 'T' + (evt.strTime || '00:00:00'));
        const dateLabel = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        content.innerHTML = `
          <div class="sports-game">
            <div class="sports-teams">
              <div class="sports-team">
                <span class="sports-team-name">${evt.strHomeTeam}</span>
                <span class="sports-score">${evt.intHomeScore ?? '–'}</span>
              </div>
              <span class="sports-vs">vs</span>
              <div class="sports-team">
                <span class="sports-team-name">${evt.strAwayTeam}</span>
                <span class="sports-score">${evt.intAwayScore ?? '–'}</span>
              </div>
            </div>
            <div class="sports-status">${dateLabel} · ${evt.strLeague}</div>
          </div>
        `;
      } catch (e) {
        console.warn('Sports fetch failed:', e);
        content.innerHTML = `<p class="sports-empty">Couldn't load sports data.</p>`;
      }
    }
  },


  /* ── Quote ──────────────────────────────────────────────── */
  quote: {
    async fetch() {
      const textEl   = document.getElementById('quote-text');
      const authorEl = document.getElementById('quote-author');

      textEl.textContent   = 'Loading…';
      authorEl.textContent = '—';

      try {
        /* quotable.io — free, no auth needed */
        const res  = await fetch('https://api.quotable.io/random?maxLength=120');
        if (!res.ok) throw new Error();
        const data = await res.json();
        textEl.textContent   = data.content;
        authorEl.textContent = `— ${data.author}`;
      } catch {
        /* Fallback quotes if API is unavailable */
        const fallbacks = [
          { content: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
          { content: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
          { content: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
          { content: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
        ];
        const q = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        textEl.textContent   = q.content;
        authorEl.textContent = `— ${q.author}`;
      }
    }
  },


  /* ── Market ─────────────────────────────────────────────── */
  market: {
    /* Default watchlist — user can customize later */
    COINS: ['bitcoin', 'ethereum', 'solana'],

    async init() {
      if (!App.state.widgets.market) return;
      await this.refresh();
    },

    async refresh() {
      const list = document.getElementById('market-list');
      list.innerHTML = `<div class="skeleton" style="height:14px;margin:4px 0"></div>`.repeat(3);

      try {
        /* CoinGecko free API — no auth needed */
        const ids = this.COINS.join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) throw new Error('Market API error');
        const data = await res.json();

        const coinNames = { bitcoin: 'Bitcoin', ethereum: 'Ethereum', solana: 'Solana' };

        list.innerHTML = this.COINS.map(id => {
          if (!data[id]) return '';
          const price  = data[id].usd;
          const change = data[id].usd_24h_change;
          const dir    = change >= 0 ? 'up' : 'down';
          const sign   = change >= 0 ? '+' : '';

          return `
            <div class="market-item">
              <div>
                <div class="market-name">${coinNames[id] || id}</div>
                <div class="market-symbol">${id.toUpperCase().slice(0,3)}</div>
              </div>
              <div style="text-align:right">
                <div class="market-price">$${price.toLocaleString('en-US', {maximumFractionDigits:2})}</div>
                <div class="market-change ${dir}">${sign}${change.toFixed(2)}%</div>
              </div>
            </div>
          `;
        }).join('');
      } catch (e) {
        console.warn('Market fetch failed:', e);
        list.innerHTML = `<p class="news-empty">Couldn't load market data.</p>`;
      }
    }
  },


  /* ── Habits ─────────────────────────────────────────────── */
  habit: {
    /* Default habits if none saved */
    DEFAULTS: ['Exercise', 'Read', 'Meditate'],

    init() {
      if (App.state.habits.length === 0) {
        App.state.habits = this.DEFAULTS.map(name => ({
          name, streak: 0, doneToday: false, lastDate: null
        }));
        App.storage.save();
      }
    },

    render() {
      if (!App.state.widgets.habit) return;
      this.init();

      const today = new Date().toDateString();
      const list  = document.getElementById('habit-list');

      list.innerHTML = App.state.habits.map((h, i) => `
        <div class="habit-item ${h.doneToday ? 'done' : ''}" onclick="App.habit.toggle(${i})">
          <div class="habit-check">${h.doneToday ? '✓' : ''}</div>
          <span class="habit-name">${h.name}</span>
          <span class="habit-streak">${h.streak > 0 ? `${h.streak}🔥` : ''}</span>
        </div>
      `).join('');
    },

    toggle(i) {
      const habit = App.state.habits[i];
      const today = new Date().toDateString();
      habit.doneToday = !habit.doneToday;

      if (habit.doneToday) {
        const lastDay = habit.lastDate ? new Date(habit.lastDate).toDateString() : null;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        habit.streak = (lastDay === yesterday) ? habit.streak + 1 : 1;
        habit.lastDate = new Date().toISOString();
      } else {
        habit.streak = Math.max(0, habit.streak - 1);
      }

      App.storage.save();
      this.render();
    }
  },


  /* ── Countdowns ─────────────────────────────────────────── */
  countdown: {
    _timer: null,

    render() {
      if (!App.state.widgets.countdown) return;

      const list = document.getElementById('countdown-list');

      if (App.state.countdowns.length === 0) {
        list.innerHTML = `<p style="font-size:0.82rem;color:var(--text-3)">No countdowns yet. Add one with the + button.</p>`;
        return;
      }

      const now = Date.now();
      list.innerHTML = App.state.countdowns.map((c, i) => {
        const diff    = new Date(c.date).getTime() - now;
        const days    = Math.floor(diff / 86400000);
        const hours   = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const label   = diff < 0 ? 'Passed' : `${days}d ${hours}h ${minutes}m`;

        return `
          <div class="countdown-item">
            <div class="countdown-name">${c.name}</div>
            <div class="countdown-value">${label}</div>
            <div class="countdown-sub">${new Date(c.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          </div>
        `;
      }).join('');
    },

    startTick() {
      this._timer = setInterval(() => this.render(), 60000);
    },

    addPrompt() {
      const name = prompt('Event name:');
      if (!name) return;
      const dateStr = prompt('Event date (YYYY-MM-DD):');
      if (!dateStr) return;
      App.state.countdowns.push({ name: name.trim(), date: dateStr });
      App.storage.save();
      this.render();
    }
  },


  /* ── Quick Links ────────────────────────────────────────── */
  links: {
    DEFAULTS: [
      { label: 'Gmail',    url: 'https://mail.google.com',    icon: '✉' },
      { label: 'Canvas',   url: 'https://canvas.instructure.com', icon: '◎' },
      { label: 'GitHub',   url: 'https://github.com',         icon: '◈' },
      { label: 'Calendar', url: 'https://calendar.google.com',icon: '◷' },
    ],

    render() {
      if (!App.state.widgets.links) return;
      if (App.state.links.length === 0) {
        App.state.links = [...this.DEFAULTS];
        App.storage.save();
      }

      const grid = document.getElementById('links-grid');
      grid.innerHTML = App.state.links.map((l, i) => `
        <a class="link-item" href="${l.url}" target="_blank" rel="noopener" title="${l.label}">
          <div class="link-icon">${l.icon || '◉'}</div>
          <span class="link-label">${l.label}</span>
        </a>
      `).join('');
    },

    addPrompt() {
      const label = prompt('Link label:');
      if (!label) return;
      const url   = prompt('URL (include https://):');
      if (!url) return;
      const icon  = prompt('Icon (emoji or symbol, optional):') || '◉';
      App.state.links.push({ label: label.trim(), url: url.trim(), icon });
      App.storage.save();
      this.render();
    }
  },


  /* ── AI Daily Brief ─────────────────────────────────────── */
  brief: {
    async fetch() {
      const key     = App.state.apiKeys.openai;
      const textEl  = document.getElementById('brief-text');

      if (!key) {
        textEl.innerHTML = `
          <span style="color:var(--text-3)">
            Add your OpenAI key in Settings to enable AI daily briefs.
          </span>
        `;
        return;
      }

      textEl.innerHTML = `<span class="brief-loading">Generating your daily brief…</span>`;

      /* Build context from current state */
      const name   = App.state.name || 'there';
      const city   = App.state.city || 'your city';
      const todos  = App.state.todos.filter(t => !t.done).map(t => t.text).join(', ') || 'none';
      const hour   = new Date().getHours();
      const tod    = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      const prompt = `You are a smart personal assistant writing a brief daily summary for ${name}.
It is ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}, ${tod}.
They are in ${city}.
Their pending tasks today: ${todos}.
Write a warm, concise 2-3 sentence brief: acknowledge the day, mention their tasks if any, and give one motivating note.
Be natural and conversational. No bullet points. No greetings like "Good morning" since that's already shown.`;

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 120,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!res.ok) throw new Error('OpenAI API error');
        const data = await res.json();
        textEl.textContent = data.choices[0].message.content.trim();
      } catch (e) {
        console.warn('Brief fetch failed:', e);
        textEl.innerHTML = `<span style="color:var(--text-3)">Couldn't generate brief. Check your OpenAI key in Settings.</span>`;
      }
    }
  },


  /* ── Settings Panel ─────────────────────────────────────── */
  settings: {
    open() {
      /* Populate fields with current state */
      document.getElementById('s-name').value   = App.state.name;
      document.getElementById('s-city').value   = App.state.city;
      document.getElementById('s-team').value   = App.state.team;
      document.getElementById('s-topics').value = App.state.topics;
      document.getElementById('s-openai').value = App.state.apiKeys.openai;
      document.getElementById('s-weather').value= App.state.apiKeys.weather;
      document.getElementById('s-news').value   = App.state.apiKeys.news;

      /* Sync theme/accent buttons */
      App.theme.apply();

      document.getElementById('settings-panel').classList.add('open');
      document.getElementById('settings-backdrop').classList.remove('hidden');
    },

    close() {
      document.getElementById('settings-panel').classList.remove('open');
      document.getElementById('settings-backdrop').classList.add('hidden');
    },

    save() {
      App.state.name   = document.getElementById('s-name').value.trim();
      App.state.city   = document.getElementById('s-city').value.trim() || 'Boston';
      App.state.team   = document.getElementById('s-team').value.trim();
      App.state.topics = document.getElementById('s-topics').value.trim();

      App.state.apiKeys.openai  = document.getElementById('s-openai').value.trim();
      App.state.apiKeys.weather = document.getElementById('s-weather').value.trim();
      App.state.apiKeys.news    = document.getElementById('s-news').value.trim();

      App.storage.save();
      App.theme.apply();
      App.greeting.update();
      App.weather.init();
      App.news.refresh();
      App.sports.refresh();
      App.brief.fetch();
      this.close();
    },

    reset() {
      if (!confirm('This will clear all your data and preferences. Are you sure?')) return;
      localStorage.removeItem(App.storage.KEY);
      location.reload();
    },

    buildToggles() {
      App.widgets.buildToggles();
    }
  },


  /* ── Focus Mode ─────────────────────────────────────────── */
  focusMode: {
    active: false,
    toggle() {
      this.active = !this.active;
      document.body.classList.toggle('focus-mode', this.active);
      document.getElementById('focus-btn').style.color = this.active ? 'var(--accent)' : '';
    }
  }

}; /* end App */


/* ============================================================
   Bootstrap — run when DOM is ready
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => App.init());