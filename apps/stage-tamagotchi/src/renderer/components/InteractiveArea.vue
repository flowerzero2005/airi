<script setup lang="ts">
import type { ChatHistoryItem } from '@proj-airi/stage-ui/types/chat'
import type { ChatProvider } from '@xsai-ext/providers/utils'

import { ChatHistory } from '@proj-airi/stage-ui/components'
import { useChatOrchestratorStore } from '@proj-airi/stage-ui/stores/chat'
import { useChatMaintenanceStore } from '@proj-airi/stage-ui/stores/chat/maintenance'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useChatStreamStore } from '@proj-airi/stage-ui/stores/chat/stream-store'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'
import { BasicTextarea } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { widgetsTools } from '../stores/tools/builtin/widgets'

const messageInput = ref('')
const attachments = ref<{ type: 'image', data: string, mimeType: string, url: string }[]>([])

const chatOrchestrator = useChatOrchestratorStore()
const chatSession = useChatSessionStore()
const chatStream = useChatStreamStore()
const { cleanupMessages } = useChatMaintenanceStore()
const { ingest, onAfterMessageComposed, discoverToolsCompatibility, resetMergeTimer } = chatOrchestrator
const { messages } = storeToRefs(chatSession)
const { streamingMessage } = storeToRefs(chatStream)
const { sending } = storeToRefs(chatOrchestrator)
const { t } = useI18n()
const providersStore = useProvidersStore()
const { activeModel, activeProvider } = storeToRefs(useConsciousnessStore())
const isComposing = ref(false)

// Memory system - lazy loaded to avoid blocking main functionality
let memoryTool: any = null
let memoryManager: any = null
let onChatTurnComplete: any = null
let memoryCleanup: (() => void) | null = null

// Track if memory system is initializing to prevent duplicate initialization
let isInitializing = false
let isInitialized = false

// Get tools array
async function getTools() {
  const baseTools = await widgetsTools()
  return memoryTool ? [...baseTools, memoryTool] : baseTools
}

// Safely initialize memory system
async function initializeMemorySystem() {
  // Prevent duplicate initialization
  if (isInitializing || isInitialized) {
    return
  }

  isInitializing = true

  try {
    // Dynamically import memory modules
    const { memoryTool: tool } = await import('../stores/tools/builtin/memory')
    const { useMemoryManager } = await import('@proj-airi/stage-ui/stores/chat/memory-manager')
    const { useCharacterNotebookStore } = await import('@proj-airi/stage-ui/stores/character/notebook')
    const { useChatContextStore } = await import('@proj-airi/stage-ui/stores/chat/context-store')
    const { createMemorySystemPrompt } = await import('@proj-airi/stage-ui/stores/chat/context-providers')

    // Initialize notebook store first
    const notebookStore = useCharacterNotebookStore()
    if (!notebookStore.isLoaded) {
      await notebookStore.loadFromStorage()
    }

    memoryTool = tool
    memoryManager = useMemoryManager()
    onChatTurnComplete = chatOrchestrator.onChatTurnComplete

    // Inject memory system prompt
    const contextStore = useChatContextStore()
    contextStore.ingestContextMessage(createMemorySystemPrompt())

    // Register memory extraction hook
    const hookCleanup = onChatTurnComplete(async (chat: any, context: any) => {
      try {
        const userMessage = context.composedMessage
          .filter((msg: any) => msg.role === 'user')
          .map((msg: any) => typeof msg.content === 'string' ? msg.content : '')
          .join(' ')
          .trim()

        const assistantMessage = chat.outputText

        if (userMessage && assistantMessage) {
          await memoryManager.processConversationTurn(userMessage, assistantMessage)
        }
      }
      catch (error) {
        console.error('[InteractiveArea] Memory extraction failed:', error)
      }
    })

    memoryCleanup = hookCleanup

    // Update tools compatibility with memory tool
    if (activeProvider.value && activeModel.value) {
      const tools = await getTools()
      await discoverToolsCompatibility(
        activeModel.value,
        await providersStore.getProviderInstance<ChatProvider>(activeProvider.value),
        tools,
      )
    }

    isInitialized = true
  }
  catch (error) {
    console.error('[InteractiveArea] Failed to initialize memory system:', error)
  }
  finally {
    isInitializing = false
  }
}

