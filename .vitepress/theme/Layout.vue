<script setup>
import DefaultTheme from 'vitepress/theme'
import { computed, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const { Layout } = DefaultTheme
const { page, theme } = useData()
const route = useRoute()
const isOutlineOpen = ref(false)

const sidebarItem = computed(() => {
  const groups = Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []

  for (const group of groups) {
    const item = group.items?.find((entry) => normalizePath(entry.link) === normalizePath(route.path))

    if (item) return { group: group.text, item }
  }

  return null
})

const breadcrumbs = computed(() => {
  const crumbs = [{ text: 'Documentation', link: '/' }]

  if (sidebarItem.value) {
    crumbs.push({ text: sidebarItem.value.group })
    crumbs.push({ text: sidebarItem.value.item.text, link: sidebarItem.value.item.link })
    return crumbs
  }

  if (route.path !== '/') {
    crumbs.push({ text: page.value.title || route.path.split('/').filter(Boolean).pop() })
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
  return String(value || '').replace(/\/$/, '')
}
</script>

<template>
  <Layout>
    <template #doc-before>
      <div v-if="showDocTools" class="darion-doc-tools">
        <nav class="darion-breadcrumbs" aria-label="Breadcrumb">
          <template v-for="(crumb, index) in breadcrumbs" :key="`${crumb.text}-${index}`">
            <a v-if="crumb.link && index < breadcrumbs.length - 1" :href="crumb.link">{{ crumb.text }}</a>
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
