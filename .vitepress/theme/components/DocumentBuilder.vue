<script setup>
import { computed, ref } from 'vue'

const title = ref('Authentication')
const group = ref('Core Modules')
const slug = ref('authentication')
const markdown = ref(`# Authentication

Describe how Darion services authenticate requests.

## Overview

Darion APIs use token-based authentication for service access.

## Example

\`\`\`json
{
  "Authorization": "Bearer <token>"
}
\`\`\`
`)
const status = ref('')
const error = ref('')
const isSaving = ref(false)

const normalizedSlug = computed(() => {
  return slugify(slug.value || title.value)
})

const filePath = computed(() => `docs/${normalizedSlug.value}.md`)
const routePath = computed(() => `/docs/${normalizedSlug.value}`)

function syncSlugFromTitle() {
  slug.value = slugify(title.value)
}

async function saveDocument() {
  status.value = ''
  error.value = ''
  isSaving.value = true

  try {
    const response = await fetch('/__writer/docs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title.value,
        group: group.value,
        slug: normalizedSlug.value,
        markdown: markdown.value
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Unable to save document.')
    }

    status.value = `${result.message}. Open ${result.routePath}.`
  } catch (saveError) {
    error.value = saveError.message.includes('fetch')
      ? 'Writer API is only available while running npm run docs:dev.'
      : saveError.message
  } finally {
    isSaving.value = false
  }
}

function slugify(value) {
  return String(value || 'new-document')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'new-document'
}
</script>

<template>
  <section class="doc-builder" aria-labelledby="doc-builder-title">
    <div class="doc-builder-header">
      <p class="doc-builder-kicker">Admin writing</p>
      <h1 id="doc-builder-title">Writer Console</h1>
      <p>Create or update Markdown documents directly inside the repository.</p>
    </div>

    <div class="doc-builder-grid">
      <form class="doc-builder-panel" @submit.prevent="saveDocument">
        <label>
          <span>Document title</span>
          <input v-model="title" type="text" autocomplete="off" @blur="syncSlugFromTitle" />
        </label>

        <label>
          <span>Sidebar group</span>
          <select v-model="group">
            <option>Fundamentals</option>
            <option>Core Modules</option>
            <option>Guides</option>
            <option>API Reference</option>
            <option>Tools</option>
          </select>
        </label>

        <label>
          <span>Slug</span>
          <input v-model="slug" type="text" autocomplete="off" />
        </label>

        <label>
          <span>Markdown document</span>
          <textarea v-model="markdown" class="doc-builder-markdown" rows="24" spellcheck="false" />
        </label>

        <div class="doc-builder-submit">
          <button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Document' }}
          </button>
        </div>
      </form>

      <aside class="doc-builder-panel doc-builder-output">
        <div class="doc-builder-meta">
          <div>
            <span>Writes to</span>
            <strong>{{ filePath }}</strong>
          </div>
          <div>
            <span>Route</span>
            <strong>{{ routePath }}</strong>
          </div>
          <div>
            <span>Sidebar group</span>
            <strong>{{ group }}</strong>
          </div>
        </div>

        <p v-if="status" class="doc-builder-status">{{ status }}</p>
        <p v-if="error" class="doc-builder-error">{{ error }}</p>

        <div class="doc-builder-note">
          <h2>How it works</h2>
          <p>
            This console saves Markdown through a local VitePress dev-server API.
            It is for trusted writers working in the repository.
          </p>
          <p>
            New files are written to <code>docs/</code>. The sidebar reads the
            document frontmatter and updates automatically after reload.
          </p>
        </div>

        <div class="doc-builder-preview">
          <h2>Saved frontmatter</h2>
          <pre><code>---
title: "{{ title }}"
group: "{{ group }}"
---</code></pre>
        </div>
      </aside>
    </div>
  </section>
</template>
