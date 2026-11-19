/* Dorada Cover Studio — editor wiring.
 *
 * Builds the sidebar controls (layout and grade pickers, per-panel rows,
 * caption fields), drives the live preview (drag to pan, scroll to zoom,
 * click to pick a panel, drop a photo onto it), and exports the PNGs.
 * All rendering goes through DoradaCover.renderCover / renderExport, so the
 * preview and the export are the same drawing at different sizes.
 */

(function () {
  const C = window.DoradaCover;

  /* The preview canvas is always 16:9; the exports re-render at their own sizes. */
  const PREVIEW_W = 960;
  const PREVIEW_H = 540;

  let state = null;
  let images = null;
  let preview = null;
  let previewCtx = null;
  let statusLine = null;
  let exportStatus = null;
  let renderQueued = false;
  let drag = null;

  /** Queue one preview render on the next animation frame. */
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    if (!previewCtx) return;
    C.renderCover(previewCtx, PREVIEW_W, PREVIEW_H, state, images);
    updateStatus();
  }

  function updateStatus() {
    if (!statusLine) return;
    const panel = C.layoutPanels(state)[state.activePanel];
    const name = panel ? panel.name : '—';
    statusLine.textContent = `Panel: ${name} — drag to pan · scroll to zoom · drop a photo here`;
  }

  /* The panel rectangles on the preview, in preview pixels — the same
   * fractions renderCover uses, so clicks and drops hit the right panel. */
  function previewPanelRects() {
    const gap = Math.max(4, Math.round(PREVIEW_W * 0.005));
    const bandH = Math.round(PREVIEW_H * 0.28);
    const photoH = PREVIEW_H - bandH;
    const area = { x: gap, y: gap, w: PREVIEW_W - gap * 2, h: photoH - gap * 2 };
    return C.layoutPanels(state).map((panel) => ({
      x: area.x + panel.x * area.w + gap / 2,
      y: area.y + panel.y * area.h + gap / 2,
      w: panel.w * area.w - gap,
      h: panel.h * area.h - gap,
    }));
  }

  function panelAt(clientX, clientY) {
    const box = preview.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * PREVIEW_W;
    const y = ((clientY - box.top) / box.height) * PREVIEW_H;
    const rects = previewPanelRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  /* ---- sidebar builders ---- */

  function buildLayoutButtons() {
    const host = document.getElementById('layoutButtons');
    host.innerHTML = '';
    Object.entries(C.LAYOUTS).forEach(([id, layout]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.textContent = layout.label;
      btn.setAttribute('aria-pressed', state.layout === id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state.layout = id;
        state.activePanel = 0;
        buildLayoutButtons();
        buildPanelRows();
        requestRender();
      });
      host.appendChild(btn);
    });
  }

  function buildGradeButtons() {
    const host = document.getElementById('gradeButtons');
    host.innerHTML = '';
    Object.entries(C.GRADES).forEach(([id, grade]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = `linear-gradient(135deg, ${grade.band[0]}, ${grade.band[1]})`;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(grade.label));
      btn.setAttribute('aria-pressed', state.grade === id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state.grade = id;
        buildGradeButtons();
        requestRender();
      });
      host.appendChild(btn);
    });
  }

  function sampleOptions(select, current) {
    select.innerHTML = '';
    C.SAMPLES.forEach((sample) => {
      const opt = document.createElement('option');
      opt.value = sample.id;
      opt.textContent = sample.label;
      select.appendChild(opt);
    });
    select.value = current;
  }

  /* Panel controls: a tab per panel, plus one detail card for the active
   * panel (sample, grade override, zoom, upload). Tabs keep the sidebar
   * short enough that layout, grade and caption stay on screen together. */
  function buildPanelRows() {
    const host = document.getElementById('panelRows');
    host.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'panel-tabs';
    C.layoutPanels(state).forEach((panel, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'panel-tab';
      tab.textContent = `${i + 1} · ${panel.name}`;
      tab.setAttribute('aria-pressed', state.activePanel === i ? 'true' : 'false');
      tab.addEventListener('click', () => {
        state.activePanel = i;
        buildPanelRows();
        requestRender();
      });
      tabs.appendChild(tab);
    });
    host.appendChild(tabs);

    const i = state.activePanel;
    const panel = C.layoutPanels(state)[i];
    const card = document.createElement('div');
    card.className = 'panel-row active';

    const head = document.createElement('div');
    head.className = 'panel-row-head';
    const title = document.createElement('strong');
    title.textContent = `Panel ${i + 1} · ${panel.name}`;
    head.appendChild(title);
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'btn btn-small';
    upload.textContent = 'Upload…';
    upload.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openUpload(i);
    });
    head.appendChild(upload);
    card.appendChild(head);

    const sample = document.createElement('select');
    sample.setAttribute('aria-label', `Sample photo for panel ${panel.name}`);
    if (state.customImages[i]) {
      const uploaded = document.createElement('option');
      uploaded.value = 'custom';
      uploaded.textContent = 'Your uploaded photo';
      sample.appendChild(uploaded);
    }
    sampleOptions(sample, state.panels[i].photo);
    if (state.customImages[i]) sample.value = 'custom';
    sample.addEventListener('change', () => {
      if (sample.value === 'custom') return;
      state.panels[i].photo = sample.value;
      state.panels[i].panX = 0;
      state.panels[i].panY = 0;
      requestRender();
    });
    card.appendChild(sample);

    const grade = document.createElement('select');
    grade.setAttribute('aria-label', `Grade for panel ${panel.name}`);
    const globalOpt = document.createElement('option');
    globalOpt.value = 'global';
    globalOpt.textContent = 'Grade: Global';
    grade.appendChild(globalOpt);
    Object.entries(C.GRADES).forEach(([id, g]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `Grade: ${g.label}`;
      grade.appendChild(opt);
    });
    grade.value = state.panels[i].grade;
    grade.addEventListener('change', () => {
      state.panels[i].grade = grade.value;
      requestRender();
    });
    card.appendChild(grade);

    const zoomLine = document.createElement('div');
    zoomLine.className = 'zoom-line';
    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '4';
    zoom.step = '0.05';
    zoom.value = String(state.panels[i].zoom);
    zoom.setAttribute('aria-label', `Zoom for panel ${panel.name}`);
    zoom.addEventListener('input', () => {
      state.panels[i].zoom = Number(zoom.value);
      requestRender();
    });
    zoomLine.appendChild(zoomLabel);
    zoomLine.appendChild(zoom);
    card.appendChild(zoomLine);

    host.appendChild(card);
  }

  /* ---- uploads ---- */

  let uploadInput = null;
  let uploadTarget = 0;

  function openUpload(panelIndex) {
    uploadTarget = panelIndex;
    if (!uploadInput) {
      uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.addEventListener('change', () => {
        const file = uploadInput.files && uploadInput.files[0];
        if (file) assignUpload(file, uploadTarget);
        uploadInput.value = '';
      });
    }
    uploadInput.click();
  }

  /** Read a user photo file into an image and put it on a panel. The photo
   * stays in memory on this machine; it is never uploaded anywhere. */
  function assignUpload(file, panelIndex) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.customImages[panelIndex] = img;
      state.panels[panelIndex].photo = 'custom';
      state.panels[panelIndex].panX = 0;
      state.panels[panelIndex].panY = 0;
      state.panels[panelIndex].zoom = 1;
      state.activePanel = panelIndex;
      buildPanelRows();
      requestRender();
    };
    img.onerror = () => {
      if (exportStatus) exportStatus.textContent = 'That file could not be read as a photo.';
    };
    img.src = url;
  }

  /* ---- sample set, fill-all, randomize ---- */

  function useSampleSet() {
    const order = C.shuffle(C.SAMPLES);
    C.layoutPanels(state).forEach((panel, i) => {
      state.panels[i].photo = order[i % order.length].id;
      state.panels[i].panX = 0;
      state.panels[i].panY = 0;
      state.panels[i].zoom = 1;
      delete state.customImages[i];
    });
    state.activePanel = 0;
    buildPanelRows();
    requestRender();
  }

  function fillAllPanels() {
    const fill = document.getElementById('selSampleFill');
    if (!fill || !fill.value) return;
    C.layoutPanels(state).forEach((panel, i) => {
      state.panels[i].photo = fill.value;
      state.panels[i].panX = 0;
      state.panels[i].panY = 0;
      delete state.customImages[i];
    });
    buildPanelRows();
    requestRender();
  }

  function randomize() {
    const layouts = Object.keys(C.LAYOUTS);
    const grades = Object.keys(C.GRADES);
    state.layout = C.pick(layouts);
    state.grade = C.pick(grades);
    state.title = C.pick(C.RANDOM_TITLES);
    state.script = C.pick(C.RANDOM_SCRIPTS);
    state.tagline = C.pick(C.RANDOM_TAGLINES);
    state.heat = 3 + Math.floor(Math.random() * 3);
    state.showNew = Math.random() > 0.25;
    state.showEst = Math.random() > 0.25;
    state.inkOverlay = state.grade === 'poster' ? true : Math.random() > 0.3;
    state.inkIntensity = 55 + Math.floor(Math.random() * 45);
    useSampleSet();
    syncCaptionFields();
    syncInkFields();
    buildLayoutButtons();
    buildGradeButtons();
    requestRender();
  }

  /* ---- caption + ink fields ---- */

  function syncCaptionFields() {
    document.getElementById('inpTitle').value = state.title;
    document.getElementById('inpScript').value = state.script;
    document.getElementById('inpTagline').value = state.tagline;
    document.getElementById('inpKicker').value = state.kicker;
    document.getElementById('selHeat').value = String(state.heat);
    document.getElementById('chkNew').checked = state.showNew;
    document.getElementById('chkEst').checked = state.showEst;
  }

  function syncInkFields() {
    document.getElementById('chkInk').checked = state.inkOverlay;
    document.getElementById('rngInk').value = String(state.inkIntensity);
    document.getElementById('lblInk').textContent = `${state.inkIntensity}%`;
  }

  function wireFields() {
    document.getElementById('inpTitle').addEventListener('input', (ev) => {
      state.title = ev.target.value.toUpperCase();
      requestRender();
    });
    document.getElementById('inpScript').addEventListener('input', (ev) => {
      state.script = ev.target.value;
      requestRender();
    });
    document.getElementById('inpTagline').addEventListener('input', (ev) => {
      state.tagline = ev.target.value.toUpperCase();
      requestRender();
    });
    document.getElementById('inpKicker').addEventListener('input', (ev) => {
      state.kicker = ev.target.value.toUpperCase();
      requestRender();
    });
    document.getElementById('selHeat').addEventListener('change', (ev) => {
      state.heat = Number(ev.target.value);
      requestRender();
    });
    document.getElementById('chkNew').addEventListener('change', (ev) => {
      state.showNew = ev.target.checked;
      requestRender();
    });
    document.getElementById('chkEst').addEventListener('change', (ev) => {
      state.showEst = ev.target.checked;
      requestRender();
    });
    document.getElementById('chkInk').addEventListener('change', (ev) => {
      state.inkOverlay = ev.target.checked;
      requestRender();
    });
    document.getElementById('rngInk').addEventListener('input', (ev) => {
      state.inkIntensity = Number(ev.target.value);
      document.getElementById('lblInk').textContent = `${state.inkIntensity}%`;
      requestRender();
    });
  }

  /* ---- exports ---- */

  function exportPng(width, height, label) {
    const canvas = C.renderExport(state, images, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        if (exportStatus) exportStatus.textContent = 'Export failed — the browser could not write the PNG.';
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dorada-cover-${width}x${height}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (exportStatus) exportStatus.textContent = `Exported PNG ${width} × ${height} (${label}) — check your downloads.`;
      window.__lastExport = { width, height, label, bytes: blob.size };
    }, 'image/png');
  }

  function wireExports() {
    document.getElementById('btnExportSquare').addEventListener('click', () => exportPng(1080, 1080, 'Square'));
    document.getElementById('btnExportPortrait').addEventListener('click', () => exportPng(1080, 1350, 'Portrait'));
    document.getElementById('btnExportLandscape').addEventListener('click', () => exportPng(1920, 1080, 'Landscape'));
  }

  /* ---- preview pointer: pan, zoom, pick, drop ---- */

  function wirePreview() {
    preview.addEventListener('pointerdown', (ev) => {
      const at = panelAt(ev.clientX, ev.clientY);
      if (at < 0) return;
      state.activePanel = at;
      buildPanelRows();
      drag = { x: ev.clientX, y: ev.clientY, panX: state.panels[at].panX, panY: state.panels[at].panY };
      preview.setPointerCapture(ev.pointerId);
      preview.classList.add('dragging');
      requestRender();
    });
    preview.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      const panel = state.panels[state.activePanel];
      const box = preview.getBoundingClientRect();
      const scaleX = PREVIEW_W / box.width;
      const scaleY = PREVIEW_H / box.height;
      panel.panX = C.clamp(drag.panX + ((ev.clientX - drag.x) * scaleX) / (PREVIEW_W * 0.25), -1, 1);
      panel.panY = C.clamp(drag.panY + ((ev.clientY - drag.y) * scaleY) / (PREVIEW_H * 0.25), -1, 1);
      requestRender();
    });
    const endDrag = () => {
      drag = null;
      preview.classList.remove('dragging');
    };
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);
    preview.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const panel = state.panels[state.activePanel];
      panel.zoom = C.clamp(panel.zoom * Math.exp(-ev.deltaY * 0.0012), 1, 4);
      /* Keep the detail card's slider in step without rebuilding the card. */
      const slider = document.querySelector('#panelRows input[type="range"]');
      if (slider) slider.value = String(panel.zoom);
      requestRender();
    }, { passive: false });
    preview.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      preview.classList.add('drop-hot');
    });
    preview.addEventListener('dragleave', () => preview.classList.remove('drop-hot'));
    preview.addEventListener('drop', (ev) => {
      ev.preventDefault();
      preview.classList.remove('drop-hot');
      const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (!file) return;
      const at = panelAt(ev.clientX, ev.clientY);
      assignUpload(file, at >= 0 ? at : state.activePanel);
    });
  }

  /* ---- boot ---- */

  function init(editorState, loadedImages) {
    state = editorState;
    images = loadedImages;
    preview = document.getElementById('preview');
    previewCtx = preview.getContext('2d');
    statusLine = document.getElementById('statusLine');
    exportStatus = document.getElementById('exportStatus');

    const fill = document.getElementById('selSampleFill');
    sampleOptions(fill, C.SAMPLES[0].id);
    document.getElementById('btnFillAll').addEventListener('click', fillAllPanels);
    document.getElementById('btnSampleSet').addEventListener('click', useSampleSet);
    document.getElementById('btnSampleSetTop').addEventListener('click', useSampleSet);
    document.getElementById('btnRandomize').addEventListener('click', randomize);
    document.getElementById('btnRandomizeTop').addEventListener('click', randomize);

    buildLayoutButtons();
    buildGradeButtons();
    buildPanelRows();
    wireFields();
    wireExports();
    wirePreview();
    syncCaptionFields();
    syncInkFields();
    requestRender();
  }

  window.DoradaEditor = { init, requestRender, useSampleSet, randomize, exportPng };
})();
