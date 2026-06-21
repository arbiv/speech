/* ============================================================
   STATE
   ============================================================ */
let currentVerbIndex = 0;
let currentMode = 'click';
let streakCount = 0;
let pendingChar = null; // 'j' or 'n', for voice mode
let recognition = null;
let isListening = false;

/* ============================================================
   VERB DATA
   ============================================================ */
const VERBS = [
  { name:'קפיצה',  boy:'קופץ',  girl:'קופצת',  anim:'jump',  sound:'jump',    sentence: (g)=> g==='j' ? 'הילד קופץ' : 'הילדה קופצת'  },
  { name:'צחוק',   boy:'צוחק',  girl:'צוחקת',  anim:'laugh', sound:'success', sentence: (g)=> g==='j' ? 'הילד צוחק' : 'הילדה צוחקת'  },
  { name:'ישיבה',  boy:'יושב',  girl:'יושבת',  anim:'sit',   sound:'success', sentence: (g)=> g==='j' ? 'הילד יושב' : 'הילדה יושבת'  },
  { name:'למידה',  boy:'לומד',  girl:'לומדת',  anim:'learn', sound:'success', sentence: (g)=> g==='j' ? 'הילד לומד' : 'הילדה לומדת'  },
  { name:'גזירה',  boy:'גוזר',  girl:'גוזרת',  anim:'cut',   sound:'success', sentence: (g)=> g==='j' ? 'הילד גוזר' : 'הילדה גוזרת'  },
  { name:'זריקה',  boy:'זורק',  girl:'זורקת',  anim:'throw', sound:'throw',   sentence: (g)=> g==='j' ? 'הילד זורק' : 'הילדה זורקת'  },
  { name:'חשיבה',  boy:'חושב',  girl:'חושבת',  anim:'think', sound:'think',   sentence: (g)=> g==='j' ? 'הילד חושב' : 'הילדה חושבת'  },
  { name:'ריקוד',  boy:'רוקד',  girl:'רוקדת',  anim:'run',   sound:'jump',    sentence: (g)=> g==='j' ? 'הילד רוקד' : 'הילדה רוקדת'   },
];

/* ============================================================
   AUDIO — HTML Audio (Web Audio API unavailable on this device)
   ============================================================ */
let _sounds = null;

function _makeWav(fn, dur) {
  const SR = 22050, n = Math.floor(SR * dur);
  const ab = new ArrayBuffer(44 + n * 2), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); dv.setUint32(4,36+n*2,true); ws(8,'WAVE'); ws(12,'fmt ');
  dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,1,true);
  dv.setUint32(24,SR,true); dv.setUint32(28,SR*2,true);
  dv.setUint16(32,2,true); dv.setUint16(34,16,true);
  ws(36,'data'); dv.setUint32(40,n*2,true);
  for (let i = 0; i < n; i++) {
    dv.setInt16(44 + i*2, Math.round(Math.max(-1, Math.min(1, fn(i/SR))) * 32767), true);
  }
  const bytes = new Uint8Array(ab);
  let b = '';
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(b);
}

