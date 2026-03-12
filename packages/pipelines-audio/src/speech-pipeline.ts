import type { Eventa } from '@moeru/eventa'

import type { SpeechPipelineEventName } from './eventa'
import type {
  IntentHandle,
  IntentOptions,
  LoggerLike,
  PlaybackItem,
  SpeechPipelineEvents,
  TextSegment,
  TextToken,
  TtsRequest,
  TtsResult,
} from './types'

import { createContext } from '@moeru/eventa'

import { speechPipelineEventMap } from './eventa'
import { createPriorityResolver } from './priority'
import { createTtsSegmentStream } from './processors/tts-chunker'
import { createPushStream } from './stream'

export interface BufferingOptions {
  enabled: boolean
  minSegments?: number // 最少缓冲片段数，达到后可以开始播放
  timeout?: number // 超时自动播放（ms），防止等待过久
}

export interface SpeechPipelineOptions<TAudio> {
  tts: (request: TtsRequest, signal: AbortSignal) => Promise<TAudio | null>
  playback: {
    schedule: (item: PlaybackItem<TAudio>) => void
    stopAll: (reason: string) => void
    stopByIntent: (intentId: string, reason: string) => void
    stopByOwner: (ownerId: string, reason: string) => void
    onStart: (listener: (event: { item: PlaybackItem<TAudio>, startedAt: number }) => void) => void
    onEnd: (listener: (event: { item: PlaybackItem<TAudio>, endedAt: number }) => void) => void
    onInterrupt: (listener: (event: { item: PlaybackItem<TAudio>, reason: string, interruptedAt: number }) => void) => void
    onReject: (listener: (event: { item: PlaybackItem<TAudio>, reason: string }) => void) => void
  }
  logger?: LoggerLike
  priority?: ReturnType<typeof createPriorityResolver>
  segmenter?: (tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string }) => ReadableStream<TextSegment>
  buffering?: BufferingOptions // 新增：音频缓冲配置
}

interface IntentState {
  intentId: string
  streamId: string
  priority: number
  ownerId?: string
  behavior: 'queue' | 'interrupt' | 'replace'
  createdAt: number
  controller: AbortController
  stream: ReadableStream<TextToken>
  closeStream: () => void
  canceled: boolean
}

// 音频缓冲管理器
interface BufferState<TAudio> {
  intentId: string
  segments: Array<PlaybackItem<TAudio>>
  timer?: ReturnType<typeof setTimeout>
  startTime: number
  flushed: boolean
}

class BufferManager<TAudio> {
  private buffers = new Map<string, BufferState<TAudio>>()
  private config: Required<BufferingOptions>
  private logger: LoggerLike
  private schedulePlayback: (item: PlaybackItem<TAudio>) => void

  constructor(
    config: BufferingOptions,
    logger: LoggerLike,
    schedulePlayback: (item: PlaybackItem<TAudio>) => void,
  ) {
    this.config = {
      enabled: config.enabled,
      minSegments: config.minSegments ?? 5,
      timeout: config.timeout ?? 3000,
    }
    this.logger = logger
    this.schedulePlayback = schedulePlayback
  }

  createBuffer(intentId: string): void {
    if (this.buffers.has(intentId)) {
      return
    }

    const buffer: BufferState<TAudio> = {
      intentId,
      segments: [],
      startTime: Date.now(),
      flushed: false,
    }

    this.buffers.set(intentId, buffer)

    // 设置超时自动 flush
    if (this.config.timeout > 0) {
      buffer.timer = setTimeout(() => {
        this.logger.debug(`[BufferManager] Buffer timeout for intent ${intentId}`)
        this.flush(intentId, 'timeout')
      }, this.config.timeout)
    }
  }

  addSegment(intentId: string, item: PlaybackItem<TAudio>): void {
    const buffer = this.buffers.get(intentId)
    if (!buffer) {
      this.logger.warn(`[BufferManager] No buffer found for intent ${intentId}`)
      return
    }

    if (buffer.flushed) {
      // 已经 flush 过，直接播放
      this.schedulePlayback(item)
      return
    }

    buffer.segments.push(item)

    // 检查是否达到最小片段数
    if (buffer.segments.length >= this.config.minSegments) {
      this.logger.debug(`[BufferManager] Reached min segments (${this.config.minSegments}) for intent ${intentId}`)
      // 达到最小片段数，可以开始播放了
      // 但不立即 flush，等待 intent 结束或超时
    }
  }

