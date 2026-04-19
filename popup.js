// ══════════════════════════════════════════
//  COLOUR ENGINE
// ══════════════════════════════════════════

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255;
  let g = parseInt(hex.slice(3,5),16)/255;
  let b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1-l);
  const f = n => {
    const k = (n + h/30) % 12;
    const col = l - a * Math.max(Math.min(k-3, 9-k, 1), -1);
    return Math.round(255*col).toString(16).padStart(2,'0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Perceived luminance — decides if button text should be black or white
function luminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
}

function buildTheme(hex) {
  const [h, s, l] = hexToHsl(hex);

  // Clamp saturation so washed-out colours still look good
  const sat = Math.max(s, 45);

  const accent      = hslToHex(h, sat, Math.min(Math.max(l, 45), 65));
  const accentHover = hslToHex(h, sat, Math.min(l + 12, 78));
  const accentDark  = hslToHex(h, sat, Math.max(l - 22, 14));
  const accentSoft  = hslToHex(h, Math.max(sat - 15, 30), Math.min(l + 22, 85));
  const accentDim   = hex + '20'; // 12% alpha — works as rgba approx

  // Dark surfaces, hue-tinted slightly
  const bg       = hslToHex(h, Math.min(sat*0.15, 12), 9);
  const surface  = hslToHex(h, Math.min(sat*0.12, 10), 13);
  const surface2 = hslToHex(h, Math.min(sat*0.10, 8),  17);
  const border   = hslToHex(h, Math.min(sat*0.10, 8),  22);

  // Button text: white on dark accents, near-black on bright ones
  const btnText = luminance(accent) > 0.35 ? '#111111' : '#ffffff';

  return { accent, accentHover, accentDark, accentSoft, accentDim, bg, surface, surface2, border, btnText };
}

function applyTheme(hex) {
  const t = buildTheme(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent',       t.accent);
  root.style.setProperty('--accent-hover', t.accentHover);
  root.style.setProperty('--accent-dark',  t.accentDark);
  root.style.setProperty('--accent-soft',  t.accentSoft);
  root.style.setProperty('--accent-dim',   t.accentDim);
  root.style.setProperty('--bg',           t.bg);
  root.style.setProperty('--surface',      t.surface);
  root.style.setProperty('--surface2',     t.surface2);
  root.style.setProperty('--border',       t.border);
  root.style.setProperty('--btn-text',     t.btnText);

  // Update swatch row
  const swatchRow = document.getElementById('swatchRow');
  const swatches = [t.accentDark, t.accent, t.accentHover, t.accentSoft];
  swatchRow.innerHTML = swatches.map(c =>
    `<div class="swatch" style="background:${c}" title="${c}"></div>`
  ).join('');

  // Sync colour picker
  document.getElementById('colourPicker').value = hex;

  // Mark active preset
  document.querySelectorAll('.preset').forEach(p => {
    p.classList.toggle('active', p.dataset.colour.toLowerCase() === hex.toLowerCase());
  });

  // Persist
  chrome.storage.local.set({ themeColour: hex });
}

// ══════════════════════════════════════════
//  TRACKER STATE
// ══════════════════════════════════════════
let chats = 0;
let sales = 0;

const chatCountEl    = document.getElementById('chatCount');
const saleCountEl    = document.getElementById('saleCount');
const conversionFill = document.getElementById('conversionFill');
const conversionPct  = document.getElementById('conversionPct');
const previewTime    = document.getElementById('previewTime');
const previewChats   = document.getElementById('previewChats');
const previewSales   = document.getElementById('previewSales');
const previewPct     = document.getElementById('previewPct');
const copyBtn        = document.getElementById('copyBtn');
const copyFeedback   = document.getElementById('copyFeedback');
const resetBtn       = document.getElementById('resetBtn');

function getConversionPct() {
  return chats === 0 ? 0 : Math.round((sales / chats) * 100);
}

function getBiHourlyTime() {
  const h = new Date().getHours();
  let hammend;
  if (h >= 14) {
    hammend = (h - 12)
  } else {
    hammend = (h)
  }
  return `@${Math.floor(hammend / 2) * 2}`;
}

function formatUpdate() {
  return `${getBiHourlyTime()}\n${chats} chats\n${sales} sales\n${getConversionPct()}%`;
}

function updateUI() {
  const pct = getConversionPct();
  chatCountEl.textContent = chats;
  saleCountEl.textContent = sales;
  conversionFill.style.width = Math.min(pct, 100) + '%';
  conversionPct.textContent  = pct + '%';
  previewTime.textContent    = getBiHourlyTime();
  previewChats.textContent   = `${chats} chats`;
  previewSales.textContent   = `${sales} sales`;
  previewPct.textContent     = `${pct}%`;
  chrome.storage.local.set({ chats, sales });
}

function bumpAnimation(el) {
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 150);
}

// ── Load saved state ──
chrome.storage.local.get(['chats', 'sales', 'themeColour'], (result) => {
  chats = result.chats ?? 0;
  sales = result.sales ?? 0;
  applyTheme(result.themeColour ?? '#e60000');
  updateUI();
});

// ── +/- buttons ──
document.querySelectorAll('.btn-plus').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type === 'chat') { chats++; bumpAnimation(chatCountEl); }
    if (type === 'sale') { sales++; bumpAnimation(saleCountEl); }
    updateUI();
  });
});

document.querySelectorAll('.btn-minus').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type === 'chat' && chats > 0) { chats--; bumpAnimation(chatCountEl); }
    if (type === 'sale' && sales > 0) { sales--; bumpAnimation(saleCountEl); }
    updateUI();
  });
});

// ── Copy ──
copyBtn.addEventListener('click', () => {
  const text = formatUpdate();
  navigator.clipboard.writeText(text).then(() => {
    copyFeedback.classList.add('show');
    setTimeout(() => copyFeedback.classList.remove('show'), 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyFeedback.classList.add('show');
    setTimeout(() => copyFeedback.classList.remove('show'), 2000);
  });
});

// ── Reset ──
resetBtn.addEventListener('click', () => {
  if (confirm('Reset all counts to zero?')) {
    chats = 0; sales = 0; updateUI();
  }
});

// ── Theme panel toggle ──
const themeToggle = document.getElementById('themeToggle');
const themePanel  = document.getElementById('themePanel');

themeToggle.addEventListener('click', () => {
  const open = themePanel.classList.toggle('open');
  themeToggle.classList.toggle('open', open);
});

// ── Colour picker (live) ──
document.getElementById('colourPicker').addEventListener('input', (e) => {
  applyTheme(e.target.value);
});

// ── Preset buttons ──
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.colour));
});
