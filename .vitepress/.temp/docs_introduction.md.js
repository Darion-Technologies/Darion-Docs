import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Introduction","description":"","frontmatter":{},"headers":[],"relativePath":"docs/introduction.md","filePath":"docs/introduction.md","lastUpdated":null}');
const _sfc_main = { name: "docs/introduction.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="introduction" tabindex="-1">Introduction <a class="header-anchor" href="#introduction" aria-label="Permalink to &quot;Introduction&quot;">​</a></h1><p>Darion Docs is the technical documentation home for Darion Technologies. It is designed for engineers, architects, and operators who need precise information without visual noise.</p><h2 id="purpose" tabindex="-1">Purpose <a class="header-anchor" href="#purpose" aria-label="Permalink to &quot;Purpose&quot;">​</a></h2><p>The documentation platform provides three durable layers:</p><table tabindex="0"><thead><tr><th>Layer</th><th>Purpose</th></tr></thead><tbody><tr><td>Fundamentals</td><td>Explain the concepts and architecture that remain stable over time.</td></tr><tr><td>Guides</td><td>Describe task-oriented workflows for local development and integration.</td></tr><tr><td>Reference</td><td>Capture schemas, parameters, responses, and compatibility rules.</td></tr></tbody></table><h2 id="writing-model" tabindex="-1">Writing Model <a class="header-anchor" href="#writing-model" aria-label="Permalink to &quot;Writing Model&quot;">​</a></h2><p>Each article should start with the reader&#39;s goal, then move into the minimum background needed to complete that goal. Use reference tables for stable facts, and use numbered procedures only when the order of operations matters.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/introduction.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const introduction = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  introduction as default
};
