/**
 * The fonts of the canvas, loaded side by side.
 *
 * Before the first scene, Foundry waits for every family of CONFIG.fontDefinitions (FontConfig._loadFonts), and
 * FontConfig.loadFont fetches the files of a family one after the other: Signika's weights, the four of the system's
 * Eczar… Every file costs a round trip to the server (it answers "no-cache"), so against a remote server the canvas
 * waits for the longest family's files in a row. This loads the files of each family at the same time and adds them
 * to the page in the order of the definition, as before; the check, the warnings and the result are the core's.
 */
export function registerFontLoading() {
  const FontConfig = foundry.applications.settings?.menus?.FontConfig;
  if (typeof FontConfig?.loadFont !== "function" || typeof FontConfig._createFontFace !== "function") return;
  const coreLoadFont = FontConfig.loadFont;
  FontConfig.loadFont = async function(family, definition, { document } = {}) {
    if (!Array.isArray(definition?.fonts) || (definition.fonts.length < 2)) return coreLoadFont.call(this, family, definition, { document });
    document ??= window.document;
    const check = `1rem "${family}"`;
    try {
      const faces = definition.fonts.map(font => this._createFontFace(family, font));
      const loaded = await Promise.allSettled(faces.map(face => face.load()));
      // The faces loaded before a failure still go in, in order, as when they loaded one by one
      for (const [i, result] of loaded.entries()) {
        if (result.status === "rejected") throw result.reason;
        document.fonts.add(faces[i]);
      }
      await document.fonts.load(check);
    }
    catch(err) {
      console.warn(`Font family "${family}" failed to load:`, err);
      return false;
    }
    if (!document.fonts.check(check)) {
      console.warn(`Font family "${family}" failed to load.`);
      return false;
    }
    return coreLoadFont.call(this, family, { ...definition, fonts: [] }, { document });
  };
}
