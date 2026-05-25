import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.resolve(__dirname, '..', 'docs')

const groupOrder = ['Fundamentals', 'Core Modules', 'Tools', 'Guides', 'API Reference']

const defaults = {
  introduction: { group: 'Fundamentals', order: 10, title: 'Introduction' },
  architecture: { group: 'Fundamentals', order: 20, title: 'Architecture' },
  'getting-started': { group: 'Core Modules', order: 10, title: 'Getting Started' },
  authentication: { group: 'Core Modules', order: 20, title: 'Authentication' },
  'api-specifications': { group: 'Core Modules', order: 30, title: 'API Specifications' },
  'document-builder': { group: 'Tools', order: 10, title: 'Writer Console' }
}

export function getSidebar({ includeTools = false } = {}) {
  const files = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter((file) => file.endsWith('.md'))
    : []

  const grouped = new Map()

  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const source = fs.readFileSync(path.join(docsDir, file), 'utf8')
    const frontmatter = readFrontmatter(source)
    const fallback = defaults[slug] || {}
    const group = frontmatter.group || fallback.group || 'Core Modules'
    const title = frontmatter.title || fallback.title || readTitle(source) || titleFromSlug(slug)
    const order = Number(frontmatter.order || fallback.order || 1000)

    if (!grouped.has(group)) grouped.set(group, [])

    grouped.get(group).push({
      text: title,
      link: `/docs/${slug}`,
      order
    })
  }

  const orderedGroups = [
    ...groupOrder,
    ...Array.from(grouped.keys()).filter((group) => !groupOrder.includes(group)).sort()
  ]

  return orderedGroups
    .filter((group) => includeTools || group !== 'Tools')
    .filter((group) => grouped.has(group))
    .map((group) => ({
      text: group,
      collapsed: false,
      items: grouped
        .get(group)
        .sort((a, b) => a.order - b.order || a.text.localeCompare(b.text))
        .map(({ text, link }) => ({ text, link }))
    }))
}

function readFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = {}

  if (!match) return frontmatter

  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '')
    frontmatter[key] = value
  }

  return frontmatter
}

function readTitle(source) {
  return source.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
