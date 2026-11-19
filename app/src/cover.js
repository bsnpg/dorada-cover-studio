/* Dorada Cover Studio — cover renderer.
 *
 * Everything a cover shows is drawn on canvas: photos via drawImage with a
 * per-panel cover-fit crop, pan and zoom; colour grades as a per-pixel pass
 * plus a tint overlay; the Poster Ink halftone as a dot grid sampled from
 * luminance; the title band, skyline, lettering and badges as canvas shapes
 * and fillText. The live preview and the PNG export call the same function
 * (renderCover) at different sizes, so what you see is what you get.
 *
 * No Rockstar logo, artwork or font is used anywhere: the lettering is set
 * in Anton, Oswald and Yellowtail (vendored under fonts/), the art is the
 * user's own photos or the procedurally generated samples in samples/.
 */

/* The ten sample photos, generated procedurally during the build. */
const SAMPLES = [
  { id: 'car-sunset', label: 'Supercar Sunset', file: 'samples/car-sunset.jpg' },
  { id: 'woman-car', label: 'Woman by the Classic', file: 'samples/woman-car.jpg' },
  { id: 'boardwalk', label: 'Neon Boardwalk', file: 'samples/boardwalk.jpg' },
  { id: 'fisherman', label: 'Old Fisherman', file: 'samples/fisherman.jpg' },
  { id: 'classic-street', label: 'Classic on Ocean Drive', file: 'samples/classic-street.jpg' },
  { id: 'palms', label: 'Palms at Sunset', file: 'samples/palms.jpg' },
  { id: 'beach', label: 'Beach Portrait', file: 'samples/beach.jpg' },
  { id: 'skyline', label: 'Skyline at Dusk', file: 'samples/skyline.jpg' },
  { id: 'surfer', label: "Surfer's Dawn", file: 'samples/surfer.jpg' },
  { id: 'market', label: 'Night Market', file: 'samples/market.jpg' },
];

/* The seven colour grades. A grade carries its per-pixel treatment
 * (saturation, contrast, brightness, warm shift, grayscale or posterize),
 * the tint washed over the photo, and the title band's own palette. */
const GRADES = {
  sunset: {
    label: 'Sunset', sat: 1.25, con: 1.12, bri: 6, warmR: 1.06, warmB: 0.92,
    tint: ['rgba(255,120,0,0.20)', 'rgba(255,0,80,0.24)'],
    band: ['#ff7a18', '#ff2e63', '#3d0a45'], accent: '#ffd23f', script: '#ffd9ec', star: '#ffd23f',
  },
  neon: {
    label: 'Neon Night', sat: 1.35, con: 1.18, bri: -4, warmR: 0.96, warmB: 1.1,
    tint: ['rgba(120,0,255,0.26)', 'rgba(255,0,180,0.28)'],
    band: ['#2b1055', '#7b2ff7', '#12041f'], accent: '#00e5ff', script: '#ff9ff3', star: '#00e5ff',
  },
  golden: {
    label: 'Golden Hour', sat: 1.2, con: 1.08, bri: 4, warmR: 1.08, warmB: 0.88,
    tint: ['rgba(255,190,60,0.22)', 'rgba(255,120,0,0.18)'],
    band: ['#ffb347', '#ff7b00', '#5e1f00'], accent: '#fff3b0', script: '#fff3b0', star: '#fff3b0',
  },
  noir: {
    label: 'Noir', gray: true, sat: 1, con: 1.15, bri: 0, warmR: 1, warmB: 1,
    tint: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
    band: ['#4a4a4a', '#1c1c1c', '#000000'], accent: '#e8e8e8', script: '#e8e8e8', star: '#e8e8e8',
  },
  teal: {
    label: 'Teal Heat', sat: 1.25, con: 1.1, bri: 0, warmR: 0.98, warmB: 1.06,
    tint: ['rgba(0,180,160,0.20)', 'rgba(255,110,40,0.16)'],
    band: ['#00b4a2', '#ff6b35', '#101b2d'], accent: '#ffd23f', script: '#b8fff2', star: '#ffd23f',
  },
  bubblegum: {
    label: 'Bubblegum', sat: 1.3, con: 1.05, bri: 8, warmR: 1.05, warmB: 1.02,
    tint: ['rgba(255,120,220,0.20)', 'rgba(255,60,180,0.18)'],
    band: ['#ff9ff3', '#f368e0', '#5b2a86'], accent: '#ffffff', script: '#ffffff', star: '#ffffff',
  },
  poster: {
    label: 'Poster Ink', posterize: true, sat: 1, con: 1, bri: 0, warmR: 1, warmB: 1,
    tint: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
    band: ['#ff6a00', '#e91e63', '#2d0a31'], accent: '#ffd23f', script: '#ffd9a3', star: '#ffd23f',
  },
};

