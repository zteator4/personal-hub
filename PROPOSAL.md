# DayDeck — Proposal

## What are you building? Who is it for?

DayDeck is a modular, AI-powered personal dashboard designed to serve as your browser's home screen. It aggregates your to-do list, weather, news, sports scores, music, market data, and more into a single customizable card-based interface. It's built for students and young professionals who want a smarter, more personalized start to their day.

## Why?

Every morning involves opening five or six different tabs — weather, news, Spotify, a task list, sports scores. DayDeck replaces all of them with one clean, configurable home screen that also uses AI to synthesize everything into a brief, personalized morning summary. The goal is fewer tabs, less friction, and a smarter start to the day.

## MVP vs. Stretch Goals

**MVP (minimum working version):**
- Live clock and date hero element
- Weather widget (current conditions + forecast)
- To-do list widget with local storage persistence
- News feed widget filtered by user interests
- Sports tracker widget for a favorite team
- AI daily brief (OpenAI synthesizes weather + tasks + news into a morning summary)
- Daily quote widget
- Settings panel: toggle widgets on/off, set city, team, and interests
- Light/dark mode + accent color theme picker
- Onboarding flow for first-time setup
- Fully responsive card grid layout
- Deployed on GitHub Pages

**Stretch goals (if time allows):**
- Spotify widget (currently playing or curated playlist)
- Market ticker widget (stocks or crypto via CoinGecko)
- Event countdown widget
- Quick links / bookmark bar widget
- Dynamic wallpaper via Unsplash API
- Habit tracker widget with Chart.js streaks
- Mood check-in that adjusts AI brief tone and playlist suggestion
- AI task prioritizer
- "Chat with your day" AI assistant
- Drag-and-drop widget reordering
- Focus mode (hides everything except clock and to-do list)
- PWA support (installable on mobile)

## Technologies

| Category | Tools / APIs |
|---|---|
| Core | HTML, CSS (Grid + Flexbox), JavaScript |
| Weather | OpenWeatherMap API |
| News | NewsAPI |
| Sports | TheSportsDB API |
| Music | Spotify Web API |
| AI | OpenAI API (GPT-4o) |
| Market data | CoinGecko API |
| Photos | Unsplash API |
| Charts | Chart.js |
| Storage | localStorage |
| Deployment | GitHub Pages |