function _initSounds() {
  const SR = 22050;
  const sounds = {};

  // Click: short 600 Hz square wave
  sounds.click = new Audio(_makeWav(t => {
    if (t > 0.05) return 0;
    return (Math.sin(2*Math.PI*600*t) > 0 ? 1 : -1) * 0.15 * (1 - t/0.05);
  }, 0.1));

  // Jump: ascending frequency sweep 200→700 Hz (sawtooth)
  let ph = 0;
  sounds.jump = new Audio(_makeWav(t => {
    const freq = 200 + 500 * Math.min(1, t/0.4);
    ph += freq / SR;
    return t > 0.45 ? 0 : (2*(ph%1)-1) * 0.2 * Math.max(0, 1 - t/0.4);
  }, 0.5));

  // Throw: descending frequency sweep 600→100 Hz (sawtooth)
  ph = 0;
  sounds.throw = new Audio(_makeWav(t => {
    const freq = 600 - 500 * Math.min(1, t/0.6);
    ph += freq / SR;
    return t > 0.65 ? 0 : (2*(ph%1)-1) * 0.25 * Math.max(0, 1 - t/0.6);
  }, 0.7));

  // Think: 4 ascending triangle-wave notes with delays
  sounds.think = new Audio(_makeWav(t => {
    const notes = [[261,0],[329,0.2],[392,0.4],[523,0.7]];
    let sum = 0;
    for (const [freq, start] of notes) {
      const nt = t - start;
      if (nt >= 0 && nt < 0.5) {
        const env = Math.min(1, (0.5 - nt) / 0.08);
        sum += (1 - 4*Math.abs((freq*nt)%1 - 0.5)) * 0.18 * env;
      }
    }
    return Math.max(-1, Math.min(1, sum));
  }, 1.25));

  // Success: 4 ascending sine notes + final held note
  sounds.success = new Audio(_makeWav(t => {
    const notes = [[523,0,0.18,0.3],[659,0.12,0.18,0.3],[784,0.24,0.18,0.3],[1047,0.36,0.18,0.3],[1047,0.5,0.35,0.25]];
    let sum = 0;
    for (const [freq, start, dur, vol] of notes) {
      const nt = t - start;
      if (nt >= 0 && nt < dur) {
        sum += Math.sin(2*Math.PI*freq*nt) * vol * Math.min(1, (dur-nt)/0.05);
      }
    }
    return Math.max(-1, Math.min(1, sum));
  }, 0.9));

  return sounds;
}

function _play(name) {
  if (!_sounds) { try { _sounds = _initSounds(); } catch(e) { _sounds = {}; } }
  const a = _sounds[name];
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(() => {});
}

function activateAudio() { /* no-op: HTML Audio requires no AudioContext unlock */ }
const audioReady = true;

function playSuccess() { _play('success'); }
function playClick()   { _play('click'); }
function playJump()    { _play('jump'); }
function playThrow()   { _play('throw'); }
function playThink()   { _play('think'); }

function playSoundForVerb(anim) {
  if (anim === 'jump') playJump();
  else if (anim === 'throw') playThrow();
  else if (anim === 'think') playThink();
  else playSuccess();
}

/* ============================================================
   SPEECH SYNTHESIS
   ============================================================ */
let heVoice = null;

function initVoice() {
  const tryLoad = () => {
    const voices = speechSynthesis.getVoices();
    heVoice = voices.find(v => v.lang === 'he-IL' || v.lang === 'he')
      || voices.find(v => v.lang.startsWith('he'))
      || voices[0] || null;
  };
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = tryLoad;
  }
  tryLoad();
}

function speak(text, rate=0.8) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (heVoice) u.voice = heVoice;
  u.lang = 'he-IL';
  u.rate = rate;
  u.pitch = 1.1;
  u.volume = 1;
  speechSynthesis.speak(u);
}

function speakWord(char, evt) {
  if (evt) { evt.stopPropagation(); }
  const v = VERBS[currentVerbIndex];
  speak(char === 'j' ? v.boy : v.girl);
}

/* ============================================================
   ANIMATIONS
   ============================================================ */
let animTimers = [];

function clearTimers() {
  animTimers.forEach(clearTimeout);
  animTimers = [];
}

function triggerAnimation(char, verbAnim) {
  const svgWrap = document.getElementById(char + '-svg-wrap');
  if (!svgWrap) return;
  const svg = svgWrap.querySelector('svg');

  svg.classList.remove('anim-jump','anim-laugh','anim-sit','anim-learn','anim-cut','anim-throw','anim-think','anim-run');
  void svg.offsetWidth;
  svg.classList.add('anim-' + verbAnim);

  const dur = verbAnim === 'cut' ? 2600 : verbAnim === 'sit' ? 2600 : 2000;
  const t = setTimeout(() => {
    svg.classList.remove('anim-' + verbAnim);
  }, dur);
  animTimers.push(t);
}