  flush(intentId: string, reason: string = 'manual'): void {
    const buffer = this.buffers.get(intentId)
    if (!buffer || buffer.flushed) {
      return
    }

    buffer.flushed = true

    // 清除超时定时器
    if (buffer.timer) {
      clearTimeout(buffer.timer)
      buffer.timer = undefined
    }

    const segmentCount = buffer.segments.length
    if (segmentCount === 0) {
      this.logger.debug(`[BufferManager] No segments to flush for intent ${intentId}`)
      this.buffers.delete(intentId)
      return
    }

    this.logger.info(`[BufferManager] Flushing ${segmentCount} segments for intent ${intentId} (reason: ${reason})`)

    // 按顺序快速调度所有片段
    buffer.segments.forEach((item) => {
      this.schedulePlayback(item)
    })

    this.buffers.delete(intentId)
  }

  clear(intentId: string): void {
    const buffer = this.buffers.get(intentId)
    if (!buffer) {
      return
    }

    if (buffer.timer) {
      clearTimeout(buffer.timer)
    }

    this.buffers.delete(intentId)
    this.logger.debug(`[BufferManager] Cleared buffer for intent ${intentId}`)
  }

  clearAll(): void {
    this.buffers.forEach((buffer) => {
      if (buffer.timer) {
        clearTimeout(buffer.timer)
      }
    })
    this.buffers.clear()
    this.logger.debug('[BufferManager] Cleared all buffers')
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSpeechPipeline<TAudio>(options: SpeechPipelineOptions<TAudio>) {
  const logger = options.logger ?? console
  const priorityResolver = options.priority ?? createPriorityResolver()
  const segmenter = options.segmenter ?? createTtsSegmentStream
  const context = createContext()

  const intents = new Map<string, IntentState>()
  const pending: IntentState[] = []
  let activeIntent: IntentState | null = null

  // 创建缓冲管理器（如果启用）
  const bufferingEnabled = options.buffering?.enabled ?? false
  const bufferManager = bufferingEnabled
    ? new BufferManager<TAudio>(
        options.buffering!,
        logger,
        options.playback.schedule,
      )
    : null

  options.playback.onStart(event => context.emit(speechPipelineEventMap.onPlaybackStart, event))
  options.playback.onEnd(event => context.emit(speechPipelineEventMap.onPlaybackEnd, event))
  options.playback.onInterrupt(event => context.emit(speechPipelineEventMap.onPlaybackInterrupt, event))
  options.playback.onReject(event => context.emit(speechPipelineEventMap.onPlaybackReject, event))

  function enqueueIntent(intent: IntentState) {
    pending.push(intent)
  }

  function pickNextIntent() {
    if (pending.length === 0)
      return null
    pending.sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt))
    return pending.shift() ?? null
  }

  async function runIntent(intent: IntentState) {
    activeIntent = intent
    context.emit(speechPipelineEventMap.onIntentStart, intent.intentId)

    // 如果启用缓冲，创建缓冲区
    if (bufferManager) {
      bufferManager.createBuffer(intent.intentId)
    }

    const tokenStream = intent.stream
    const segmentStream = segmenter(tokenStream, { streamId: intent.streamId, intentId: intent.intentId })

    try {
      const reader = segmentStream.getReader()

      while (true) {
        const { value, done } = await reader.read()
        if (done)
          break
        if (!value)
          continue
        if (intent.canceled || intent.controller.signal.aborted) {
          await reader.cancel()
          break
        }

        context.emit(speechPipelineEventMap.onSegment, value)

        if (value.text === '' && value.special) {
          context.emit(speechPipelineEventMap.onSpecial, value)
          continue
        }

        const request: TtsRequest = {
          streamId: value.streamId,
          intentId: value.intentId,
          segmentId: value.segmentId,
          text: value.text,
          special: value.special,
          priority: intent.priority,
          createdAt: Date.now(),
        }

        context.emit(speechPipelineEventMap.onTtsRequest, request)

        let audio: TAudio | null = null
        try {
          audio = await options.tts(request, intent.controller.signal)
        }
        catch (err) {
          logger.warn('TTS generation failed:', err)
          if (intent.controller.signal.aborted)
            break
          continue
        }

        if (intent.controller.signal.aborted)
          break

        if (!audio)
          continue

        const ttsResult: TtsResult<TAudio> = {
          streamId: request.streamId,
          intentId: request.intentId,
          segmentId: request.segmentId,
          text: request.text,
          special: request.special,
          audio,
          createdAt: Date.now(),
        }

        context.emit(speechPipelineEventMap.onTtsResult, ttsResult)

        const playbackItem: PlaybackItem<TAudio> = {
          id: createId('playback'),
          streamId: ttsResult.streamId,
          intentId: ttsResult.intentId,
          segmentId: ttsResult.segmentId,
          ownerId: intent.ownerId,
          priority: intent.priority,
          text: ttsResult.text,
          special: ttsResult.special,
          audio: ttsResult.audio,
          createdAt: Date.now(),
        }

        // 根据是否启用缓冲决定播放策略
        if (bufferManager) {
          // 缓冲模式：添加到缓冲区
          bufferManager.addSegment(intent.intentId, playbackItem)
        }
        else {
          // 流式模式：立即播放（原有行为）
          options.playback.schedule(playbackItem)
        }
      }

      reader.releaseLock()
    }
    catch (err) {
      logger.warn('Speech pipeline intent failed:', err)
    }
    finally {
      // Flush buffer when intent ends
      if (bufferManager && !intent.canceled) {
        bufferManager.flush(intent.intentId, 'intent-end')
      }
      else if (bufferManager) {
        bufferManager.clear(intent.intentId)
      }

      if (intent.canceled) {
        context.emit(speechPipelineEventMap.onIntentCancel, { intentId: intent.intentId, reason: intent.controller.signal.reason as string | undefined })
      }
      else {
        context.emit(speechPipelineEventMap.onIntentEnd, intent.intentId)
      }

      intents.delete(intent.intentId)
      activeIntent = null

      const next = pickNextIntent()
      if (next)
        void runIntent(next)
    }
  }

