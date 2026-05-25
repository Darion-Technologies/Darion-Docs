import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'

// Extends the stock VitePress theme while allowing Darion Docs to keep
// VitePress routing, search, and Markdown behavior intact.
export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('darion-hydrated')
    }
  }
}
