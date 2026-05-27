import { defineConfig, loadEnv } from 'vitepress'
import { writerApiPlugin } from './plugins/writer-api.mjs'
import { getSidebar } from './sidebar.mjs'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')
Object.assign(process.env, env)

const isDevelopment = process.env.NODE_ENV !== 'production'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Darion Docs',
  description: 'Technical documentation and architectural references.',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['internal/**', 'metadata/**', 'supabase/**', 'src/**', 'README.md'],
  markdown: {
    lineNumbers: true
  },
  vite: {
    plugins: [writerApiPlugin()]
  },
  themeConfig: {
    logo: null,
    nav: [
      { text: 'Overview', link: '/' },
      { text: 'Guides', link: '/docs/getting-started' },
      { text: 'API Reference', link: '/docs/api-specifications' }
    ],
    sidebar: getSidebar({ includeTools: isDevelopment }),
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: 'Search documentation',
            buttonAriaLabel: 'Search documentation'
          },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset search',
            backButtonTitle: 'Close search',
            noResultsText: 'No results for',
            footer: {
              selectText: 'to select',
              selectKeyAriaLabel: 'enter',
              navigateText: 'to navigate',
              navigateUpKeyAriaLabel: 'up arrow',
              navigateDownKeyAriaLabel: 'down arrow',
              closeText: 'to close',
              closeKeyAriaLabel: 'escape'
            }
          }
        }
      }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/darion-technologies/darion-docs' }
    ],
    outline: {
      level: [2, 3],
      label: 'On this page'
    },
    footer: {
      message: 'Darion Developer Documentation. Built for reliable engineering decisions, implementation clarity, and long-term platform ownership.',
      copyright: 'Darion Technologies © 2026. All rights reserved.'
    }
  }
})
