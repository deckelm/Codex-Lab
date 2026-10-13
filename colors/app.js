'use strict';

const palette = document.getElementById('palette');
const toast = document.getElementById('toast');
const generateButton = document.getElementById('generate');
let toastTimeout;

function hexToRgb(hex) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

// WCAG relative luminance in linear sRGB; contrast is (L1 + .05) / (L2 + .05).
function contrastRatios(hex) {
  const linear = hexToRgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return { black: (luminance + 0.05) / 0.05, white: 1.05 / (luminance + 0.05) };
}

function grade(ratio) {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'לא עובר AA';
}

function randomColor() {
  const channels = crypto.getRandomValues(new Uint8Array(3));
  return '#' + Array.from(channels, value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function notify(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 1800);
}

async function copyCode(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      const focused = document.activeElement;
      document.body.append(field);
      let copied;
      try {
        field.select();
        copied = document.execCommand('copy');
      } finally {
        field.remove();
        if (focused) focused.focus();
      }
      if (!copied) throw new Error('Copy failed');
    }
    notify(`Copied! ${value}`);
  } catch {
    notify('ההעתקה לא הצליחה. אפשר לנסות שוב או להעתיק ידנית.');
  }
}

function makeButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

const swatches = Array.from({ length: 5 }, (_, index) => {
  const section = document.createElement('section');
  section.className = 'swatch';
  section.setAttribute('aria-label', `צבע ${index + 1}`);
  const number = document.createElement('span');
  number.className = 'swatch-number';
  number.textContent = String(index + 1).padStart(2, '0');
  const codes = document.createElement('div');
  codes.className = 'codes';
  const hex = makeButton('copy hex', '');
  const rgb = makeButton('copy rgb', '');
  codes.append(hex, rgb);
  const lock = makeButton('lock', 'פתוח ◇');
  lock.setAttribute('aria-pressed', 'false');
  const contrast = document.createElement('div');
  contrast.className = 'contrast';
  const title = document.createElement('span');
  title.className = 'contrast-title';
  title.textContent = 'ניגודיות WCAG';
  const black = document.createElement('span');
  const white = document.createElement('span');
  black.className = white.className = 'contrast-badge';
  const note = document.createElement('span');
  note.className = 'contrast-note';
  note.textContent = 'טקסט רגיל: AA ≥ 4.5 · AAA ≥ 7';
  contrast.append(title, black, white, note);
  section.append(number, codes, lock, contrast);
  palette.append(section);
  const swatch = { section, hex, rgb, lock, black, white, color: '', locked: false };
  hex.addEventListener('click', () => copyCode(swatch.color));
  rgb.addEventListener('click', () => copyCode(rgb.textContent));
  lock.addEventListener('click', () => {
    swatch.locked = !swatch.locked;
    lock.setAttribute('aria-pressed', String(swatch.locked));
    lock.textContent = swatch.locked ? 'נעול ◆' : 'פתוח ◇';
    lock.setAttribute('aria-label', `${swatch.locked ? 'שחרור' : 'נעילת'} צבע ${index + 1}`);
  });
  lock.setAttribute('aria-label', `נעילת צבע ${index + 1}`);
  return swatch;
});

function paint(swatch, color) {
  swatch.color = color;
  const ratios = contrastRatios(color);
  const darkInk = ratios.black >= ratios.white;
  swatch.section.style.setProperty('--swatch', color);
  swatch.section.style.setProperty('--ink', darkInk ? '#000000' : '#FFFFFF');
  swatch.section.style.setProperty('--tint', darkInk ? '#00000012' : '#ffffff20');
  swatch.hex.textContent = color;
  swatch.rgb.textContent = `rgb(${hexToRgb(color).join(', ')})`;
  swatch.hex.setAttribute('aria-label', `העתקת HEX ${color}`);
  swatch.rgb.setAttribute('aria-label', `העתקת ${swatch.rgb.textContent}`);
  swatch.black.textContent = `מול שחור: ${ratios.black.toFixed(2)}:1 · ${grade(ratios.black)}`;
  swatch.white.textContent = `מול לבן: ${ratios.white.toFixed(2)}:1 · ${grade(ratios.white)}`;
}

function generatePalette(announce = true) {
  let changed = 0;
  swatches.forEach(swatch => {
    if (swatch.locked) return;
    let color;
    do { color = randomColor(); } while (color === swatch.color);
    paint(swatch, color);
    changed++;
  });
  if (announce) notify(changed ? 'הפלטה עודכנה · הצבעים הנעולים נשמרו' : 'כל הצבעים נעולים · שחררו צבע כדי לחדש');
}

generateButton.addEventListener('click', () => generatePalette());
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  // Keep native Space activation for buttons, links, and editable fields.
  if (event.target.closest('button, a, input, textarea, select, [contenteditable], [role="button"]')) return;
  event.preventDefault();
  generatePalette();
});

generatePalette(false);