/* Poster Ink's own palette: sunset orange, magenta and deep plum — the
 * print look, not a pink wash. Used for the title band; the photo
 * posterize below keeps each channel's hue and flattens it to four levels. */
const INK_PALETTE = ['#160818', '#4a1440', '#b4236b', '#ff6a2e', '#ffd9a3'];
const INK_DOT = '#241026';

/* The five layouts. Each returns its panels as fractions of the photo area,
 * with a name per panel for the status line and the sidebar. */
const LAYOUTS = {
  'hero-left': {
    label: 'Hero Left · 5 panels',
    panels: [
      { x: 0, y: 0, w: 0.6, h: 1, name: 'Hero' },
      { x: 0.6, y: 0, w: 0.2, h: 0.5, name: 'Right A' },
      { x: 0.8, y: 0, w: 0.2, h: 0.5, name: 'Right B' },
      { x: 0.6, y: 0.5, w: 0.2, h: 0.5, name: 'Right C' },
      { x: 0.8, y: 0.5, w: 0.2, h: 0.5, name: 'Right D' },
    ],
  },
  'hero-top': {
    label: 'Hero Top · 5 panels',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.56, name: 'Hero' },
      { x: 0, y: 0.56, w: 0.25, h: 0.44, name: 'Strip 1' },
      { x: 0.25, y: 0.56, w: 0.25, h: 0.44, name: 'Strip 2' },
      { x: 0.5, y: 0.56, w: 0.25, h: 0.44, name: 'Strip 3' },
      { x: 0.75, y: 0.56, w: 0.25, h: 0.44, name: 'Strip 4' },
    ],
  },
  duo: {
    label: 'Duo Split · 2 panels',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1, name: 'Left' },
      { x: 0.5, y: 0, w: 0.5, h: 1, name: 'Right' },
    ],
  },
  grid: {
    label: 'Grid 3x3 · 9 panels',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 3, name: 'Cell 1' },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3, name: 'Cell 2' },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3, name: 'Cell 3' },
      { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 4' },
      { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 5' },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 6' },
      { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 7' },
      { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 8' },
      { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3, name: 'Cell 9' },
    ],
  },
  single: {
    label: 'Full-Bleed Single · 1 panel',
    panels: [{ x: 0, y: 0, w: 1, h: 1, name: 'Full' }],
  },
};

/* Caption presets for the Randomize button — all original to Isla Dorada. */
const RANDOM_TITLES = [
  'DORADA HEAT', 'NEON TIDES', 'GOLDEN HOUR RUN', 'PALM COURT', 'MIDNIGHT HARBOR',
  'VICE SUNSET', 'HOT PURSUIT', 'CORAL DISTRICT', 'TURBO PALMS', 'LAST LIGHT',
];
const RANDOM_SCRIPTS = [
  'isla dorada nights', 'neon harbor nights', 'golden hour run', 'every street is a stage',
  'chase the last light', 'palms and gasoline', 'the boardwalk never sleeps', 'salt air, fast cars',
];
const RANDOM_TAGLINES = [
  'EVERY STREET IS A STAGE', 'THE BOARDWALK NEVER SLEEPS', 'CHASE THE LAST LIGHT',
  'ONE CITY. EVERY SECRET HAS A VIEW.', 'SALT AIR, FAST CARS', 'OWN THE NIGHT',
  'NO BRAKES. NO CURFEW.', 'WHERE THE PALMS MEET THE PAVEMENT',
];

/* Small helpers. */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  }
  return copy;
}

/* A deterministic pseudo-random stream, so the skyline is the same every render. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh editor state: the default cover the app opens with. */
function defaultState() {
  return {
    layout: 'hero-left',
    grade: 'poster',
    inkOverlay: true,
    inkIntensity: 85,
    title: 'DORADA HEAT',
    script: 'isla dorada nights',
    tagline: 'EVERY STREET IS A STAGE',
    kicker: 'ISLA DORADA',
    showNew: true,
    showEst: true,
    heat: 4,
    activePanel: 0,
    panels: [
      { photo: 'car-sunset', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'woman-car', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'boardwalk', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'fisherman', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'classic-street', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'palms', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'beach', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'skyline', grade: 'global', zoom: 1, panX: 0, panY: 0 },
      { photo: 'surfer', grade: 'global', zoom: 1, panX: 0, panY: 0 },
    ],
    /* Uploaded photos, kept in memory only: panel index -> image element. */
    customImages: {},
  };
}

