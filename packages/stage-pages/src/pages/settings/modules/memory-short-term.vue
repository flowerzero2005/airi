<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const status = ref('正在加载...')
const errorMsg = ref('')
const messages = ref<any[]>([])
const chatSession = ref<any>(null)
const keepCount = ref(20)

// 自动清理配置
const autoCleanupEnabled = ref(false)
const autoCleanupThreshold = ref(50)

// 从 localStorage 加载配置
onMounted(async () => {
  try {
    const { useChatSessionStore } = await import('@proj-airi/stage-ui/stores/chat/session-store')
    chatSession.value = useChatSessionStore()

    // 使用 computed 让 messages 响应式更新
    messages.value = chatSession.value.messages || []

    status.value = '加载成功'

    // 加载自动清理配置
    const savedConfig = localStorage.getItem('short-term-memory-config')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      autoCleanupEnabled.value = config.autoCleanupEnabled ?? false
      autoCleanupThreshold.value = config.autoCleanupThreshold ?? 50
      keepCount.value = config.keepCount ?? 20
    }

    // 检查是否需要自动清理
    checkAutoCleanup()

    // 定期检查消息数量（每5秒）
    setInterval(() => {
      if (chatSession.value) {
        const currentMessages = chatSession.value.messages || []
        messages.value = currentMessages

        if (autoCleanupEnabled.value && currentMessages.length > autoCleanupThreshold.value) {
          performAutoCleanup()
        }
      }
    }, 5000)
  }
  catch (error: any) {
    errorMsg.value = error?.message || String(error)
    status.value = '加载失败'
    console.error('[Short-term Memory] Error:', error)
  }
})

// 保存配置到 localStorage
watch([autoCleanupEnabled, autoCleanupThreshold, keepCount], () => {
  const config = {
    autoCleanupEnabled: autoCleanupEnabled.value,
    autoCleanupThreshold: autoCleanupThreshold.value,
    keepCount: keepCount.value,
  }
  localStorage.setItem('short-term-memory-config', JSON.stringify(config))
})

// 监听消息变化，自动清理（移除这个 watch，改用定时检查）
// watch(() => messages.value.length, (newLength) => {
//   if (autoCleanupEnabled.value && newLength > autoCleanupThreshold.value) {
//     performAutoCleanup()
//   }
// })

// 检查并执行自动清理
function checkAutoCleanup() {
  if (autoCleanupEnabled.value && messages.value.length > autoCleanupThreshold.value) {
    performAutoCleanup()
  }
}

// 执行自动清理
function performAutoCleanup() {
  if (!chatSession.value)
    return

  const msgs = messages.value
  const toRemove = msgs.length - keepCount.value

  if (toRemove > 0) {
    console.log(`[Short-term Memory] 自动清理: 删除 ${toRemove} 条消息，保留 ${keepCount.value} 条`)
    messages.value = msgs.slice(-keepCount.value)
    chatSession.value.setSessionMessages(chatSession.value.activeSessionId, messages.value)
  }
}

