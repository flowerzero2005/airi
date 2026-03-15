import type { WebSocketEventInputs } from '@proj-airi/server-sdk'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { ChatAssistantMessage, ChatHistoryItem, ChatSlices, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
import type { StreamEvent, StreamOptions } from './llm'

import { createQueue } from '@proj-airi/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { useAnalytics } from '../composables'
import { autoInsertSegmentMarkers, removeSpecialMarkers } from '../composables/auto-segment-markers'
import { useLlmmarkerParser } from '../composables/llm-marker-parser'
import { categorizeResponse, createStreamingCategorizer } from '../composables/response-categoriser'
import { createDatetimeContext, createNotebookMemoryContext } from './chat/context-providers'
import { useChatContextStore } from './chat/context-store'
import { createConversationInitContext } from './chat/conversation-initializer'
import { createChatHooks } from './chat/hooks'
import { useChatSessionStore } from './chat/session-store'
import { useChatStreamStore } from './chat/stream-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'
import { useMemoryAdvancedSettingsStore } from './settings/memory-advanced'

interface SendOptions {
  model: string
  chatProvider: ChatProvider
  providerConfig?: Record<string, unknown>
  attachments?: { type: 'image', data: string, mimeType: string }[]
  tools?: StreamOptions['tools']
  input?: WebSocketEventInputs
}

interface ForkOptions {
  fromSessionId?: string
  atIndex?: number
  reason?: string
  hidden?: boolean
}

interface QueuedSend {
  sendingMessage: string
  options: SendOptions
  generation: number
  sessionId: string
  cancelled?: boolean
  deferred: {
    resolve: () => void
    reject: (error: unknown) => void
  }
}

export const useChatOrchestratorStore = defineStore('chat-orchestrator', () => {
  const llmStore = useLLM()
  const consciousnessStore = useConsciousnessStore()
  const { activeProvider } = storeToRefs(consciousnessStore)
  const { trackFirstMessage } = useAnalytics()

  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const { activeSessionId } = storeToRefs(chatSession)
  const { streamingMessage } = storeToRefs(chatStream)

  const sending = ref(false)
  const pendingQueuedSends = ref<QueuedSend[]>([])
  const hooks = createChatHooks()

  // 消息合并功能：用于累积用户连续发送的消息
  const pendingMessages = ref<string[]>([])
  let mergeTimer: ReturnType<typeof setTimeout> | null = null
  let lastTypingTime = 0

  // 重置消息合并计时器（当用户打字时调用）
  function resetMergeTimer() {
    const advancedSettings = useMemoryAdvancedSettingsStore()

    // 只有在启用消息合并且有待处理消息时才重置
    if (!advancedSettings?.settings?.enableMessageMerging || pendingMessages.value.length === 0) {
      return
    }

    lastTypingTime = Date.now()

    // 清除旧的定时器
    if (mergeTimer) {
      clearTimeout(mergeTimer)
      mergeTimer = null
    }

    // 重新启动定时器
    const generation = chatSession.getSessionGeneration(activeSessionId.value)
    const sessionId = activeSessionId.value

    mergeTimer = setTimeout(() => {
      // 检查是否在最近还有打字活动
      const timeSinceLastTyping = Date.now() - lastTypingTime
      const mergeDelay = advancedSettings.settings.messageMergeDelay || 2500

      // 如果最近还在打字，继续等待
      if (timeSinceLastTyping < mergeDelay) {
        resetMergeTimer()
        return
      }

      // 定时器到期，合并所有待处理消息
      const mergedMessage = pendingMessages.value.join('\n')
      pendingMessages.value = []
      mergeTimer = null

      // 发送合并后的消息给 AI
      sendQueue.enqueue({
        sendingMessage: mergedMessage,
        options: {} as SendOptions, // 这里需要保存原始的 options
        generation,
        sessionId,
        deferred: {
          resolve: () => {},
          reject: () => {},
        },
      })
    }, advancedSettings.settings.messageMergeDelay || 2500)
  }

  const sendQueue = createQueue<QueuedSend>({
    handlers: [
      async ({ data }) => {
        const { sendingMessage, options, generation, deferred, sessionId, cancelled } = data

        if (cancelled)
          return

        if (chatSession.getSessionGeneration(sessionId) !== generation) {
          deferred.reject(new Error('Chat session was reset before send could start'))
          return
        }

        try {
          await performSend(sendingMessage, options, generation, sessionId)
          deferred.resolve()
        }
        catch (error) {
          deferred.reject(error)
        }
      },
    ],
  })

  sendQueue.on('enqueue', (queuedSend) => {
    pendingQueuedSends.value = [...pendingQueuedSends.value, queuedSend]
  })

  sendQueue.on('dequeue', (queuedSend) => {
    pendingQueuedSends.value = pendingQueuedSends.value.filter(item => item !== queuedSend)
  })

  async function performSend(
    sendingMessage: string,
    options: SendOptions,
    generation: number,
    sessionId: string,
  ) {
    if (!sendingMessage && !options.attachments?.length)
      return

    chatSession.ensureSession(sessionId)

    // 对话初始化：在对话开始时注入个性化提示
    // 使用 try-catch 确保功能失败时不影响对话
    try {
      const conversationInitContext = await createConversationInitContext()
      if (conversationInitContext.text) {
        chatContext.ingestContextMessage(conversationInitContext)
      }
    }
    catch (error) {
      // 静默失败，不影响对话
      console.warn('[Chat] Conversation init feature error:', error)
    }

    // Inject current datetime context before composing the message
    chatContext.ingestContextMessage(createDatetimeContext())

    // Inject relevant memories from notebook based on user message
    // Pass recent messages for context-aware search when user message is short
    const memoryContext = await createNotebookMemoryContext(
      sendingMessage,
      chatSession.getSessionMessages(sessionId).slice(-6), // 最近3轮对话
    )
    if (memoryContext.text) {
      chatContext.ingestContextMessage(memoryContext)
    }

    const sendingCreatedAt = Date.now()
    const streamingMessageContext: ChatStreamEventContext = {
      message: { role: 'user', content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() },
      contexts: chatContext.getContextsSnapshot(),
      composedMessage: [],
      input: options.input,
    }

    const isStaleGeneration = () => chatSession.getSessionGeneration(sessionId) !== generation
    const shouldAbort = () => isStaleGeneration()
    if (shouldAbort())
      return

    sending.value = true

    const isForegroundSession = () => sessionId === activeSessionId.value

    // 语义分段：支持多个独立消息气泡
    const buildingMessage: StreamingAssistantMessage = { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now(), id: nanoid() }

    const updateUI = () => {
      if (isForegroundSession()) {
        streamingMessage.value = JSON.parse(JSON.stringify(buildingMessage))
      }
    }

    updateUI()
    trackFirstMessage()

    try {
      await hooks.emitBeforeMessageComposedHooks(sendingMessage, streamingMessageContext)

      const contentParts: CommonContentPart[] = [{ type: 'text', text: sendingMessage }]

      if (options.attachments) {
        for (const attachment of options.attachments) {
          if (attachment.type === 'image') {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.data}`,
              },
            })
          }
        }
      }

      if (!streamingMessageContext.input) {
        streamingMessageContext.input = {
          type: 'input:text',
          data: {
            text: sendingMessage,
          },
        }
      }

      if (shouldAbort())
        return

      const sessionMessagesForSend = chatSession.getSessionMessages(sessionId)
      // 注意：用户消息已经在 ingest() 中添加到会话了，这里不需要再添加
      // sessionMessagesForSend.push({ role: 'user', content: finalContent, createdAt: sendingCreatedAt, id: nanoid() })
      // 立即保存用户消息，避免刷新丢失
      await chatSession.persistSessionMessages(sessionId)

      const categorizer = createStreamingCategorizer(activeProvider.value)
      let streamPosition = 0

      // 自然输出节奏功能：检测句子结束并添加延迟
      let lastCharWasSentenceEnd = false
      const sentenceEndMarkers = ['。', '！', '？', '.', '!', '?']

      // 语义分段功能：检测 <|SEGMENT|> 标记并创建新气泡
      let rawBuffer = '' // 原始文本缓冲区（包含所有标记）

      const parser = useLlmmarkerParser({
        onLiteral: async (literal) => {
          if (shouldAbort())
            return

          categorizer.consume(literal)

          // 累积原始文本（用于后续分段处理）
          rawBuffer += literal

          const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()

          // 如果开启了语义分段，不在流式阶段输出，等 onEnd 统一处理
          if (memoryAdvancedSettings?.settings?.enableSemanticSegmentation) {
            // 什么都不做，等待 onEnd 处理
            return
          }

          // 未开启语义分段，正常流式输出
          const speechOnly = categorizer.filterToSpeech(literal, streamPosition)
          streamPosition += literal.length

          if (speechOnly.trim()) {
            await hooks.emitTokenLiteralHooks(speechOnly, streamingMessageContext)

            buildingMessage.content += speechOnly
            const lastSlice = buildingMessage.slices.at(-1)
            if (lastSlice?.type === 'text') {
              lastSlice.text += speechOnly
            }
            else {
              buildingMessage.slices.push({
                type: 'text',
                text: speechOnly,
              })
            }
            updateUI()

            // 如果开启了自然输出节奏，使用句子停顿逻辑
            if (memoryAdvancedSettings?.settings?.enableNaturalOutput) {
              const delay = memoryAdvancedSettings.settings.naturalOutputDelay || 300
              const trimmedSpeech = speechOnly.trim()
              const endsWithSentenceMarker = trimmedSpeech.length > 0
                && sentenceEndMarkers.some(marker => trimmedSpeech.endsWith(marker))

              if (endsWithSentenceMarker && !lastCharWasSentenceEnd) {
                await new Promise(resolve => setTimeout(resolve, delay))
              }

              lastCharWasSentenceEnd = endsWithSentenceMarker
            }
          }
        },
        onSpecial: async (special) => {
          if (shouldAbort())
            return

          await hooks.emitTokenSpecialHooks(special, streamingMessageContext)
        },
        onEnd: async (fullText) => {
          if (isStaleGeneration())
            return

          const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()

          // 如果开启了语义分段，在这里进行分段处理
          if (memoryAdvancedSettings?.settings?.enableSemanticSegmentation) {
            // 检查 AI 是否输出了 SEGMENT 标记
            const hasMarkers = fullText.includes('<|SEGMENT|>')

            let textWithMarkers = fullText

            // 如果 AI 没有输出标记，自动插入
            if (!hasMarkers) {
              textWithMarkers = autoInsertSegmentMarkers(fullText)
            }

            // 按标记分割文本
            const segments = textWithMarkers.split('<|SEGMENT|>').map(s => s.trim()).filter(s => s)

            // 为每个段落创建独立的气泡
            await new Promise<void>((resolve) => {
              let currentSegmentIndex = 0

              const displayNextSegment = () => {
                if (currentSegmentIndex >= segments.length) {
                  // 所有段落显示完毕，清空状态并标记完成
                  streamingMessage.value = null
                  resolve()
                  return
                }

                const segment = segments[currentSegmentIndex]
                currentSegmentIndex++

                if (!segment || !segment.trim()) {
                  // 跳过空段落，继续下一个
                  displayNextSegment()
                  return
                }

                // 移除特殊标记（ACT、DELAY 等）
                const cleanedSegment = removeSpecialMarkers(segment)

                if (!cleanedSegment.trim()) {
                  displayNextSegment()
                  return
                }

                // 创建消息对象（完整文本）
                const segmentMessage: StreamingAssistantMessage = {
                  role: 'assistant',
                  content: cleanedSegment,
                  slices: [{
                    type: 'text',
                    text: cleanedSegment,
                  }],
                  tool_results: [],
                  createdAt: Date.now(),
                  id: nanoid(),
                  metadata: {
                    typingCompleted: false,
                  },
                }

                // 添加消息到列表
                if (sessionId === activeSessionId.value) {
                  const currentMessages = chatSession.getSessionMessages(sessionId)
                  chatSession.messages = [...currentMessages, segmentMessage]
                }
                else {
                  const sessionMessages = chatSession.getSessionMessages(sessionId)
                  sessionMessages.push(segmentMessage)
                }

                // 计算打字机效果时间（用于延迟下一个气泡）
                const typingSpeed = memoryAdvancedSettings.settings.typingSpeed || 30
                const typingDuration = cleanedSegment.length * typingSpeed

                // 等待打字机效果完成
                setTimeout(() => {
                  // 标记消息为已完成
                  if (segmentMessage.metadata) {
                    segmentMessage.metadata.typingCompleted = true
                  }

                  // 如果还有下一个段落，等待气泡间延迟后继续
                  if (currentSegmentIndex < segments.length) {
                    let bubbleDelay: number

                    // 根据设置决定气泡间延迟时间
                    if (memoryAdvancedSettings.settings.enableAdaptiveBubbleDelay) {
                      // 启用自适应延迟：根据下一个气泡的文字数量决定延迟时间
                      const nextSegment = segments[currentSegmentIndex]
                      const nextCleanedSegment = removeSpecialMarkers(nextSegment || '')
                      const textLength = nextCleanedSegment.length

                      // 计算延迟：基础1.5秒 + 每15字增加0.5秒，最多5秒
                      bubbleDelay = Math.min(5000, 1500 + Math.floor(textLength / 15) * 500)
                    }
                    else {
                      // 使用固定延迟
                      bubbleDelay = memoryAdvancedSettings.settings.bubbleDelayMs || 2000
                    }

                    setTimeout(displayNextSegment, bubbleDelay)
                  }
                  else {
                    // 最后一个段落，清空状态并完成
                    streamingMessage.value = null
                    resolve()
                  }
                }, typingDuration)
              }

              // 开始显示第一个段落
              displayNextSegment()
            })

            return
          }

          // 未开启语义分段，正常处理
          const finalCategorization = categorizeResponse(fullText, activeProvider.value)
          buildingMessage.categorization = {
            speech: finalCategorization.speech,
            reasoning: finalCategorization.reasoning,
          }
          updateUI()
        },
        minLiteralEmitLength: 24,
      })

      const toolCallQueue = createQueue<ChatSlices>({
        handlers: [
          async (ctx) => {
            if (shouldAbort())
              return
            if (ctx.data.type === 'tool-call') {
              buildingMessage.slices.push(ctx.data)
              updateUI()
              return
            }

            if (ctx.data.type === 'tool-call-result') {
              buildingMessage.tool_results.push(ctx.data)
              updateUI()
            }
          },
        ],
      })

      let newMessages = sessionMessagesForSend.map((msg) => {
        const { context: _context, id: _id, createdAt: _createdAt, ...withoutContext } = msg
        const rawMessage = toRaw(withoutContext)

        if (rawMessage.role === 'assistant') {
          const { slices: _slices, tool_results: _toolResults, categorization: _categorization, ...rest } = rawMessage as ChatAssistantMessage
          return toRaw(rest)
        }

        return rawMessage
      })

      const contextsSnapshot = chatContext.getContextsSnapshot()
      if (Object.keys(contextsSnapshot).length > 0) {
        const system = newMessages.slice(0, 1)
        const afterSystem = newMessages.slice(1, newMessages.length)

        // Format contexts: extract text from each context message
        const contextTexts = Object.entries(contextsSnapshot)
          .map(([key, messages]) => {
            const texts = messages
              .map(msg => msg.text)
              .filter(text => text && text.trim().length > 0)
              .join('\n')
            return texts ? `[${key}]\n${texts}` : ''
          })
          .filter(text => text.length > 0)
          .join('\n\n')

        if (contextTexts) {
          newMessages = [
            ...system,
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Contextual information from other modules:\n\n${contextTexts}\n`,
                },
              ],
            },
            ...afterSystem,
          ]
        }
      }

      streamingMessageContext.composedMessage = newMessages as Message[]

      try {
        await hooks.emitAfterMessageComposedHooks(sendingMessage, streamingMessageContext)
      }
      catch (error) {
        console.error('[Chat] emitAfterMessageComposedHooks failed, but continuing:', error)
      }

      try {
        await hooks.emitBeforeSendHooks(sendingMessage, streamingMessageContext)
      }
      catch (error) {
        console.error('[Chat] emitBeforeSendHooks failed, but continuing:', error)
      }

      let fullText = ''
      const headers = (options.providerConfig?.headers || {}) as Record<string, string>

      if (shouldAbort())
        return

      await llmStore.stream(options.model, options.chatProvider, newMessages as Message[], {
        headers,
        tools: options.tools,
        // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
        // the final non-tool finish to avoid ending the chat turn with no assistant reply.
        waitForTools: true,
        onStreamEvent: async (event: StreamEvent) => {
          switch (event.type) {
            case 'tool-call':
              toolCallQueue.enqueue({
                type: 'tool-call',
                toolCall: event,
              })

              break
            case 'tool-result':
              toolCallQueue.enqueue({
                type: 'tool-call-result',
                id: event.toolCallId,
                result: event.result,
              })

              break
            case 'text-delta':
              fullText += event.text
              await parser.consume(event.text)

              // 定期保存 AI 回复（每100个字符保存一次）
              if (fullText.length % 100 < event.text.length && buildingMessage.slices.length > 0) {
                if (!sessionMessagesForSend.find(m => m.id === buildingMessage.id)) {
                  sessionMessagesForSend.push(toRaw(buildingMessage))
                }
                // 不等待保存完成，避免阻塞流式输出
                chatSession.persistSessionMessages(sessionId).catch((err) => {
                  console.error('[Chat] Failed to persist during streaming:', err)
                })
              }
              break
            case 'finish':
              // AI 输出完毕，如果只有工具调用没有文本，标记为完成
              // 这样可以避免加载框一直显示
              const hasText = buildingMessage.slices.some(s => s.type === 'text' && (s as any).text?.trim())
              if (!hasText && buildingMessage.slices.length > 0) {
                // 只有工具调用，没有文本输出，添加一个空文本标记表示已完成
                buildingMessage.slices.push({
                  type: 'text',
                  text: '',
                })
                updateUI()
              }
              break
            case 'error':
              throw event.error ?? new Error('Stream error')
          }
        },
      })

      await parser.end()

      if (!isStaleGeneration() && buildingMessage.slices.length > 0) {
        // 检查消息是否已经在流式输出过程中被添加过
        if (!sessionMessagesForSend.find(m => m.id === buildingMessage.id)) {
          sessionMessagesForSend.push(toRaw(buildingMessage))
        }

        // 立即清空 streamingMessage，避免在 messages 中已有消息时重复渲染
        if (isForegroundSession()) {
          streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [] }
        }

        await chatSession.persistSessionMessages(sessionId)
      }

      await hooks.emitStreamEndHooks(streamingMessageContext)
      await hooks.emitAssistantResponseEndHooks(fullText, streamingMessageContext)

      await hooks.emitAfterSendHooks(sendingMessage, streamingMessageContext)
      await hooks.emitAssistantMessageHooks({ ...buildingMessage }, fullText, streamingMessageContext)

      await hooks.emitChatTurnCompleteHooks({
        output: { ...buildingMessage },
        outputText: fullText,
        toolCalls: sessionMessagesForSend.filter(msg => msg.role === 'tool') as ToolMessage[],
      }, streamingMessageContext)

      // streamingMessage 已经在添加到 messages 后立即清空，这里不需要再清空
    }
    catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
    finally {
      sending.value = false
    }
  }

  async function ingest(
    sendingMessage: string,
    options: SendOptions,
    targetSessionId?: string,
  ) {
    const sessionId = targetSessionId || activeSessionId.value
    const generation = chatSession.getSessionGeneration(sessionId)

    // 立即在界面显示用户消息（不等待合并）
    const userMessageId = nanoid()
    const userMessageCreatedAt = Date.now()
    const userMessage: ChatHistoryItem = {
      role: 'user',
      content: sendingMessage,
      createdAt: userMessageCreatedAt,
      id: userMessageId,
    }

    // 立即添加到会话消息列表并显示
    // 只有当前活动会话才需要立即显示
    if (sessionId === activeSessionId.value) {
      chatSession.messages.push(userMessage)
    }
    else {
      const sessionMessages = chatSession.getSessionMessages(sessionId)
      sessionMessages.push(userMessage)
      await chatSession.persistSessionMessages(sessionId)
    }

    // 消息合并功能：当用户连续发送多条消息时，智能合并后一起处理
    // 使用 try-catch 确保功能失败时不影响正常发送
    try {
      const advancedSettings = useMemoryAdvancedSettingsStore()

      // 如果开启了消息合并功能
      if (advancedSettings?.settings?.enableMessageMerging) {
        // 将新消息添加到待处理队列
        pendingMessages.value.push(sendingMessage)

        // 清除旧的定时器
        if (mergeTimer) {
          clearTimeout(mergeTimer)
          mergeTimer = null
        }

        // 启动新的定时器（后台等待，不阻塞界面显示）
        return new Promise<void>((resolve, reject) => {
          mergeTimer = setTimeout(() => {
            // 定时器到期，合并所有待处理消息
            const mergedMessage = pendingMessages.value.join('\n')
            pendingMessages.value = []
            mergeTimer = null

            // 发送合并后的消息给 AI
            sendQueue.enqueue({
              sendingMessage: mergedMessage,
              options,
              generation,
              sessionId,
              deferred: { resolve, reject },
            })
          }, advancedSettings.settings.messageMergeDelay || 2500)
        })
      }
    }
    catch (error) {
      // 静默失败，不影响正常发送
      console.warn('[Chat] Message merging feature error:', error)
    }

    // 如果未开启消息合并或功能出错，直接发送
    return new Promise<void>((resolve, reject) => {
      sendQueue.enqueue({
        sendingMessage,
        options,
        generation,
        sessionId,
        deferred: { resolve, reject },
      })
    })
  }

  async function ingestOnFork(
    sendingMessage: string,
    options: SendOptions,
    forkOptions?: ForkOptions,
  ) {
    const baseSessionId = forkOptions?.fromSessionId ?? activeSessionId.value
    if (!forkOptions)
      return ingest(sendingMessage, options, baseSessionId)

    const forkSessionId = await chatSession.forkSession({
      fromSessionId: baseSessionId,
      atIndex: forkOptions.atIndex,
      reason: forkOptions.reason,
      hidden: forkOptions.hidden,
    })
    return ingest(sendingMessage, options, forkSessionId || baseSessionId)
  }

  function cancelPendingSends(sessionId?: string) {
    for (const queued of pendingQueuedSends.value) {
      if (sessionId && queued.sessionId !== sessionId)
        continue

      queued.cancelled = true
      queued.deferred.reject(new Error('Chat session was reset before send could start'))
    }

    pendingQueuedSends.value = sessionId
      ? pendingQueuedSends.value.filter(item => item.sessionId !== sessionId)
      : []
  }

  return {
    sending,

    discoverToolsCompatibility: llmStore.discoverToolsCompatibility,

    ingest,
    ingestOnFork,
    cancelPendingSends,
    resetMergeTimer,

    clearHooks: hooks.clearHooks,

    emitBeforeMessageComposedHooks: hooks.emitBeforeMessageComposedHooks,
    emitAfterMessageComposedHooks: hooks.emitAfterMessageComposedHooks,
    emitBeforeSendHooks: hooks.emitBeforeSendHooks,
    emitAfterSendHooks: hooks.emitAfterSendHooks,
    emitTokenLiteralHooks: hooks.emitTokenLiteralHooks,
    emitTokenSpecialHooks: hooks.emitTokenSpecialHooks,
    emitStreamEndHooks: hooks.emitStreamEndHooks,
    emitAssistantResponseEndHooks: hooks.emitAssistantResponseEndHooks,
    emitAssistantMessageHooks: hooks.emitAssistantMessageHooks,
    emitChatTurnCompleteHooks: hooks.emitChatTurnCompleteHooks,

    onBeforeMessageComposed: hooks.onBeforeMessageComposed,
    onAfterMessageComposed: hooks.onAfterMessageComposed,
    onBeforeSend: hooks.onBeforeSend,
    onAfterSend: hooks.onAfterSend,
    onTokenLiteral: hooks.onTokenLiteral,
    onTokenSpecial: hooks.onTokenSpecial,
    onStreamEnd: hooks.onStreamEnd,
    onAssistantResponseEnd: hooks.onAssistantResponseEnd,
    onAssistantMessage: hooks.onAssistantMessage,
    onChatTurnComplete: hooks.onChatTurnComplete,
  }
})