/** The panels of the state's layout, in order. */
function layoutPanels(state) {
  return LAYOUTS[state.layout].panels;
}

/** How much halftone a panel gets: the Poster Ink grade inks fully; any
 * other grade inks only while the overlay checkbox is on, at its intensity. */
function inkAmountFor(state, panelGrade) {
  const grade = panelGrade === 'global' ? state.grade : panelGrade;
  if (grade === 'poster') return 1;
  return state.inkOverlay ? state.inkIntensity / 100 : 0;
}

/** The grade a panel really renders with (its override, or the global one). */
function gradeFor(state, panel) {
  return panel.grade === 'global' ? state.grade : panel.grade;
}

/** Resolve a panel's photo to an image element: an upload wins, then the
 * sample, then the first sample as a never-blank fallback. */
function panelImage(state, panelIndex, images) {
  const custom = state.customImages[panelIndex];
  if (custom) return custom;
  const panel = state.panels[panelIndex];
  if (panel && images[panel.photo]) return images[panel.photo];
  return images[SAMPLES[0].id];
}

/* One scratch canvas, reused for every panel's grade pass. */
let scratchCanvas = null;
function scratch(w, h) {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
  if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
    scratchCanvas.width = w;
    scratchCanvas.height = h;
  }
  return scratchCanvas;
}

/**
 * Draw one photo into one panel, graded. The photo is cover-fit into the
 * panel with the panel's pan and zoom, graded per-pixel on the scratch
 * canvas, tinted, halftoned when the ink calls for it, then placed.
 */
function drawGradedPanel(ctx, rect, img, gradeId, inkAmount, panel) {
  const w = Math.max(2, Math.round(rect.w));
  const h = Math.max(2, Math.round(rect.h));
  const off = scratch(w, h);
  const octx = off.getContext('2d');
  octx.clearRect(0, 0, w, h);

  /* Cover-fit with pan and zoom: scale so the photo covers the panel, then
   * shift it inside, clamped so no edge ever shows. */
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * base * panel.zoom;
  const dh = img.naturalHeight * base * panel.zoom;
  let dx = (w - dw) / 2 + panel.panX * w * 0.25;
  let dy = (h - dh) / 2 + panel.panY * h * 0.25;
  dx = clamp(dx, w - dw, 0);
  dy = clamp(dy, h - dh, 0);
  octx.drawImage(img, dx, dy, dw, dh);

  const grade = GRADES[gradeId];
  const imgData = octx.getImageData(0, 0, w, h);
  gradePixels(imgData.data, grade);
  octx.putImageData(imgData, 0, 0);

  /* The tint wash, laid over the graded photo. */
  if (grade.tint[0] !== 'rgba(0,0,0,0)') {
    const tint = octx.createLinearGradient(0, 0, 0, h);
    tint.addColorStop(0, grade.tint[0]);
    tint.addColorStop(1, grade.tint[1]);
    octx.globalCompositeOperation = 'soft-light';
    octx.fillStyle = tint;
    octx.fillRect(0, 0, w, h);
    octx.globalCompositeOperation = 'source-over';
  }

  if (inkAmount > 0) drawHalftone(octx, imgData, w, h, inkAmount);

  ctx.drawImage(off, rect.x, rect.y, rect.w, rect.h);
}

/**
 * The per-pixel grade: contrast, brightness, saturation and a warm shift;
 * Noir goes grayscale; Poster Ink posterizes each channel to four flat
 * levels, so an orange car stays orange and a teal sea stays teal — the
 * print look without crushing the photo into silhouettes.
 */