async function handleSend() {
  if (isComposing.value) {
    return
  }

  if (!messageInput.value.trim() && !attachments.value.length) {
    return
  }

  const textToSend = messageInput.value
  const attachmentsToSend = attachments.value.map(att => ({ ...att }))

  // optimistic clear
  messageInput.value = ''
  attachments.value = []

  try {
    const providerConfig = providersStore.getProviderConfig(activeProvider.value)
    const tools = await getTools()
    await ingest(textToSend, {
      model: activeModel.value,
      chatProvider: await providersStore.getProviderInstance<ChatProvider>(activeProvider.value),
      providerConfig,
      attachments: attachmentsToSend,
      tools,
    })

    attachmentsToSend.forEach(att => URL.revokeObjectURL(att.url))
  }
  catch (error) {
    // restore on failure
    messageInput.value = textToSend
    attachments.value = attachmentsToSend.map(att => ({
      ...att,
      url: URL.createObjectURL(new Blob([Uint8Array.from(atob(att.data), c => c.charCodeAt(0))], { type: att.mimeType })),
    }))
    messages.value.pop()
    messages.value.push({
      role: 'error',
      content: (error as Error).message,
    })
  }
}

async function handleFilePaste(files: File[]) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(',')[1]
        if (base64Data) {
          attachments.value.push({
            type: 'image' as const,
            data: base64Data,
            mimeType: file.type,
            url: URL.createObjectURL(file),
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }
}

function removeAttachment(index: number) {
  const attachment = attachments.value[index]
  if (attachment) {
    URL.revokeObjectURL(attachment.url)
    attachments.value.splice(index, 1)
  }
}

watch([activeProvider, activeModel], async () => {
  if (activeProvider.value && activeModel.value) {
    const tools = await getTools()
    await discoverToolsCompatibility(activeModel.value, await providersStore.getProviderInstance<ChatProvider>(activeProvider.value), tools)
  }
}, { immediate: true })

onAfterMessageComposed(async () => {
  messageInput.value = ''
  attachments.value.forEach(att => URL.revokeObjectURL(att.url))
  attachments.value = []
})

// Initialize memory system after component is mounted
onMounted(() => {
  // Delay initialization to avoid blocking main functionality
  setTimeout(() => {
    initializeMemorySystem()
  }, 1000)
})

onUnmounted(() => {
  if (memoryCleanup) {
    memoryCleanup()
    memoryCleanup = null
  }
  // Reset initialization flags
  isInitializing = false
  isInitialized = false
})

const historyMessages = computed(() => messages.value as unknown as ChatHistoryItem[])
</script>

<template>
  <div h-full w-full flex="~ col gap-1">
    <div w-full flex-1 overflow-hidden>
      <ChatHistory
        :messages="historyMessages"
        :sending="sending"
        :streaming-message="streamingMessage"
      />
    </div>
    <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 border-t border-primary-100 p-2">
      <div v-for="(attachment, index) in attachments" :key="index" class="relative">
        <img :src="attachment.url" class="h-20 w-20 rounded-md object-cover">
        <button class="absolute right-1 top-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-xs text-white" @click="removeAttachment(index)">
          &times;
        </button>
      </div>
    </div>
    <div class="flex items-center justify-end gap-2 py-1">
      <button
        class="max-h-[10lh] min-h-[1lh]"
        bg="neutral-100 dark:neutral-800"
        text="lg neutral-500 dark:neutral-400"
        hover:text="red-500 dark:red-400"
        flex items-center justify-center rounded-md p-2 outline-none
        transition-colors transition-transform active:scale-95
        @click="() => cleanupMessages()"
      >
        <div class="i-solar:trash-bin-2-bold-duotone" />
      </button>
    </div>
    <BasicTextarea
      v-model="messageInput"
      :placeholder="t('stage.message')"
      class="ph-no-capture"
      text="primary-600 dark:primary-100  placeholder:primary-500 dark:placeholder:primary-200"
      border="solid 2 primary-200/20 dark:primary-400/20"
      bg="primary-100/50 dark:primary-900/70"
      max-h="[10lh]" min-h="[1lh]"
      w-full shrink-0 resize-none overflow-y-scroll rounded-xl p-2 font-medium outline-none
      transition="all duration-250 ease-in-out placeholder:all placeholder:duration-250 placeholder:ease-in-out"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
      @keydown.enter.exact.prevent="handleSend"
      @paste-file="handleFilePaste"
      @input="resetMergeTimer"
    />
  </div>
</template>
