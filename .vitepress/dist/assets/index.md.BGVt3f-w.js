import { c as _export_sfc, Q as openBlock, j as createElementBlock, g as createBaseVNode, m as createStaticVNode } from "./chunks/framework.CikPWVvE.js";
const __pageData = JSON.parse('{"title":"Developer Documentation","description":"","frontmatter":{"layout":"doc","title":"Developer Documentation","aside":false,"sidebar":false},"headers":[],"relativePath":"index.md","filePath":"index.md","lastUpdated":null}');
const _sfc_main = { name: "index.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createBaseVNode("section", {
      class: "darion-docs-home",
      "aria-labelledby": "darion-docs-title"
    }, [
      createBaseVNode("div", { class: "darion-docs-heading" }, [
        createBaseVNode("p", { class: "darion-eyebrow" }, "Darion Technologies"),
        createBaseVNode("div", { class: "darion-hero-lockup" }, [
          createBaseVNode("img", {
            class: "darion-hero-logo",
            src: "https://raw.githubusercontent.com/Pavandarivemula1/darion-assets/main/dariontechnologies(dt).png",
            alt: "Darion Technologies logo"
          }),
          createBaseVNode("h1", { id: "darion-docs-title" }, [
            createBaseVNode("span", null, "Developer"),
            createBaseVNode("span", null, "Documentation")
          ])
        ]),
        createBaseVNode("p", null, "Browse technical references, architectural guidance, and implementation notes for Darion systems.")
      ]),
      createBaseVNode("button", {
        class: "darion-docs-search",
        type: "button",
        onclick: "document.querySelector('.DocSearch-Button')?.click()",
        "aria-label": "Search Darion documentation"
      }, [
        createBaseVNode("span", {
          class: "darion-search-icon",
          "aria-hidden": "true"
        }),
        createBaseVNode("span", null, "Search documentation")
      ])
    ], -1),
    createStaticVNode('<section class="darion-platform-grid" aria-labelledby="darion-platforms-title"><h2 id="darion-platforms-title">Darion Platforms</h2><div class="darion-platform-list"><a class="darion-platform-card" href="/docs/introduction"><span class="darion-platform-icon darion-icon-docs" aria-hidden="true"></span><strong>Fundamentals</strong><span>Start with the concepts and documentation model.</span></a><a class="darion-platform-card" href="/docs/architecture"><span class="darion-platform-icon darion-icon-architecture" aria-hidden="true"></span><strong>Architecture</strong><span>Explore system boundaries and runtime responsibilities.</span></a><a class="darion-platform-card" href="/docs/getting-started"><span class="darion-platform-icon darion-icon-guides" aria-hidden="true"></span><strong>Guides</strong><span>Follow task-oriented workflows for implementation.</span></a><a class="darion-platform-card" href="/docs/api-specifications"><span class="darion-platform-icon darion-icon-api" aria-hidden="true"></span><strong>API Reference</strong><span>Review schemas, envelopes, and compatibility rules.</span></a></div></section><section class="darion-directory" aria-label="Documentation directory"><div class="darion-directory-column"><h2>Featured</h2><a class="darion-directory-link" href="/docs/getting-started"><strong>Getting Started</strong><span>Set up the local documentation environment and validate the build.</span></a><a class="darion-directory-link" href="/docs/architecture"><strong>Architecture</strong><span>Understand the static publishing model and theme boundary.</span></a></div><div class="darion-directory-column"><h2>Technologies</h2><a class="darion-directory-link" href="/docs/introduction"><strong>Documentation Model</strong><span>Learn how Darion organizes fundamentals, guides, and reference.</span></a><a class="darion-directory-link" href="/docs/api-specifications"><strong>API Specifications</strong><span>Use consistent response examples and reference tables.</span></a></div></section><section class="darion-resource-list" aria-labelledby="darion-resources-title"><h2 id="darion-resources-title">Resources</h2><div class="darion-resource-row"><a href="/docs/introduction"><strong>Introduction</strong><span>Read the platform overview.</span></a><a href="/docs/architecture"><strong>Architecture</strong><span>Review system-level decisions.</span></a><a href="/docs/getting-started"><strong>Getting Started</strong><span>Run the docs locally.</span></a><a href="/docs/api-specifications"><strong>API Specifications</strong><span>Browse reference conventions.</span></a></div></section>', 3)
  ])]);
}
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  index as default
};