// 统计信息
const stats = computed(() => {
  const msgs = messages.value
  return {
    total: msgs.length,
    user: msgs.filter(m => m.role === 'user').length,
    assistant: msgs.filter(m => m.role === 'assistant').length,
    system: msgs.filter(m => m.role === 'system').length,
  }
})

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1)
    return '刚刚'
  if (diffMins < 60)
    return `${diffMins} 分钟前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24)
    return `${diffHours} 小时前`
  return date.toLocaleString('zh-CN')
}

// 获取消息预览
function getPreview(message: any) {
  if (typeof message.content === 'string') {
    return message.content.slice(0, 100)
  }
  if (Array.isArray(message.content)) {
    const textPart = message.content.find((p: any) => p.type === 'text')
    return textPart?.text?.slice(0, 100) || '[非文本内容]'
  }
  return '[无内容]'
}

// 清空所有消息
async function clearAll() {
  if (!chatSession.value)
    return
  if (!confirm('确定要清空当前会话的所有消息吗？'))
    return

  try {
    await chatSession.value.cleanupMessages()
    messages.value = []
    alert('消息已清空')
  }
  catch (error) {
    alert(`清空失败: ${error}`)
  }
}

// 保留最近N条
function keepRecent() {
  if (!chatSession.value)
    return

  const msgs = messages.value
  if (msgs.length <= keepCount.value) {
    alert('消息数量未超过保留数量')
    return
  }

  const toRemove = msgs.length - keepCount.value
  if (!confirm(`将删除最早的 ${toRemove} 条消息，保留最近 ${keepCount.value} 条。确定吗？`))
    return

  messages.value = msgs.slice(-keepCount.value)
  chatSession.value.setSessionMessages(chatSession.value.activeSessionId, messages.value)
  alert(`已保留最近 ${keepCount.value} 条消息`)
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- 统计卡片 -->
    <div class="flex gap-4">
      <div class="flex-1 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">
          总消息数
        </div>
        <div class="text-2xl font-bold">
          {{ stats.total }}
        </div>
      </div>
      <div class="flex-1 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">
          用户消息
        </div>
        <div class="text-2xl text-blue-500 font-bold">
          {{ stats.user }}
        </div>
      </div>
      <div class="flex-1 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">
          助手消息
        </div>
        <div class="text-2xl text-green-500 font-bold">
          {{ stats.assistant }}
        </div>
      </div>
    </div>

    <!-- 自动清理配置 -->
    <div class="border border-neutral-200 rounded-lg bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 class="mb-4 text-lg font-semibold">
        自动清理配置
      </h3>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">启用自动清理</label>
          <input
            v-model="autoCleanupEnabled"
            type="checkbox"
            class="h-4 w-4"
          >
        </div>

        <div v-if="autoCleanupEnabled" class="border-l-2 border-primary-200 pl-4 space-y-4 dark:border-primary-800">
          <div>
            <label class="mb-2 block text-sm font-medium">
              触发阈值：{{ autoCleanupThreshold }} 条消息
            </label>
            <input
              v-model.number="autoCleanupThreshold"
              type="range"
              min="20"
              max="200"
              step="10"
              class="w-full"
            >
            <p class="mt-1 text-xs text-neutral-500">
              当消息数超过此值时自动清理
            </p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium">
              保留消息数：{{ keepCount }} 条
            </label>
            <input
              v-model.number="keepCount"
              type="range"
              min="10"
              max="100"
              step="5"
              class="w-full"
            >
            <p class="mt-1 text-xs text-neutral-500">
              清理后保留最近的消息数量
            </p>
          </div>

          <div class="border border-blue-200 rounded bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900">
            <p class="text-sm text-blue-700 dark:text-blue-300">
              ℹ️ 当消息数达到 {{ autoCleanupThreshold }} 条时，将自动删除最早的消息，保留最近 {{ keepCount }} 条
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 手动清理操作 -->
    <div class="border border-neutral-200 rounded-lg bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 class="mb-4 text-lg font-semibold">
        手动清理
      </h3>

      <div class="flex gap-3">
        <button
          class="rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600"
          @click="keepRecent"
        >
          保留最近 {{ keepCount }} 条
        </button>
        <button
          class="rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
          @click="clearAll"
        >
          清空所有消息
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">
        消息历史 ({{ messages.length }})
      </h3>

      <div v-if="messages.length === 0" class="py-12 text-center text-neutral-500 dark:text-neutral-400">
        暂无消息
      </div>

      <div
        v-for="(msg, index) in messages"
        v-else
        :key="msg.id || index"
        class="border rounded-lg bg-neutral-50 p-4 transition-colors hover:border-blue-500 dark:bg-neutral-900"
        :class="{
          'border-blue-200 dark:border-blue-800': msg.role === 'user',
          'border-green-200 dark:border-green-800': msg.role === 'assistant',
          'border-neutral-200 dark:border-neutral-800': msg.role === 'system',
        }"
      >
        <div class="mb-2 flex items-start justify-between">
          <span class="text-xs text-neutral-500 font-semibold uppercase dark:text-neutral-400">
            {{ msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 助手' : '⚙️ 系统' }}
          </span>
          <span class="text-xs text-neutral-400">
            {{ formatTime(msg.createdAt) }}
          </span>
        </div>
        <div class="line-clamp-3 break-words text-sm text-neutral-700 dark:text-neutral-300">
          {{ getPreview(msg) }}
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-short-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
