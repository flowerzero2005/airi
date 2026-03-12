<script setup lang="ts">
import { useCharacterNotebookStore } from '@proj-airi/stage-ui/stores/character/notebook'
import { computed, onMounted, ref } from 'vue'

const notebookStore = useCharacterNotebookStore()

// 等待数据加载
const isLoading = ref(true)

onMounted(async () => {
  try {
    if (!notebookStore.isLoaded) {
      await notebookStore.loadFromStorage()
    }
    console.log('[Long-term Memory] Loaded entries:', notebookStore.entries.length)
  }
  catch (error) {
    console.error('[Long-term Memory] Failed to load:', error)
  }
  finally {
    isLoading.value = false
  }
})

// Filter and sort options
const selectedImportance = ref<'all' | 'focus' | 'note'>('all')
const searchQuery = ref('')
const selectedTags = ref<string[]>([])

// Edit state
const editingId = ref<string | null>(null)
const editingText = ref('')

// Get all entries sorted by creation time (newest first)
const allEntries = computed(() => {
  let filtered = notebookStore.entries

  // Filter by importance
  if (selectedImportance.value === 'focus') {
    filtered = filtered.filter(e => e.kind === 'focus')
  }
  else if (selectedImportance.value === 'note') {
    filtered = filtered.filter(e => e.kind === 'note')
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(e =>
      e.text.toLowerCase().includes(query)
      || e.tags?.some(tag => tag.toLowerCase().includes(query)),
    )
  }

  // Filter by selected tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter(e =>
      e.tags?.some(tag => selectedTags.value.includes(tag)),
    )
  }

  return filtered.sort((a, b) => b.createdAt - a.createdAt)
})