/* ============================================================
   SUCCESS TRIGGER
   ============================================================ */
function triggerSuccess(char) {
  const v = VERBS[currentVerbIndex];
  speak(v.sentence(char), 0.8);

  clearTimers();
  activateAudio();

  const card = document.getElementById(char === 'j' ? 'jonathan-card' : 'noa-card');
  card.classList.remove('success-flash');
  void card.offsetWidth;
  card.classList.add('success-flash');
  card.classList.remove('highlighted');

  triggerAnimation(char, v.anim);
  spawnParticles(card);

  streakCount++;
  document.getElementById('streak-num').textContent = streakCount;

  pendingChar = null;
}

/* ============================================================
   GAME MODES
   ============================================================ */
function handleCardClick(char, evt) {
  if (evt) evt.stopPropagation();
  activateAudio();

  if (currentMode === 'click') {
    triggerSuccess(char);
  } else if (currentMode === 'voice') {
    openVoiceOverlay(char);
  }
}

/* ============================================================
   VERB SELECTION
   ============================================================ */
function selectVerb(index, evt) {
  if (evt) evt.stopPropagation();
  activateAudio();
  currentVerbIndex = index;

  document.querySelectorAll('.verb-tab').forEach((t,i) => {
    t.classList.toggle('active', i === index);
  });

  const v = VERBS[index];
  document.getElementById('j-word').textContent = v.boy;
  document.getElementById('n-word').textContent = v.girl;

  resetAnimState();
}

function resetAnimState() {
  ['j','n'].forEach(c => {
    const svgWrap = document.getElementById(c + '-svg-wrap');
    if (!svgWrap) return;
    const svg = svgWrap.querySelector('svg');
    svg.classList.remove('anim-jump','anim-laugh','anim-sit','anim-learn','anim-cut','anim-throw','anim-think','anim-run');
  });
  document.getElementById('jonathan-card').classList.remove('highlighted','success-flash');
  document.getElementById('noa-card').classList.remove('highlighted','success-flash');
  pendingChar = null;
}

function resetAll(evt) {
  if (evt) evt.stopPropagation();
  activateAudio();
  resetAnimState();
  clearTimers();
}

/* ============================================================
   MODE SELECTION
   ============================================================ */
const MODE_HINTS = {
  click: 'לחצ/י על הדמות להפעלת האנימציה',
  voice: 'לחצ/י על הדמות ואמר/י את המילה בקול',
};

function selectMode(mode, evt) {
  if (evt) evt.stopPropagation();
  activateAudio();
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');
  document.getElementById('mode-hint').textContent = MODE_HINTS[mode];
  resetAnimState();
}

/* ============================================================
   VOICE OVERLAY
   ============================================================ */
let voiceChar = null;

function openVoiceOverlay(char) {
  voiceChar = char;
  const v = VERBS[currentVerbIndex];
  const word = char === 'j' ? v.boy : v.girl;
  document.getElementById('voice-target-word').textContent = word;
  document.getElementById('voice-overlay').classList.add('visible');
  document.getElementById('voice-status').textContent = 'לחץ/י על המיקרופון לדיבור';
  document.getElementById('mic-ring').classList.remove('listening');
  document.getElementById('mic-ring').textContent = '🎤';
  if (isListening) stopListening();
}

function closeVoiceOverlay() {
  document.getElementById('voice-overlay').classList.remove('visible');
  if (isListening) stopListening();
  voiceChar = null;
}

function toggleListening() {
  activateAudio();
  if (isListening) { stopListening(); return; }
  startListening();
}

