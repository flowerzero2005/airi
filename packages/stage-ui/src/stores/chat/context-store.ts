import type { ContextMessage } from '../../types/chat'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'

export const useChatContextStore = defineStore('chat-context', () => {
  const activeContexts = ref<Record<string, ContextMessage[]>>({})

  function ingestContextMessage(envelope: ContextMessage) {
    // Use contextId as the key for grouping contexts
    const sourceKey = envelope.contextId || 'unknown'

    if (!activeContexts.value[sourceKey]) {
      activeContexts.value[sourceKey] = []
    }

    if (envelope.strategy === ContextUpdateStrategy.ReplaceSelf) {
      activeContexts.value[sourceKey] = [envelope]
    }
    else if (envelope.strategy === ContextUpdateStrategy.AppendSelf) {
      activeContexts.value[sourceKey].push(envelope)
    }
  }

  function resetContexts() {
    activeContexts.value = {}
  }

  function getContextsSnapshot() {
    return toRaw(activeContexts.value)
  }

  return {
    ingestContextMessage,
    resetContexts,
    getContextsSnapshot,
  }
})