// Get all unique tags
const allTags = computed(() => {
  const tags = new Set<string>()
  notebookStore.entries.forEach((entry) => {
    entry.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

// Statistics
const stats = computed(() => ({
  total: notebookStore.entries.length,
  focus: notebookStore.partitionFocus.length,
  note: notebookStore.entries.filter(e => e.kind === 'note').length,
}))

function getImportanceIcon(kind: string) {
  switch (kind) {
    case 'focus':
      return '⭐'
    case 'note':
      return '📌'
    default:
      return '💡'
  }
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0)
    return '今天'
  if (diffDays === 1)
    return '昨天'
  if (diffDays < 7)
    return `${diffDays} 天前`
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} 周前`
  return date.toLocaleDateString('zh-CN')
}

function deleteEntry(id: string) {
  if (confirm('确定要删除这条记忆吗？')) {
    notebookStore.removeEntry(id)
  }
}

function startEdit(entry: any) {
  editingId.value = entry.id
  editingText.value = entry.text
}

function cancelEdit() {
  editingId.value = null
  editingText.value = ''
}

function saveEdit() {
  if (!editingId.value || !editingText.value.trim())
    return

  const entry = notebookStore.entries.find(e => e.id === editingId.value)
  if (entry) {
    entry.text = editingText.value.trim()
  }

  cancelEdit()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Statistics -->
    <div class="flex gap-4">
      <div class="flex-1 rounded-xl from-blue-50 to-blue-100 bg-gradient-to-br p-4 shadow-sm dark:from-blue-950 dark:to-blue-900">
        <div class="mb-1 text-sm text-blue-600 font-medium dark:text-blue-400">
          总记忆数
        </div>
        <div class="text-3xl text-blue-700 font-bold dark:text-blue-300">
          {{ stats.total }}
        </div>
      </div>
      <div class="flex-1 rounded-xl from-yellow-50 to-yellow-100 bg-gradient-to-br p-4 shadow-sm dark:from-yellow-950 dark:to-yellow-900">
        <div class="mb-1 text-sm text-yellow-600 font-medium dark:text-yellow-400">
          ⭐ 重要记忆
        </div>
        <div class="text-3xl text-yellow-700 font-bold dark:text-yellow-300">
          {{ stats.focus }}
        </div>
      </div>
      <div class="flex-1 rounded-xl from-green-50 to-green-100 bg-gradient-to-br p-4 shadow-sm dark:from-green-950 dark:to-green-900">
        <div class="mb-1 text-sm text-green-600 font-medium dark:text-green-400">
          📌 普通记忆
        </div>
        <div class="text-3xl text-green-700 font-bold dark:text-green-300">
          {{ stats.note }}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="border border-neutral-200 rounded-xl bg-neutral-50 p-4 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
      <!-- Search -->
      <div class="relative">
        <div class="absolute left-3 top-1/2 text-neutral-400 -translate-y-1/2">
          <div class="i-solar:magnifer-linear text-lg" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索记忆内容或标签..."
          class="w-full border border-neutral-300 rounded-lg bg-white py-3 pl-10 pr-10 outline-none transition-all dark:border-neutral-700 focus:border-blue-500 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
        >
        <div
          v-if="searchQuery"
          class="absolute right-3 top-1/2 cursor-pointer text-neutral-400 transition-colors -translate-y-1/2 hover:text-neutral-600"
          @click="searchQuery = ''"
        >
          <div class="i-solar:close-circle-bold text-lg" />
        </div>
      </div>

      <!-- Importance filter -->
      <div class="flex gap-2">
        <button
          :class="{ 'bg-blue-500 text-white border-blue-500': selectedImportance === 'all' }"
          class="border border-neutral-300 rounded-lg bg-white px-4 py-2 font-medium transition-all dark:border-neutral-700 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900"
          @click="selectedImportance = 'all'"
        >
          全部
        </button>
        <button
          :class="{ 'bg-yellow-500 text-white border-yellow-500': selectedImportance === 'focus' }"
          class="border border-neutral-300 rounded-lg bg-white px-4 py-2 font-medium transition-all dark:border-neutral-700 dark:bg-neutral-800 hover:bg-yellow-50 dark:hover:bg-yellow-900"
          @click="selectedImportance = 'focus'"
        >
          ⭐ 重要
        </button>
        <button
          :class="{ 'bg-green-500 text-white border-green-500': selectedImportance === 'note' }"
          class="border border-neutral-300 rounded-lg bg-white px-4 py-2 font-medium transition-all dark:border-neutral-700 dark:bg-neutral-800 hover:bg-green-50 dark:hover:bg-green-900"
          @click="selectedImportance = 'note'"
        >
          📌 普通
        </button>
      </div>

      <!-- Tags -->
      <div v-if="allTags.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="tag in allTags"
          :key="tag"
          :class="{ 'bg-blue-500 text-white border-blue-500': selectedTags.includes(tag) }"
          class="border border-neutral-300 rounded-full bg-white px-3 py-1 text-sm transition-all dark:border-neutral-700 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900"
          @click="() => {
            const index = selectedTags.indexOf(tag)
            if (index !== -1) {
              selectedTags.splice(index, 1)
            }
            else {
              selectedTags.push(tag)
            }
          }"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <!-- Memory list -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          记忆列表 ({{ allEntries.length }})
        </h3>
      </div>

      <div
        v-for="entry in allEntries"
        :key="entry.id"
        class="border border-neutral-200 rounded-xl bg-white p-4 transition-all dark:border-neutral-800 hover:border-blue-400 dark:bg-neutral-900 hover:shadow-lg dark:hover:border-blue-600"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="mb-2 flex items-center gap-2">
              <span class="text-2xl">{{ getImportanceIcon(entry.kind) }}</span>
              <span class="text-sm text-neutral-500 font-medium dark:text-neutral-400">
                {{ formatDate(entry.createdAt) }}
              </span>
            </div>

            <!-- Edit mode -->
            <div v-if="editingId === entry.id" class="mb-2 space-y-2">
              <textarea
                v-model="editingText"
                class="w-full resize-none border border-neutral-300 rounded-lg bg-white p-3 outline-none transition-all dark:border-neutral-700 focus:border-blue-500 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                rows="3"
                @keydown.esc="cancelEdit"
                @keydown.ctrl.enter="saveEdit"
              />
              <div class="flex items-center justify-between gap-2">
                <div class="flex gap-2">
                  <button
                    class="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow"
                    @click="saveEdit"
                  >
                    💾 保存
                  </button>
                  <button
                    class="rounded-lg bg-neutral-200 px-4 py-2 text-sm transition-all dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    @click="cancelEdit"
                  >
                    取消
                  </button>
                </div>
                <div class="text-xs text-neutral-400">
                  <kbd class="rounded bg-neutral-200 px-2 py-1 font-mono dark:bg-neutral-700">Ctrl+Enter</kbd> 保存
                  <kbd class="ml-2 rounded bg-neutral-200 px-2 py-1 font-mono dark:bg-neutral-700">Esc</kbd> 取消
                </div>
              </div>
            </div>

            <!-- View mode -->
            <div v-else>
              <div class="mb-3 break-words text-base leading-relaxed">
                {{ entry.text }}
              </div>
              <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="tag in entry.tags"
                  :key="tag"
                  class="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 font-medium dark:bg-blue-900 dark:text-blue-300"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="editingId !== entry.id" class="flex flex-shrink-0 gap-1">
            <button
              class="rounded-lg p-2 text-neutral-400 transition-all hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-400"
              title="编辑"
              @click="startEdit(entry)"
            >
              <div class="i-solar:pen-bold-duotone text-xl" />
            </button>
            <button
              class="rounded-lg p-2 text-neutral-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
              title="删除"
              @click="deleteEntry(entry.id)"
            >
              <div class="i-solar:trash-bin-2-bold-duotone text-xl" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="allEntries.length === 0"
        class="py-16 text-center text-neutral-500 dark:text-neutral-400"
      >
        <div v-if="isLoading" class="flex flex-col items-center gap-4">
          <div class="i-svg-spinners:ring-resize text-5xl text-blue-500" />
          <div class="text-lg">
            加载中...
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-4">
          <div class="text-6xl">
            📝
          </div>
          <div class="text-lg">
            暂无记忆
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-long-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
