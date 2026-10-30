/**
 * Rendering of the system's sheets without the work no one sees (the character, monster, item and pile sheets):
 *  - a render asked while another one waits for its turn joins it: ApplicationV2#render queues every call, one at a
 *    time, so the updates that arrive while a sheet draws (a skill used updates the actor, then the item) would each
 *    draw it again from scratch with the same data;
 *  - a minimized sheet doesn't draw: the renders it skipped run when it opens again (only its title follows a new name);
 *  - an enriched text asks for the roll data only when it has inline rolls (needsRollData).
 */

/** The options of a render that only draws again (`isFirstRender` is set by the render itself): it can join another. */
const PLAIN = new Set(["parts", "renderContext", "renderData", "force", "isFirstRender"]);
const isPlain = options => !options.force && Object.keys(options).every(key => PLAIN.has(key));

/** Two renders join when both name their parts, or neither does (everything, or what the sheet decides). */
const joinable = (a, b) => !a.parts === !b.parts;

/** When each render was asked, by its options (a sheet's renders run in that order). */
const ASKED = new WeakMap();

/**
 * Join a render's options to those of one that hasn't started: the parts of both, the context of the first that has
 * one, and the changes of both (the window title follows renderData.name: DocumentSheetV2#_configureRenderOptions).
 * @param {object} into
 * @param {object} from
 */
function join(into, from) {
  if (into.parts) into.parts = [...new Set([...into.parts, ...from.parts])];
  if (from.renderContext && !into.renderContext) into.renderContext = from.renderContext;
  const a = into.renderData, b = from.renderData;
  if (b === undefined) return;
  const object = value => foundry.utils.getType(value) === "Object";
  if (object(a) && object(b)) into.renderData = foundry.utils.mergeObject(a, b, { inplace: false });
  else if (object(b) || (a === undefined)) into.renderData = b;
}

/**
 * The render queue and the minimized sheet, for a document sheet class.
 * @param {typeof foundry.applications.api.DocumentSheetV2} Base
 */
export function SheetRenderMixin(Base) {
  // Anonymous: no hooks of its own (ApplicationV2 calls the hooks of each named class of the chain)
  return class extends Base {

    /** The render waiting for its turn that later ones join: { options, asked, promise }. */
    #waiting = null;

    /** How many renders were asked. */
    #asked = 0;

    /** The renders skipped while minimized. */
    #skipped = [];

    /** @override */
    render(options = {}, _options = {}) {
      if (typeof options === "boolean") options = Object.assign(_options, { force: options });
      const waiting = this.#waiting;
      if (waiting && isPlain(options) && joinable(waiting.options, options)) {
        join(waiting.options, options);
        return waiting.promise;
      }
      const entry = { options, asked: ++this.#asked };
      ASKED.set(options, entry.asked);
      // Marked before: a render that starts at once (nothing drawing) unmarks itself in _canRender
      if (isPlain(options)) this.#waiting = entry;
      entry.promise = super.render(options);
      return entry.promise;
    }

    /** @override */
    _canRender(options) {
      // The first thing a render runs: the waiting one (or one asked after it) started, later ones can't join it
      if (this.#waiting && ((ASKED.get(options) ?? Infinity) >= this.#waiting.asked)) this.#waiting = null;
      if (super._canRender(options) === false) return false;
      if (options.force) {
        if (!options.parts) this.#skipped.length = 0;
        return;
      }
      if (!this.minimized) return;
      // Minimized: drawn when it opens again (maximize)
      if (this.hasFrame && options.renderContext && options.renderData?.name) this.window.title.innerText = this.title;
      const last = this.#skipped.at(-1);
      if (last && isPlain(last) && isPlain(options) && joinable(last, options)) join(last, options);
      else this.#skipped.push(options);
      return false;
    }

    /** @override */
    async maximize() {
      // What it skipped while minimized draws as it opens (super ends the minimized state before its animation)
      const skipped = this.minimized ? this.#skipped.splice(0) : [];
      const done = super.maximize();
      for (const options of skipped) this.render(options);
      return done;
    }
  };
}

/**
 * Whether an enriched text needs the roll data: its inline rolls ([[/r …]]) and the documents it embeds (enriched with
 * the same options). The system's own enricher (the chips, helpers/text-chips.mjs) doesn't read it.
 * @param {string} text
 */
export const needsRollData = text => /\[\[|@embed\[/i.test(String(text ?? ""));

/**
 * A function of a text whose results are kept (the last `size` texts): the sheets read the same descriptions on every
 * render, and each reading parses HTML. The results are shared: they must not be changed.
 * @param {(text: string) => any} fn
 * @param {number} [size]
 */
export function byText(fn, size = 200) {
  const cache = new Map();
  return text => {
    const key = String(text ?? "");
    if (cache.has(key)) return cache.get(key);
    if (cache.size >= size) cache.delete(cache.keys().next().value);
    const value = fn(key);
    cache.set(key, value);
    return value;
  };
}
