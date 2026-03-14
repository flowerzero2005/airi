<script setup lang="ts">
import type { ChatSlices, ChatSlicesText, StreamingAssistantMessage } from '../../../types/chat'

import { computed, ref, watch } from 'vue'

import ChatResponsePart from './response-part.vue'
import ChatToolCallBlock from './tool-call-block.vue'

import { useMemoryAdvancedSettingsStore } from '../../../stores/settings/memory-advanced'
import { MarkdownRenderer } from '../../markdown'

const props = withDefaults(defineProps<{
  message: StreamingAssistantMessage
  label: string
  showPlaceholder?: boolean
  variant?: 'desktop' | 'mobile'
}>(), {
  showPlaceholder: false,
  variant: 'desktop',
})

const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()

const resolvedSlices = computed<ChatSlices[]>(() => {
  if (props.message.slices?.length) {
    return props.message.slices
  }

  if (typeof props.message.content === 'string' && props.message.content.trim()) {
    return [{ type: 'text', text: props.message.content } satisfies ChatSlicesText]
  }

  if (Array.isArray(props.message.content)) {
    const textPart = props.message.content.find(part => 'type' in part && part.type === 'text') as { text?: string } | undefined
    if (textPart?.text)
      return [{ type: 'text', text: textPart.text } satisfies ChatSlicesText]
  }

  return []
})

// 打字机效果状态
const displayedText = ref<string>('')
const isTyping = ref(false)
const messageCompleted = ref(false) // 标记消息是否已完成显示

// 从设置中获取打字机速度
const typingSpeed = computed(() => memoryAdvancedSettings.settings.typingSpeed || 30)

// 检查消息是否是历史消息（创建时间超过5秒）
const isHistoricalMessage = computed(() => {
  const createdAt = props.message.createdAt
  if (!createdAt)
    return true // 没有创建时间的消息视为历史消息

  const now = Date.now()
  const age = now - createdAt
  return age > 5000 // 超过5秒的消息视为历史消息
})

// 当消息内容变化时，触发打字机效果
watch(() => resolvedSlices.value, (newSlices, oldSlices) => {
  // 只对文本类型的 slice 应用打字机效果
  const newTextSlice = newSlices.find(s => s.type === 'text') as ChatSlicesText | undefined
  const oldTextSlice = oldSlices?.find(s => s.type === 'text') as ChatSlicesText | undefined

  if (!newTextSlice) {
    displayedText.value = ''
    isTyping.value = false
    messageCompleted.value = true
    return
  }

  const newText = newTextSlice.text
  const oldText = oldTextSlice?.text || ''

  // 如果文本完全相同，不需要打字机效果
  if (newText === oldText) {
    return
  }

  // 如果是历史消息，直接显示完整文本
  if (isHistoricalMessage.value) {
    displayedText.value = newText
    isTyping.value = false
    messageCompleted.value = true
    return
  }

  // 检查消息是否已标记为完成（通过 metadata）
  const isCompleted = (props.message as any).metadata?.typingCompleted === true

  // 如果消息已完成，直接显示完整文本
  if (isCompleted || messageCompleted.value) {
    displayedText.value = newText
    isTyping.value = false
    messageCompleted.value = true
    return
  }

  // 如果是新消息（从空到有内容），启动打字机效果
  if (oldText === '' && newText.length > 0) {
    displayedText.value = ''
    isTyping.value = true
    messageCompleted.value = false
    startTypingEffect(newText)
  }
  // 如果文本在增长（流式输出），继续打字机效果
  else if (newText.startsWith(oldText) && newText.length > oldText.length) {
    isTyping.value = true
    startTypingEffect(newText)
  }
  // 否则直接显示完整文本
  else {
    displayedText.value = newText
    isTyping.value = false
    messageCompleted.value = true
  }
}, { immediate: true, deep: true })

function startTypingEffect(targetText: string) {
  const currentLength = displayedText.value.length

  if (currentLength >= targetText.length) {
    isTyping.value = false
    messageCompleted.value = true
    return
  }

  setTimeout(() => {
    displayedText.value = targetText.slice(0, currentLength + 1)

    if (displayedText.value.length < targetText.length) {
      startTypingEffect(targetText)
    }
    else {
      isTyping.value = false
      messageCompleted.value = true
    }
  }, typingSpeed.value)
}

// 用于渲染的 slices，使用打字机效果的文本
const displaySlices = computed<ChatSlices[]>(() => {
  return resolvedSlices.value.map((slice) => {
    if (slice.type === 'text') {
      return { type: 'text', text: displayedText.value } satisfies ChatSlicesText
    }
    return slice
  })
})

const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
const containerClass = computed(() => props.variant === 'mobile' ? 'mr-0' : 'mr-12')
const boxClasses = computed(() => [
  props.variant === 'mobile' ? 'px-2 py-2 text-sm bg-primary-50/90 dark:bg-primary-950/90' : 'px-3 py-3 bg-primary-50/80 dark:bg-primary-950/80',
])
</script>

<template>
  <div flex :class="containerClass" class="ph-no-capture">
    <div
      flex="~ col" shadow="sm primary-200/50 dark:none"
      min-w-20 rounded-xl h="unset <sm:fit"
      :class="boxClasses"
    >
      <div>
        <span text-sm text="black/60 dark:white/65" font-normal class="inline <sm:hidden">{{ label }}</span>
      </div>
      <div v-if="displaySlices.length > 0" class="break-words" text="primary-700 dark:primary-100">
        <template v-for="(slice, sliceIndex) in displaySlices" :key="sliceIndex">
          <ChatToolCallBlock
            v-if="slice.type === 'tool-call'"
            :tool-name="slice.toolCall.toolName"
            :args="slice.toolCall.args"
            class="mb-2"
          />
          <template v-else-if="slice.type === 'tool-call-result'" />
          <template v-else-if="slice.type === 'text'">
            <MarkdownRenderer :content="slice.text" />
          </template>
        </template>
      </div>
      <div v-else-if="showLoader" i-eos-icons:three-dots-loading />

      <ChatResponsePart
        v-if="message.categorization"
        :message="message"
        :variant="variant"
      />
    </div>
  </div>
</template>
