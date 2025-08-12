// Minimal ToniQuest logic (static MVP)
const $ = (q)=>document.querySelector(q);
const joinSection = $('#joinSection');
const gameSection = $('#gameSection');
const teamNameInput = $('#teamName');
const teamLabel = $('#teamLabel');
const pointsLabel = $('#pointsLabel');
const stopLabel = $('#stopLabel');
const clueTitle = $('#clueTitle');
const clueText = $('#clueText');
const clueImage = $('#clueImage');
const codeInput = $('#codeInput');
const photoInput = $('#photoInput');
const photoPreview = $('#photoPreview');
const hintBtn = $('#hintBtn');
const hintText = $('#hintText');
const submitBtn = $('#submitBtn');
const resultText = $('#resultText');
const geoBtn = $('#geoBtn');
const geoStatus = $('#geoStatus');
const leaderboard = $('#leaderboard');
const installBtn = $('#installBtn');

let stops = [];
let state = {
  team: localStorage.getItem('tq_team') || '',
  points: Number(localStorage.getItem('tq_points')) || 0,
  currentStopIndex: Number(localStorage.getItem('tq_stop')) || 0,
  usedHints: JSON.parse(localStorage.getItem('tq_hints')||'{}')
};

async function loadStops(){
  const r = await fetch('data/stops.json');
  stops = await r.json();
}

function saveState(){
  localStorage.setItem('tq_team', state.team);
  localStorage.setItem('tq_points', String(state.points));
  localStorage.setItem('tq_stop', String(state.currentStopIndex));
  localStorage.setItem('tq_hints', JSON.stringify(state.usedHints));
}

function render(){
  if(!state.team){
    joinSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    return;
  }
  joinSection.classList.add('hidden');
  gameSection.classList.remove('hidden');
  teamLabel.textContent = state.team;
  pointsLabel.textContent = state.points;

  const s = stops[state.currentStopIndex];
  stopLabel.textContent = `${state.currentStopIndex+1} / ${stops.length}`;
  clueTitle.textContent = s.clueTitle;
  clueText.textContent = s.clueText;
  if(s.assets && s.assets.length){
    clueImage.src = s.assets[0];
    clueImage.classList.remove('hidden');
  } else {
    clueImage.classList.add('hidden');
  }
  codeInput.value = '';
  resultText.textContent = '';
  hintText.classList.add('hidden');
}

$('#joinBtn').addEventListener('click', ()=>{
  const name = teamNameInput.value.trim();
  if(!name){ alert('Pick a team name ✨'); return; }
  state.team = name;
  saveState();
  render();
});

hintBtn.addEventListener('click', ()=>{
  const s = stops[state.currentStopIndex];
  if(!state.usedHints[s.id]){
    state.usedHints[s.id] = true;
    state.points = Math.max(0, state.points - 5);
    hintText.textContent = 'Hint: ' + (s.hint || 'No hint.');
    hintText.classList.remove('hidden');
    saveState(); render();
  } else {
    hintText.textContent = 'You already used the hint here.';
    hintText.classList.remove('hidden');
  }
});

photoInput.addEventListener('change', ()=>{
  const f = photoInput.files[0];
  if(f){
    const url = URL.createObjectURL(f);
    photoPreview.src = url;
    photoPreview.classList.remove('hidden');
  } else {
    photoPreview.classList.add('hidden');
  }
});

geoBtn.addEventListener('click', ()=>{
  const s = stops[state.currentStopIndex];
  if(!navigator.geolocation){
    geoStatus.textContent = 'GPS not available in this browser.';
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    const d = distanceMeters(pos.coords.latitude, pos.coords.longitude, s.geo.lat, s.geo.lng);
    const within = d <= (s.geo.radius_m || 150);
    geoStatus.textContent = within ? `Within range ✅ (${Math.round(d)} m)` : `Out of range ❌ (${Math.round(d)} m)`;
  }, err=>{
    geoStatus.textContent = 'GPS error: ' + err.message;
  }, {enableHighAccuracy:true, timeout:10000});
});

submitBtn.addEventListener('click', ()=>{
  const s = stops[state.currentStopIndex];
  // Time gate
  if(s.notBefore){
    const now = new Date();
    const gate = new Date(s.notBefore);
    if(now < gate){
      resultText.textContent = 'Too early to complete this stop. Enjoy the view for a bit ✨';
      return;
    }
  }
  // Validate simple requirements
  let ok = true;
  if(s.type.includes('code')){
    const code = (s?.answer?.code || '').trim().toLowerCase();
    const val = codeInput.value.trim().toLowerCase();
    ok = !!code && val === code;
    if(!ok){ resultText.textContent = 'Code incorrect.'; return; }
  }
  if(s.type.includes('photo')){
    ok = photoInput.files.length > 0 || s?.answer?.photoRequired === false;
    if(!ok){ resultText.textContent = 'Please add a photo for proof.'; return; }
  }
  state.points += s.points || 0;
  if(state.currentStopIndex < stops.length-1){
    state.currentStopIndex += 1;
  }
  saveState(); render();
});

skipBtn.addEventListener('click', () => {
  // Optional: confirm skip
  if (!confirm('Skip this stop for this device?')) return;

  // Jump ahead one stop (bypass time gates & scoring)
  if (state.currentStopIndex < stops.length - 1) {
    state.currentStopIndex += 1;
    saveState();
    render();
  } else {
    resultText.textContent = 'Already at the final stop.';
  }
});

function distanceMeters(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = (x)=>x*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*sin2(dLon/2);
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function sin2(x){ return Math.sin(x)*Math.sin(x); }

// PWA install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    installBtn.hidden = true;
  }
});

// SW
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js');
}

// Boot
loadStops().then(render);
