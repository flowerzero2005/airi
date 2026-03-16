<script setup lang="ts">
import type { ChatHistoryItem, StreamingAssistantMessage } from '../../../types/chat'

import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ChatAssistantItem from './assistant-item.vue'
import ChatErrorItem from './error-item.vue'
import ChatUserItem from './user-item.vue'

const props = withDefaults(defineProps<{
  messages: ChatHistoryItem[]
  streamingMessage?: StreamingAssistantMessage | null
  sending?: boolean
  assistantLabel?: string
  userLabel?: string
  errorLabel?: string
  variant?: 'desktop' | 'mobile'
}>(), {
  sending: false,
  variant: 'desktop',
})

const chatHistoryRef = ref<HTMLDivElement>()

const { t } = useI18n()
const labels = computed(() => ({
  assistant: props.assistantLabel ?? t('stage.chat.message.character-name.airi'),
  user: props.userLabel ?? t('stage.chat.message.character-name.you'),
  error: props.errorLabel ?? t('stage.chat.message.character-name.core-system'),
}))

function scrollToBottom() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!chatHistoryRef.value)
        return

      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    })
  })
}

watch([() => props.messages, () => props.streamingMessage], scrollToBottom, { deep: true, flush: 'post' })
watch(() => props.sending, scrollToBottom, { flush: 'post' })
onMounted(scrollToBottom)

const streaming = computed<StreamingAssistantMessage>(() => props.streamingMessage ?? { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now() })

// 修复：不仅在没有 slice 时显示 placeholder，也要在有未完成工具调用时显示
const showStreamingPlaceholder = computed(() => {
  const slices = streaming.value.slices ?? []
  const content = streaming.value.content

  // 情况1：没有任何 slice 且没有 content
  if (slices.length === 0 && !content) {
    return true
  }

  // 情况2：检查是否有未完成的工具调用
  const toolCallIds = new Set<string>()
  const toolResultIds = new Set<string>()

  slices.forEach((slice) => {
    if (slice.type === 'tool-call') {
      // CompletionToolCall 应该有 id 属性，但类型定义可能不完整
      const toolCallId = (slice.toolCall as any).id || (slice.toolCall as any).toolCallId
      if (toolCallId) {
        toolCallIds.add(toolCallId)
      }
    }
    else if (slice.type === 'tool-call-result') {
      toolResultIds.add(slice.id)
    }
  })

  // 如果有 tool-call 但没有对应的 result，说明工具正在执行，应该显示 placeholder
  for (const id of toolCallIds) {
    if (!toolResultIds.has(id)) {
      return true
    }
  }

  return false
})

const streamingTs = computed(() => streaming.value?.createdAt)
function shouldShowPlaceholder(message: ChatHistoryItem) {
  const ts = streamingTs.value
  if (ts == null)
    return false

  return message.context?.createdAt === ts || message.createdAt === ts
}
const renderMessages = computed<ChatHistoryItem[]>(() => {
  if (!props.sending)
    return props.messages

  const streamTs = streamingTs.value
  if (!streamTs)
    return props.messages

  const hasStreamAlready = streamTs && props.messages.some(msg => msg?.role === 'assistant' && msg?.createdAt === streamTs)

  if (hasStreamAlready)
    return props.messages

  return [...props.messages, streaming.value]
})
</script>

<template>
  <div ref="chatHistoryRef" v-auto-animate flex="~ col" relative h-full w-full overflow-y-auto rounded-xl px="<sm:2" py="<sm:2" :class="variant === 'mobile' ? 'gap-1' : 'gap-2'">
    <template v-for="(message, index) in renderMessages" :key="message?.createdAt ?? index">
      <div v-if="message.role === 'error'">
        <ChatErrorItem
          :message="message"
          :label="labels.error"
          :show-placeholder="sending && index === renderMessages.length - 1"
          :variant="variant"
        />
      </div>

      <div v-else-if="message.role === 'assistant'">
        <ChatAssistantItem
          :message="message"
          :label="labels.assistant"
          :show-placeholder="shouldShowPlaceholder(message) && showStreamingPlaceholder"
          :variant="variant"
        />
      </div>

      <div v-else-if="message.role === 'user'">
        <ChatUserItem
          :message="message"
          :label="labels.user"
          :variant="variant"
        />
      </div>
    </template>
  </div>
</template>
