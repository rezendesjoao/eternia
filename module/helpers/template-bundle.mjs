/**
 * Every Handlebars template of the system, by path ("systems/eternia/templates/…"), or null.
 * In the repository this is null and the templates load one by one from the server, as Foundry does. The release
 * bundle (tools/package.mjs) replaces this module with the contents of templates/, so a world loads them all with the
 * code instead of asking the server for each one (see registerBundledTemplates in helpers/templates.mjs).
 * @type {Record<string, string>|null}
 */
export default null;
