import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Architecture","description":"","frontmatter":{},"headers":[],"relativePath":"docs/architecture.md","filePath":"docs/architecture.md","lastUpdated":null}');
const _sfc_main = { name: "docs/architecture.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="architecture" tabindex="-1">Architecture <a class="header-anchor" href="#architecture" aria-label="Permalink to &quot;Architecture&quot;">​</a></h1><p>Darion Docs is a static documentation system built with VitePress. Source content is stored as Markdown, site behavior is configured in <code>.vitepress/config.mjs</code>, and visual identity is controlled through a thin theme extension.</p><h2 id="system-boundaries" tabindex="-1">System Boundaries <a class="header-anchor" href="#system-boundaries" aria-label="Permalink to &quot;System Boundaries&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Boundary</th><th>Responsibility</th></tr></thead><tbody><tr><td>Markdown content</td><td>Stores durable product, platform, and API knowledge.</td></tr><tr><td>VitePress runtime</td><td>Builds routes, search indexes, navigation, and static assets.</td></tr><tr><td>Theme override</td><td>Applies Darion typography, spacing, borders, and color behavior.</td></tr><tr><td>Hosting layer</td><td>Serves the generated static files from <code>.vitepress/dist</code>.</td></tr></tbody></table><h2 id="design-principles" tabindex="-1">Design Principles <a class="header-anchor" href="#design-principles" aria-label="Permalink to &quot;Design Principles&quot;">​</a></h2><p>The architecture favors static rendering, predictable routing, and low operating cost. Search is local to the generated site, which keeps the platform portable across self-hosted environments.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/architecture.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const architecture = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  architecture as default
};
