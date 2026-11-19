/* Dorada Cover Studio — screenshot scenes.
 *
 * The four screenshots are taken by the app itself, from its own drawing:
 * the page reads ?shot=cover, ?shot=portrait or ?shot=square, applies a
 * preset (layout, grade, caption), renders the export at its full size and
 * shows it scaled to the viewport; ?shot=editor leaves the editor up with
 * its default state. Every scene sets window.__shotReady once the fonts,
 * the samples and the first render are done, so the capture script knows
 * the frame is ready. Nothing here is shown to a normal visitor: without
 * a ?shot= parameter the app opens as the editor.
 */

(function () {
  const C = window.DoradaCover;

  /* The three exported-cover scenes: layout, grade, caption, export size. */
  const SCENES = {
    cover: {
      layout: 'hero-left', grade: 'poster', inkOverlay: true, inkIntensity: 85,
      title: 'DORADA HEAT', script: 'isla dorada nights', tagline: 'EVERY STREET IS A STAGE',
      kicker: 'ISLA DORADA', showNew: true, showEst: true, heat: 4,
      width: 1920, height: 1080,
    },
    portrait: {
      layout: 'hero-top', grade: 'neon', inkOverlay: false, inkIntensity: 0,
      title: 'NEON TIDES', script: 'neon harbor nights', tagline: 'THE BOARDWALK NEVER SLEEPS',
      kicker: 'ISLA DORADA', showNew: true, showEst: true, heat: 4,
      width: 1080, height: 1350,
    },
    square: {
      layout: 'duo', grade: 'golden', inkOverlay: false, inkIntensity: 0,
      title: 'GOLDEN HOUR RUN', script: 'golden hour run', tagline: 'CHASE THE LAST LIGHT',
      kicker: 'ISLA DORADA', showNew: true, showEst: true, heat: 4,
      width: 1080, height: 1080,
    },
  };

  /* The sample set each cover scene fills its panels with, in panel order. */
  const SCENE_PHOTOS = {
    cover: ['car-sunset', 'woman-car', 'boardwalk', 'fisherman', 'classic-street'],
    portrait: ['boardwalk', 'fisherman', 'woman-car', 'car-sunset', 'skyline'],
    square: ['classic-street', 'woman-car'],
  };

  function applyScene(state, name) {
    const scene = SCENES[name];
    state.layout = scene.layout;
    state.grade = scene.grade;
    state.inkOverlay = scene.inkOverlay;
    state.inkIntensity = scene.inkIntensity;
    state.title = scene.title;
    state.script = scene.script;
    state.tagline = scene.tagline;
    state.kicker = scene.kicker;
    state.showNew = scene.showNew;
    state.showEst = scene.showEst;
    state.heat = scene.heat;
    const photos = SCENE_PHOTOS[name];
    photos.forEach((id, i) => {
      state.panels[i].photo = id;
      state.panels[i].panX = 0;
      state.panels[i].panY = 0;
      state.panels[i].zoom = 1;
      state.panels[i].grade = 'global';
    });
    return scene;
  }

  /** Render an export-size cover into the full-viewport shot canvas. */
  function showExportShot(state, images, scene) {
    document.body.classList.add('shot-mode');
    const canvas = document.getElementById('shotCanvas');
    const full = C.renderExport(state, images, scene.width, scene.height);
    canvas.width = scene.width;
    canvas.height = scene.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(full, 0, 0);
    document.title = `Dorada Cover Studio — ${state.title}`;
  }

  /** Entry point, called by main.js after fonts and samples are loaded. */
  function runShots(state, images) {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    window.__shotReady = false;
    window.__shotName = shot || 'editor';
    if (shot && SCENES[shot]) {
      const scene = applyScene(state, shot);
      showExportShot(state, images, scene);
      window.__shotReady = true;
      return;
    }
    /* The editor scene: the default state already has Poster Ink selected,
     * the overlay checked and the intensity at 85%, with the sample set in. */
    window.__shotReady = true;
  }

  window.DoradaShots = { runShots, SCENES };
})();
