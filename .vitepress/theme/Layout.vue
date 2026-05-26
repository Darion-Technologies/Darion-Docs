<script setup>
import DefaultTheme from 'vitepress/theme'
import { computed, ref, watch } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'

const { Layout } = DefaultTheme
const { page, theme } = useData()
const route = useRoute()
const isOutlineOpen = ref(false)

const sidebarGroups = computed(() => {
  return Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []
})

const sidebarItem = computed(() => {
  const currentPath = normalizePath(route.path)

  for (const group of sidebarGroups.value) {
    const item = group.items?.find((entry) => normalizePath(entry.link) === currentPath)

    if (item) return { group: group.text, item }
  }

  return null
})

const breadcrumbs = computed(() => {
  const crumbs = [{ text: 'Documentation', link: withBase('/') }]

  if (sidebarItem.value) {
    const group = sidebarGroups.value.find((entry) => entry.text === sidebarItem.value.group)
    const groupLink = group?.items?.[0]?.link

    crumbs.push({
      text: sidebarItem.value.group,
      link: groupLink ? withBase(groupLink) : null
    })
    crumbs.push({
      text: sidebarItem.value.item.text,
      link: withBase(sidebarItem.value.item.link),
      current: true
    })
    return crumbs
  }

  const segments = route.path.split('/').filter(Boolean)

  if (segments[0] === 'docs' && segments.length > 1) {
    crumbs.push({
      text: page.value.title || titleFromSlug(segments[segments.length - 1]),
      current: true
    })
    return crumbs
  }

  if (route.path !== '/') {
    crumbs.push({
      text: page.value.title || titleFromSlug(segments[segments.length - 1] || 'Page'),
      current: true
    })
  }

  return crumbs
})

const outlineItems = computed(() => {
  return page.value.headers || []
})

const showDocTools = computed(() => {
  return route.path !== '/' && (breadcrumbs.value.length > 1 || outlineItems.value.length > 0)
})

watch(
  () => route.path,
  () => {
    isOutlineOpen.value = false
  }
)

function normalizePath(value) {
  const normalized = String(value || '').replace(/\/$/, '')
  if (!normalized) return '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<template>
  <Layout>
    <template #doc-before>
      <div v-if="showDocTools" class="darion-doc-tools">
        <nav class="darion-breadcrumbs" aria-label="Breadcrumb">
          <template v-for="(crumb, index) in breadcrumbs" :key="`${crumb.text}-${index}`">
            <a v-if="crumb.link && !crumb.current" :href="crumb.link">{{ crumb.text }}</a>
            <span v-else>{{ crumb.text }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="darion-breadcrumb-separator" aria-hidden="true">/</span>
          </template>
        </nav>

        <button
          v-if="outlineItems.length"
          class="darion-outline-toggle"
          type="button"
          :aria-expanded="isOutlineOpen"
          aria-controls="darion-outline-drawer"
          @click="isOutlineOpen = true"
        >
          <span aria-hidden="true"></span>
          <span class="darion-sr-only">Open page outline</span>
        </button>
      </div>

      <div
        v-if="outlineItems.length"
        class="darion-outline-scrim"
        :data-open="isOutlineOpen"
        @click="isOutlineOpen = false"
      ></div>

      <aside
        v-if="outlineItems.length"
        id="darion-outline-drawer"
        class="darion-outline-drawer"
        :data-open="isOutlineOpen"
        aria-label="Page outline"
      >
        <div class="darion-outline-header">
          <strong>On this page</strong>
          <button type="button" @click="isOutlineOpen = false">Close</button>
        </div>
        <nav>
          <a
            v-for="header in outlineItems"
            :key="header.link"
            :href="header.link"
            :data-level="header.level"
            @click="isOutlineOpen = false"
          >
            {{ header.title }}
          </a>
        </nav>
      </aside>
    </template>
  </Layout>
</template>