  function openIntent(optionsInput?: IntentOptions): IntentHandle {
    const intentId = optionsInput?.intentId ?? createId('intent')
    const streamId = optionsInput?.streamId ?? createId('stream')
    const priority = priorityResolver.resolve(optionsInput?.priority)
    const behavior = optionsInput?.behavior ?? 'queue'
    const ownerId = optionsInput?.ownerId

    const controller = new AbortController()
    const { stream, write, close } = createPushStream<TextToken>()
    let sequence = 0

    const intent: IntentState = {
      intentId,
      streamId,
      priority,
      ownerId,
      behavior,
      createdAt: Date.now(),
      controller,
      stream,
      closeStream: close,
      canceled: false,
    }

    intents.set(intentId, intent)

    const handle: IntentHandle = {
      intentId,
      streamId,
      priority,
      ownerId,
      stream,
      writeLiteral(text: string) {
        if (intent.canceled)
          return
        write({
          type: 'literal',
          value: text,
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
        })
      },
      writeSpecial(special: string) {
        if (intent.canceled)
          return
        write({
          type: 'special',
          value: special,
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
        })
      },
      writeFlush() {
        if (intent.canceled)
          return
        write({
          type: 'flush',
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
        })
      },
      end() {
        close()
      },
      cancel(reason?: string) {
        cancelIntent(intentId, reason)
      },
    }

    if (!activeIntent) {
      void runIntent(intent)
      return handle
    }

    if (behavior === 'replace') {
      cancelIntent(activeIntent.intentId, 'replace')
      void runIntent(intent)
      return handle
    }

    if (behavior === 'interrupt' && intent.priority >= activeIntent.priority) {
      cancelIntent(activeIntent.intentId, 'interrupt')
      void runIntent(intent)
      return handle
    }

    enqueueIntent(intent)
    return handle
  }

  function cancelIntent(intentId: string, reason?: string) {
    const intent = intents.get(intentId)
    if (!intent)
      return
    intent.canceled = true
    intent.controller.abort(reason ?? 'canceled')
    intent.closeStream()

    if (activeIntent?.intentId === intentId) {
      options.playback.stopByIntent(intentId, reason ?? 'canceled')
      return
    }

    const index = pending.findIndex(item => item.intentId === intentId)
    if (index >= 0)
      pending.splice(index, 1)
  }

  function interrupt(reason: string) {
    if (activeIntent)
      cancelIntent(activeIntent.intentId, reason)
  }

  function stopAll(reason: string) {
    for (const intent of intents.values()) {
      intent.canceled = true
      intent.controller.abort(reason)
      intent.closeStream()
    }
    pending.length = 0
    intents.clear()
    activeIntent = null
    options.playback.stopAll(reason)
  }

  return {
    openIntent,
    cancelIntent,
    interrupt,
    stopAll,
    on<K extends SpeechPipelineEventName>(event: K, listener: SpeechPipelineEvents<TAudio>[K]) {
      return context.on(speechPipelineEventMap[event] as Eventa<any>, (payload) => {
        listener(payload?.body ?? payload)
      })
    },
  }
}
