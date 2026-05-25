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
    createStaticVNode("", 3)
  ])]);
}
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  index as default
};