function startListening() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    document.getElementById('voice-status').textContent = 'הדפדפן לא תומך בזיהוי קולי - השתמש/י בסימולציה';
    return;
  }

  recognition = new SpeechRec();
  recognition.lang = 'he-IL';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById('mic-ring').classList.add('listening');
    document.getElementById('mic-ring').textContent = '🔴';
    document.getElementById('voice-status').textContent = '...מאזין';
  };

  recognition.onresult = (e) => {
    const results = Array.from(e.results[0]).map(r => r.transcript.trim());
    checkVoiceResult(results);
  };

  recognition.onerror = (e) => {
    console.warn('Speech error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      document.getElementById('voice-status').textContent = 'גישה למיקרופון נחסמה - השתמש/י בסימולציה';
    } else if (e.error === 'network') {
      document.getElementById('voice-status').textContent = 'שגיאת רשת - השתמש/י בסימולציה';
    } else {
      document.getElementById('voice-status').textContent = 'לא הצלחנו לשמוע - נסה/י שוב';
    }
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };

  try {
    recognition.start();
  } catch(e) {
    document.getElementById('voice-status').textContent = 'לא ניתן להפעיל - השתמש/י בסימולציה';
    stopListening();
  }
}

function stopListening() {
  isListening = false;
  if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
  document.getElementById('mic-ring').classList.remove('listening');
  document.getElementById('mic-ring').textContent = '🎤';
}

function checkVoiceResult(alternatives) {
  const v = VERBS[currentVerbIndex];
  const target = voiceChar === 'j' ? v.boy : v.girl;

  const matched = alternatives.some(alt => {
    const a = alt.replace(/[\s​]/g,'');
    return a === target || phoneticallyClose(a, target);
  });

  if (matched) {
    document.getElementById('voice-status').textContent = '✓ מצוין!';
    setTimeout(() => {
      closeVoiceOverlay();
      triggerSuccess(voiceChar);
    }, 400);
  } else {
    document.getElementById('voice-status').textContent = `שמענו: "${alternatives[0]}" - נסה/י שוב`;
    playTone(300, 'square', 0.1, 0.1);
  }
}

function phoneticallyClose(a, b) {
  const strip = s => s.replace(/[ְ-ׇ]/g,'').replace(/[\s'"]/g,'');
  const sa = strip(a), sb = strip(b);
  if (sa === sb) return true;
  if (sa.includes(sb) || sb.includes(sa)) return true;
  return levenshtein(sa, sb) <= 2;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1},(_,j)=>i||j?i?j?0:j:i:0));
  for (let i=1;i<=m;i++) {
    for (let j=1;j<=n;j++) {
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function simulateMicro() {
  document.getElementById('voice-status').textContent = '✓ מצוין! (סימולציה)';
  stopListening();
  setTimeout(() => {
    closeVoiceOverlay();
    if (voiceChar) triggerSuccess(voiceChar);
  }, 400);
}

/* ============================================================
   PARTICLES
   ============================================================ */
const PARTICLE_EMOJIS = ['⭐','🌟','✨','💫','🎉','🎊','💥','🌈','🦋','🌸'];
const PARTICLE_COLORS = ['#fbbf24','#34d399','#60a5fa','#f87171','#a78bfa','#fb923c','#4ade80'];

function spawnParticles(container) {
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 24;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 90 + Math.random() * 120;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;
    const dr = (Math.random() - 0.5) * 720;
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    p.style.setProperty('--dr', dr + 'deg');
    p.style.left = (cx - 12) + 'px';
    p.style.top = (cy - 12) + 'px';
    p.style.animationDelay = (Math.random() * 0.2) + 's';
    p.style.animationDuration = (0.8 + Math.random() * 0.5) + 's';
    if (Math.random() > 0.5) {
      p.textContent = PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)];
    } else {
      const size = 10 + Math.random() * 10;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      p.style.borderRadius = '50%';
      p.style.fontSize = '0';
    }
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  initVoice();
  try { _sounds = _initSounds(); } catch(e) { _sounds = {}; }
  const v = VERBS[0];
  document.getElementById('j-word').textContent = v.boy;
  document.getElementById('n-word').textContent = v.girl;

  document.getElementById('voice-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeVoiceOverlay();
  });
});
