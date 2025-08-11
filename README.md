# ToniQuest (Scavenger Hunt PWA Prototype)

A tiny, static web app for your birthday mystery quest. No build tools required — just open `index.html` or deploy the folder to Vercel.

## Features
- Team join (saved in localStorage)
- Clue flow for 5 stops (Redwood → Temescal → Devil’s Slide → Fitzgerald → Final)
- GPS radius check (`navigator.geolocation`)
- Photo proof via camera (file input accepts images)
- Hints with point penalty
- Simple local leaderboard
- Offline-friendly shell (basic service worker)
- Installable (web app manifest)

> This is an MVP; you can upgrade later to Next.js + Supabase. For now it’s perfect for testing on real phones.

## Quick Start (local)
1. Double-click `index.html` to open in your browser.
   - For GPS and camera prompts to work reliably, serve over HTTP/HTTPS:
2. If you have Python: `python3 -m http.server 8080` then visit http://localhost:8080

## Deploy to Vercel (recommended)
1. Create a new GitHub repo and push these files (see instructions in the main chat).
2. On https://vercel.com → **New Project** → import your repo.
3. Framework Preset: **Other** (static site). No build command. Output directory: `/`.
4. Deploy. You’ll get a URL like `https://toniquest.vercel.app`.
5. Open on your phone → allow Location and Camera when prompted.

## Customize
- Edit `data/stops.json` for clue text, codes, geofences, etc.
- Replace images in `/assets/` and update paths in `stops.json`.
- Adjust geofence radius per stop (meters).

## Files
- `index.html` → UI + components
- `app.js` → game logic
- `style.css` → minimal styling
- `data/stops.json` → your stops & clues
- `manifest.webmanifest` → installable app config
- `sw.js` → service worker for basic offline shell