function gradePixels(data, grade) {
  const con = grade.con;
  const bri = grade.bri;
  const sat = grade.sat;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (grade.posterize) {
      /* Four levels a channel (0, 85, 170, 255): flat print blocks, hue kept. */
      r = Math.round(r / 85) * 85;
      g = Math.round(g / 85) * 85;
      b = Math.round(b / 85) * 85;
      r *= 1.04;
      b *= 0.96;
    } else {
      if (grade.gray) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = lum; g = lum; b = lum;
      }
      r = (r - 128) * con + 128 + bri;
      g = (g - 128) * con + 128 + bri;
      b = (b - 128) * con + 128 + bri;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * sat;
      g = lum + (g - lum) * sat;
      b = lum + (b - lum) * sat;
      r *= grade.warmR;
      b *= grade.warmB;
    }
    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }
}

/**
 * The halftone: a grid of ink dots over the photo, each dot's radius set by
 * the luminance under it — big in the shadows, tiny in the highlights.
 * Kept light on purpose: the dots texture the photo, they never bury it.
 */
function drawHalftone(ctx, imgData, w, h, amount) {
  const data = imgData.data;
  const cell = Math.max(7, Math.round(w / 110));
  ctx.fillStyle = INK_DOT;
  ctx.globalAlpha = 0.42 + 0.33 * amount;
  for (let y = Math.floor(cell / 2); y < h; y += cell) {
    for (let x = Math.floor(cell / 2); x < w; x += cell) {
      const px = Math.min(w - 1, x);
      const py = Math.min(h - 1, y);
      const at = (py * w + px) * 4;
      const lum = (0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2]) / 255;
      const radius = (1 - lum) * cell * 0.48 * amount;
      if (radius < 0.7) continue;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** A rounded-rectangle path, for pills and badges. */
function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** The skyline silhouette that runs along the top of the title band. */
function drawSkyline(ctx, x, y, w, h) {
  const rnd = seededRandom(20261119);
  ctx.fillStyle = 'rgba(16,6,26,0.92)';
  let cx = x;
  while (cx < x + w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.25 + rnd() * 0.75);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    /* A rooftop antenna on some towers. */
    if (rnd() > 0.6) ctx.fillRect(cx + bw / 2 - 1, y + h - bh - h * 0.18, 2, h * 0.18);
    cx += bw + w * 0.008;
  }
}

/** A starburst sticker (the EST. 2026 badge), drawn as a spiked disc. */
function drawStarburst(ctx, cx, cy, r, points, fill, lines, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,8,20,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();
  ctx.fillStyle = '#1d0b26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, sans-serif`;
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * size * 1.05);
  });
  ctx.restore();
}

