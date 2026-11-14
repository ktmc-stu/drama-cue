/* Inline SVG icon set — 24px grid, stroke-based, currentColor. No emoji anywhere. */
const S = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor" stroke="none"';

const PATHS = {
  logo:`<path d="M3.5 20V7.6L12 3.6l8.5 4V20"/><path d="M7.5 20v-4.2M10.5 20v-7.4M13.5 20v-5.4M16.5 20v-3"/>`,
  play:`<path ${F} d="M8 5.2 19 12 8 18.8z"/>`,
  pause:`<path ${F} d="M8.4 5h2.6v14H8.4zM13 5h2.6v14H13z"/>`,
  stop:`<rect ${F} x="6.5" y="6.5" width="11" height="11" rx="2"/>`,
  panic:`<path d="M8.3 3.2h7.4L21 8.5v7L15.7 20.8H8.3L3 15.5v-7z"/><path d="M12 8v4.6M12 15.9v.1"/>`,
  volume:`<path d="M4 9.4h3.6L12 5.4v13.2L7.6 14.6H4z"/><path d="M15.6 9.2a4.2 4.2 0 0 1 0 5.6M18.4 6.6a8 8 0 0 1 0 10.8"/>`,
  mute:`<path d="M4 9.4h3.6L12 5.4v13.2L7.6 14.6H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>`,
  sliders:`<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.1"/><circle cx="15.5" cy="12" r="2.1"/><circle cx="7.5" cy="17" r="2.1"/>`,
  lock:`<rect x="4.6" y="10.4" width="14.8" height="10" rx="2.2"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8M12 14.4v2.2"/>`,
  unlock:`<rect x="4.6" y="10.4" width="14.8" height="10" rx="2.2"/><path d="M8 10.4V7.6a4 4 0 0 1 7.6-1.7M12 14.4v2.2"/>`,
  key:`<circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H21M18.2 12v3.1M15.2 12v2.4"/>`,
  plus:`<path d="M12 5.2v13.6M5.2 12h13.6"/>`,
  trash:`<path d="M4.4 6.8h15.2M9.4 6.8V5.3A1.3 1.3 0 0 1 10.7 4h2.6a1.3 1.3 0 0 1 1.3 1.3v1.5"/><path d="M6.6 6.8 7.6 19a1.9 1.9 0 0 0 1.9 1.8h5a1.9 1.9 0 0 0 1.9-1.8l1-12.2M10.2 10.6v6.2M13.8 10.6v6.2"/>`,
  copy:`<rect x="9" y="9" width="11.4" height="11.4" rx="2.2"/><path d="M15 5.6H5.8a2.2 2.2 0 0 0-2.2 2.2V17"/>`,
  arrowUp:`<path d="M12 19.2V5M6.2 10.8 12 5l5.8 5.8"/>`,
  arrowDown:`<path d="M12 4.8V19M6.2 13.2 12 19l5.8-5.8"/>`,
  upload:`<path d="M12 15.6V4.2M7.2 9 12 4.2 16.8 9M4.4 16v3a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-3"/>`,
  download:`<path d="M12 4.2v11.4M7.2 10.8 12 15.6l4.8-4.8M4.4 16v3a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-3"/>`,
  search:`<circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.4 15.4 4.8 4.8"/>`,
  filter:`<path d="M4 5.6h16l-6.3 7.4v6.1l-3.4 1.9V13z"/>`,
  close:`<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>`,
  check:`<path d="m5 12.6 4.6 4.6L19 7.4"/>`,
  grip:`<g ${F}><circle cx="9.2" cy="6.4" r="1.25"/><circle cx="9.2" cy="12" r="1.25"/><circle cx="9.2" cy="17.6" r="1.25"/><circle cx="14.8" cy="6.4" r="1.25"/><circle cx="14.8" cy="12" r="1.25"/><circle cx="14.8" cy="17.6" r="1.25"/></g>`,
  wave:`<path d="M2.6 12h2.2l2-6.4 3 13.2 3-10.2 2.4 6.6 1.8-3.2h4.4"/>`,
  fade:`<path d="M4 19.2h16M4 19.2C10.4 19.2 12.6 5.4 20 5.4"/><path d="M20 5.4v13.8" stroke-dasharray="2 2.4"/>`,
  clock:`<circle cx="12" cy="12" r="8.2"/><path d="M12 7.2V12l3.2 2.1"/>`,
  memo:`<path d="M6 4h8.4L19 8.6V20H6z"/><path d="M14.4 4v4.6H19M9 12.4h7M9 16h4.6"/>`,
  cloud:`<path d="M7.6 18.6A4.6 4.6 0 0 1 7 9.5a5.6 5.6 0 0 1 10.7 1.2 3.95 3.95 0 0 1-.7 7.9z"/>`,
  device:`<rect x="6" y="2.8" width="12" height="18.4" rx="2.4"/><circle cx="12" cy="14.4" r="3.3"/><path d="M12 6.6v.1"/>`,
  undo:`<path d="M8.4 8.2h6.8a5 5 0 0 1 0 10H8"/><path d="m8.4 8.2 3.6-3.6M8.4 8.2l3.6 3.6"/>`,
  refresh:`<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20.2 4v4.4h-4.4"/>`,
  alert:`<path d="M12 4.2 21 20H3z"/><path d="M12 10v4.2M12 17.2v.1"/>`,
  info:`<circle cx="12" cy="12" r="8.2"/><path d="M12 11.2v5M12 8.1v.1"/>`,
  shows:`<rect x="3.4" y="6.6" width="17.2" height="13.4" rx="2.2"/><path d="M7.4 6.6V5.2A1.6 1.6 0 0 1 9 3.6h6a1.6 1.6 0 0 1 1.6 1.6v1.4M3.4 11.4h17.2M10.4 15.4h3.2"/>`,
  edit:`<path d="M4 20h4.2L20.2 8 16 3.8 4 15.8z"/><path d="m14.4 5.6 4.2 4.2"/>`,
  loop:`<path d="M4 10.2a4 4 0 0 1 4-4h9.2"/><path d="m14.6 3 3.2 3.2-3.2 3.2"/><path d="M20 13.8a4 4 0 0 1-4 4H6.8"/><path d="m9.4 21-3.2-3.2 3.2-3.2"/>`,
  skipBack:`<path d="M18.4 5.2v13.6L8.6 12z"/><path d="M5.6 5.2v13.6"/>`,
  meter:`<path stroke-width="2" d="M4.6 19.4v-5.2M9.6 19.4V8.2M14.6 19.4v-7.6M19.4 19.4V4.6"/>`,
  star:`<path d="m12 3.8 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 10l5.9-.8z"/>`,
  globe:`<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.4 2.4 3.4 5.4 3.4 8.2S14.4 17.8 12 20.2c-2.4-2.4-3.4-5.4-3.4-8.2S9.6 6.2 12 3.8z"/>`,
  trim:`<path d="M8.6 3.6v16.8M15.4 3.6v16.8M3.4 12h3.2M17.4 12h3.2"/>`,
  link:`<path d="M10.2 13.8a4 4 0 0 0 5.7 0l2.9-2.9a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-2.9 2.9a4 4 0 0 0 5.7 5.7l1.4-1.4"/>`,
  synth:`<path d="M3 12h2.4l2-5 2.6 10 2.6-13 2.6 16 2-8h3.8"/>`,
  user:`<circle cx="12" cy="8.4" r="3.8"/><path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0"/>`
};

export function icon(name, size = 18){
  const body = PATHS[name] || PATHS.info;
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" ${S} aria-hidden="true" focusable="false">${body}</svg>`;
}
export function hydrate(root = document){
  root.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon, +(el.dataset.size || 18));
  });
}
export function setIcon(el, name, size){
  if(!el) return;
  el.dataset.icon = name;
  if(size) el.dataset.size = size;
  el.innerHTML = icon(name, size || +(el.dataset.size || 18));
}
