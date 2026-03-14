import type { ChatHistoryItem, ContextMessage } from '../../../types/chat'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'

import { useMemoryManager } from '../memory-manager'

const NOTEBOOK_MEMORY_CONTEXT_ID = 'notebook-memory'

/**
 * Creates a context message containing relevant memories from the notebook.
 * This context is injected before each chat message to provide memory awareness.
 *
 * @param userMessage - The current user message
 * @param recentMessages - Optional recent conversation history for context-aware search
 */
export async function createNotebookMemoryContext(
  userMessage: string,
  recentMessages?: ChatHistoryItem[],
): Promise<ContextMessage> {
  const memoryManager = useMemoryManager()

  // Input validation
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return {
      id: nanoid(),
      contextId: NOTEBOOK_MEMORY_CONTEXT_ID,
      strategy: ContextUpdateStrategy.ReplaceSelf,
      text: '',
      createdAt: Date.now(),
    }
  }

  // 确保 notebook store 已加载
  const { useCharacterNotebookStore } = await import('../../character/notebook')
  const notebookStore = useCharacterNotebookStore()
  if (!notebookStore.isLoaded) {
    await notebookStore.loadFromStorage()
  }

  // 构建搜索查询
  let searchQuery = userMessage

  // 如果用户消息很短（少于10个字符），且提供了对话历史，则基于上下文搜索
  if (userMessage.trim().length < 10 && recentMessages && recentMessages.length > 0) {
    // 提取最近3轮对话的关键内容
    const contextMessages = recentMessages
      .slice(-6) // 最近3轮（用户+AI各3条）
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => {
        if (typeof msg.content === 'string') {
          return msg.content
        }
        if (Array.isArray(msg.content)) {
          return msg.content
            .map(part => (typeof part === 'string' ? part : (part && typeof part === 'object' && 'text' in part ? String(part.text ?? '') : '')))
            .join(' ')
        }
        return ''
      })
      .filter(text => text.length > 0)
      .join(' ')

    // 组合当前消息和上下文
    searchQuery = `${contextMessages} ${userMessage}`.slice(0, 500) // 限制长度
  }

  // Search for relevant memories
  const relevantMemories = memoryManager.searchRelevantMemories(searchQuery, 5)

  if (relevantMemories.length === 0) {
    // Return empty context if no relevant memories found
    return {
      id: nanoid(),
      contextId: NOTEBOOK_MEMORY_CONTEXT_ID,
      strategy: ContextUpdateStrategy.ReplaceSelf,
      text: '',
      createdAt: Date.now(),
    }
  }

  // Format memories as context
  const memoryLines = relevantMemories.map((memory) => {
    const tags = memory.tags?.join(', ') || ''
    const importance = memory.metadata?.importance as string | undefined
    const importanceIcon = importance === 'high' ? '⭐' : importance === 'medium' ? '📌' : '💡'

    let memoryText = `${importanceIcon} ${memory.text}`

    // 如果有节点概括，优先显示概括
    const nodeSummaries = memory.metadata?.nodeSummaries as Record<string, string> | undefined
    if (nodeSummaries && Object.keys(nodeSummaries).length > 0) {
      const summaryText = Object.entries(nodeSummaries)
        .map(([node, summary]) => `【${node}】${summary}`)
        .join('; ')
      memoryText += ` [节点概括: ${summaryText}]`
    }

    // 如果有特征时间线，添加到记忆中
    const featureTimeline = memory.metadata?.featureTimeline as Record<string, { firstMentioned: number, text: string }> | undefined
    if (featureTimeline && Object.keys(featureTimeline).length > 0) {
      const featureInfo = Object.entries(featureTimeline)
        .map(([feature, info]) => {
          const date = new Date(info.firstMentioned).toLocaleDateString('zh-CN')
          return `${feature}(首次提及: ${date})`
        })
        .join(', ')
      memoryText += ` [特征: ${featureInfo}]`
    }

    if (tags) {
      memoryText += ` [标签: ${tags}]`
    }

    return memoryText
  })

  const contextText = `相关记忆：\n${memoryLines.join('\n')}`

  return {
    id: nanoid(),
    contextId: NOTEBOOK_MEMORY_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: contextText,
    createdAt: Date.now(),
  }
}
