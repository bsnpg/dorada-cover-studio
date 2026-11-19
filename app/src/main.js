/* Dorada Cover Studio — boot.
 *
 * Loads the vendored fonts and the ten sample photos, builds the editor
 * state, starts the editor, then hands over to the screenshot scenes when
 * the page was opened with ?shot=. The app works with no network: every
 * font and sample is a file under app/.
 */

(function () {
  const C = window.DoradaCover;

  /** Load one image file; resolves with the element, or null when it fails. */
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /** Ask the browser for the three display faces, then render once more
   * when they arrive so the first paint never shows a fallback font. */
  async function loadFonts() {
    const wants = [
      '100px Anton',
      '600 40px Oswald',
      '400 40px Oswald',
      '40px Yellowtail',
    ];
    try {
      await Promise.all(wants.map((face) => document.fonts.load(face)));
      await document.fonts.ready;
    } catch (err) {
      /* A font that fails to load falls back to the system faces; the app
       * still works, it just looks plainer. */
    }
  }

  async function boot() {
    const state = C.defaultState();
    const images = {};
    await Promise.all(
      C.SAMPLES.map(async (sample) => {
        const img = await loadImage(sample.file);
        if (img) images[sample.id] = img;
      }),
    );
    window.__doradaImages = images;
    window.__doradaState = state;

    window.DoradaEditor.init(state, images);
    await loadFonts();
    window.DoradaEditor.requestRender();
    window.DoradaShots.runShots(state, images);
    /* The scene may have changed the state (layout, grade, caption); the
     * editor shot re-renders so the preview matches it. */
    window.DoradaEditor.requestRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
