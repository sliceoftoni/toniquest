// ToniQuest — static MVP logic (clean version)

// ---------- GM mode ----------
const qs = new URLSearchParams(location.search);
const isGM = qs.get('gm') === '1';

// ---------- Element lookups ----------
const $ = (q) => document.querySelector(q);
const joinSection   = $('#joinSection');
const gameSection   = $('#gameSection');
const teamNameInput = $('#teamName');
const teamLabel     = $('#teamLabel');
const pointsLabel   = $('#pointsLabel');
const stopLabel     = $('#stopLabel');
const clueTitle     = $('#clueTitle');
const clueText      = $('#clueText');
const clueImage     = $('#clueImage');
const codeInput     = $('#codeInput');
const photoInput    = $('#photoInput');
const photoPreview  = $('#photoPreview');
const hintBtn       = $('#hintBtn');
const hintText      = $('#hintText');
const submitBtn     = $('#submitBtn');
const resultText    = $('#resultText');
const geoBtn        = $('#geoBtn');
const geoStatus     = $('#geoStatus');
const leaderboard   = $('#leaderboard');
const installBtn    = $('#installBtn');
const skipBtn       = $('#skipBtn'); // <-- important: define it!

// Hide Skip unless GM
if (skipBtn) {
  skipBtn.style.display = isGM ? 'inline-block' : 'none';
}

// ---------- State ----------
let stops = [];
let state = {
  team: localStorage.getItem('tq_team') || '',
  points: Number(localStorage.getItem('tq_points')) || 0,
  currentStopIndex: Number(localStorage.getItem('tq_stop')) || 0,
  usedHints: JSON.parse(localStorage.getItem('tq_hints') || '{}'),
};

// ---------- Helpers ----------
async function loadStops() {
  // cache-bust stops in case SW holds an old copy
  const r = await fetch(`data/stops.json?v=${Date.now()}`);
  stops = await r.json();
}

function saveState() {
  localStorage.setItem('tq_team', state.team);
  localStorage.setItem('tq_points', String(state.points));
  localStorage.setItem('tq_stop', String(state.currentStopIndex));
  localStorage.setItem('tq_hints', JSON.stringify(state.usedHints));
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  // Accurate Haversine
  const R = 6371000;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderLeaderboard() {
  if (!leaderboard) return;
  // Local-only demo leaderboard. In a multi-team setup you’d replace this with server data.
  leaderboard.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = `${state.team || '—'} — ${state.points} pts`;
  leaderboard.appendChild(li);
}

function render() {
  if (!state.team) {
    joinSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    return;
  }

  joinSection.classList.add('hidden');
  gameSection.classList.remove('hidden');

  teamLabel.textContent   = state.team;
  pointsLabel.textContent = state.points;

  const s = stops[state.currentStopIndex];
  stopLabel.textContent = `${state.currentStopIndex + 1} / ${stops.length}`;
  clueTitle.textContent = s.clueTitle || s.name || 'Next Stop';
  clueText.textContent  = s.clueText  || '';

  if (s.assets && s.assets.length) {
    clueImage.src = s.assets[0];
    clueImage.classList.remove('hidden');
  } else {
    clueImage.classList.add('hidden');
  }

  codeInput.value = '';
  resultText.textContent = '';
  hintText.classList.add('hidden');
  renderLeaderboard();
}

// ---------- Event handlers ----------
$('#joinBtn').addEventListener('click', () => {
  const name = (teamNameInput.value || '').trim();
  if (!name) {
    alert('Pick a team name ✨');
    return;
  }
  state.team = name;
  saveState();
  render();
});

hintBtn.addEventListener('click', () => {
  const s = stops[state.currentStopIndex];
  if (!state.usedHints[s.id]) {
    state.usedHints[s.id] = true;
    state.points = Math.max(0, state.points - 5);
    hintText.textContent = 'Hint: ' + (s.hint || 'No hint available.');
    hintText.classList.remove('hidden');
    saveState();
    renderLeaderboard();
  } else {
    hintText.textContent = 'You already used the hint here.';
    hintText.classList.remove('hidden');
  }
});

photoInput.addEventListener('change', () => {
  const f = photoInput.files[0];
  if (f) {
    const url = URL.createObjectURL(f);
    photoPreview.src = url;
    photoPreview.classList.remove('hidden');
  } else {
    photoPreview.classList.add('hidden');
  }
});

geoBtn.addEventListener('click', () => {
  const s = stops[state.currentStopIndex];

  if (!navigator.geolocation) {
    geoStatus.textContent = 'GPS not available in this browser.';
    return;
  }
  if (!window.isSecureContext) {
    geoStatus.textContent = 'GPS needs HTTPS. Open the Vercel link in a new tab.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const d = distanceMeters(
        pos.coords.latitude, pos.coords.longitude,
        s.geo.lat, s.geo.lng
      );
      const within = d <= (s.geo.radius_m || 150);
      geoStatus.textContent = within
        ? `Within range ✅ (${Math.round(d)} m)`
        : `Out of range ❌ (${Math.round(d)} m)`;
    },
    (err) => {
      const codes = {
        1: 'Permission denied — allow Location for this site/app.',
        2: 'Position unavailable — try outdoors / Precise Location ON.',
        3: 'Timeout — step into open sky and try again.',
      };
      geoStatus.textContent = `GPS error: ${codes[err.code] || err.message || 'Unknown error'}`;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

submitBtn.addEventListener('click', () => {
  const s = stops[state.currentStopIndex];

  // Time-gate (e.g., keep people at Fitzgerald until golden hour)
  if (s.notBefore) {
    const now  = new Date();
    const gate = new Date(s.notBefore);
    if (now < gate) {
      resultText.textContent = 'Too early to complete this stop. Enjoy the view for a bit ✨';
      return;
    }
  }

  // Validate requirements
  let ok = true;

  if (s.type.includes('code')) {
    const expected = (s?.answer?.code || '').trim().toLowerCase();
    const provided = codeInput.value.trim().toLowerCase();
    ok = !!expected && provided === expected;
    if (!ok) {
      resultText.textContent = 'Code incorrect.';
      return;
    }
  }

  if (s.type.includes('photo')) {
    ok = photoInput.files.length > 0 || s?.answer?.photoRequired === false;
    if (!ok) {
      resultText.textContent = 'Please add a photo for proof.';
      return;
    }
  }

  // Award points & advance
  state.points += s.points || 0;
  if (state.currentStopIndex < stops.length - 1) {
    state.currentStopIndex += 1;
  }
  saveState();
  render();
});

// Skip (GM only)
if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    if (!isGM) return; // hard block if someone surfaces the button
    if (!confirm('Skip this stop for this device?')) return;

    if (state.currentStopIndex < stops.length - 1) {
      state.currentStopIndex += 1;
      saveState();
      render();
    } else {
      resultText.textContent = 'Already at the final stop.';
    }
  });
}

// ---------- PWA install ----------
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    installBtn.hidden = true;
  }
});

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// ---------- Boot ----------
loadStops().then(render);