/** Shrink a title until it fits the width, then draw it stroked and filled. */
function drawTitle(ctx, text, cx, baselineY, maxWidth, maxSize) {
  let size = maxSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  while (size > maxSize * 0.35) {
    ctx.font = `${size}px Anton, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.strokeStyle = '#160818';
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, baselineY);
  return size;
}

/** The HEAT label and its stars, right-aligned at the band's bottom. */
function drawHeatStars(ctx, xRight, baselineY, size, heat, color) {
  const star = '★';
  const empty = '☆';
  ctx.font = `600 ${size}px Oswald, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  /* The five stars span [xRight - 5 * step, xRight]; the label ends where they begin. */
  const step = size * 1.05;
  ctx.fillText('HEAT ', xRight - 5 * step, baselineY);
  ctx.font = `${size * 1.15}px Oswald, sans-serif`;
  for (let i = 0; i < 5; i++) {
    const cx = xRight - (5 - 1 - i) * step;
    ctx.fillText(i < heat ? star : empty, cx, baselineY);
  }
}

/**
 * Render a whole cover. ctx is the target context, width/height its size in
 * pixels, state the editor state, images the loaded sample images by id.
 * Photo panels first (graded, halftoned), then the band, skyline, script,
 * title, tagline, stars and badges — the lettering always lands crisp on top.
 */
function renderCover(ctx, width, height, state, images) {
  const grade = GRADES[state.grade];
  const gap = Math.max(4, Math.round(width * 0.005));
  const bandH = Math.round(height * 0.28);
  const photoH = height - bandH;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  /* Photo panels, inset by the gutter so white gutters frame them. */
  const area = { x: gap, y: gap, w: width - gap * 2, h: photoH - gap * 2 };
  const panels = layoutPanels(state);
  panels.forEach((panel, i) => {
    const rect = {
      x: area.x + panel.x * area.w + gap / 2,
      y: area.y + panel.y * area.h + gap / 2,
      w: panel.w * area.w - gap,
      h: panel.h * area.h - gap,
    };
    const img = panelImage(state, i, images);
    if (!img) return;
    const panelState = state.panels[i] || { photo: SAMPLES[0].id, grade: 'global', zoom: 1, panX: 0, panY: 0 };
    drawGradedPanel(ctx, rect, img, gradeFor(state, panelState), inkAmountFor(state, panelState.grade), panelState);
  });

  /* Title band: gradient, accent line, skyline. */
  const band = ctx.createLinearGradient(0, photoH, 0, height);
  band.addColorStop(0, grade.band[0]);
  band.addColorStop(0.55, grade.band[1]);
  band.addColorStop(1, grade.band[2]);
  ctx.fillStyle = band;
  ctx.fillRect(0, photoH, width, bandH);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, photoH, width, Math.max(3, Math.round(height * 0.004)));
  drawSkyline(ctx, 0, photoH + bandH * 0.06, width, bandH * 0.44);

  /* Script subhead, title, tagline — stacked with clear gaps, the script
   * well above the title's top and the tagline in the left half so it never
   * runs into the HEAT stars at the right. */
  const cx = width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const scriptSize = Math.round(bandH * 0.26);
  ctx.font = `${scriptSize}px Yellowtail, cursive`;
  ctx.fillStyle = grade.script;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = Math.round(bandH * 0.03);
  ctx.fillText(state.script, cx, photoH + bandH * 0.27);
  ctx.shadowBlur = 0;

  drawTitle(ctx, state.title, cx, photoH + bandH * 0.8, width * 0.94, Math.round(bandH * 0.52));

  /* The tagline auto-fits its size to the left half of the band (the HEAT
   * stars own the right), shrinking before it ever truncates a word. */
  let tagSize = Math.round(bandH * 0.115);
  const tag = state.tagline;
  const tagMax = width * 0.52;
  const tagCx = width * 0.3;
  while (tagSize > Math.round(bandH * 0.06)) {
    ctx.font = `600 ${tagSize}px Oswald, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(1, Math.round(tagSize * 0.18))}px`; } catch (e) { /* letterSpacing is Chrome-only */ }
    if (ctx.measureText(tag).width <= tagMax) break;
    tagSize -= 1;
  }
  ctx.font = `600 ${tagSize}px Oswald, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(1, Math.round(tagSize * 0.18))}px`; } catch (e) { /* letterSpacing is Chrome-only */ }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(tag, tagCx, photoH + bandH * 0.94);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* reset for the stars */ }

  /* HEAT stars, bottom right. */
  drawHeatStars(ctx, width - gap * 3, photoH + bandH * 0.94, tagSize * 1.25, state.heat, grade.star);

  /* Badges over the photo area: kicker pill, NEW, EST. 2026 starburst. */
  const pillH = Math.round(height * 0.042);
  const pillY = gap * 2;
  ctx.font = `600 ${Math.round(pillH * 0.52)}px Oswald, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const kickerW = ctx.measureText(state.kicker).width + pillH * 1.1;
  ctx.fillStyle = grade.accent;
  roundRectPath(ctx, gap * 2, pillY, kickerW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#1d0b26';
  ctx.fillText(state.kicker, gap * 2 + pillH * 0.55, pillY + pillH / 2 + 1);

  if (state.showNew) {
    const newX = gap * 2 + kickerW + gap;
    const newW = ctx.measureText('NEW').width + pillH * 0.9;
    ctx.fillStyle = '#ff2e63';
    roundRectPath(ctx, newX, pillY, newW, pillH, pillH * 0.22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEW', newX + pillH * 0.45, pillY + pillH / 2 + 1);
  }

  if (state.showEst) {
    drawStarburst(
      ctx, width - gap * 2 - pillH * 1.15, pillY + pillH * 1.15, pillH * 1.25, 12,
      '#ffd23f', ['EST.', '2026'], Math.round(pillH * 0.34),
    );
  }
}

/**
 * Render a cover onto a fresh canvas at the exact export size and return it.
 * The editor's export buttons and the screenshot scenes both use this.
 */
function renderExport(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderCover(canvas.getContext('2d'), width, height, state, images);
  return canvas;
}

/* What the editor and the screenshot scenes use. */
window.DoradaCover = {
  SAMPLES,
  GRADES,
  LAYOUTS,
  RANDOM_TITLES,
  RANDOM_SCRIPTS,
  RANDOM_TAGLINES,
  defaultState,
  layoutPanels,
  renderCover,
  renderExport,
  clamp,
  pick,
  shuffle,
};
