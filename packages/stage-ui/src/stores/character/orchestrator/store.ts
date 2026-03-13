import type { WebSocketBaseEvent, WebSocketEventOf, WebSocketEvents } from '@proj-airi/server-sdk'

import { defineStore, storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

import { useCharacterNotebookStore, useCharacterStore } from '../'
import { useLLM } from '../../llm'
import { useModsServerChannelStore } from '../../mods/api/channel-server'
import { useConsciousnessStore } from '../../modules/consciousness'
import { useProvidersStore } from '../../providers'
import { useMemoryAdvancedSettingsStore } from '../../settings/memory-advanced'
import { setupAgentSparkNotifyHandler } from './agents/event-handler-spark-notify'

export { sparkCommandSchema } from './agents/event-handler-spark-notify'

export const useCharacterOrchestratorStore = defineStore('character-orchestrator', () => {
  const { stream } = useLLM()
  const { activeProvider, activeModel } = storeToRefs(useConsciousnessStore())
  const providersStore = useProvidersStore()
  const characterStore = useCharacterStore()
  const notebookStore = useCharacterNotebookStore()
  const { systemPrompt } = storeToRefs(characterStore)
  const modsServerChannelStore = useModsServerChannelStore()

  const processing = ref(false)
  const pendingNotifies = ref<Array<WebSocketEventOf<'spark:notify'>>>([])
  const scheduledNotifies = ref<Array<{
    event: WebSocketEventOf<'spark:notify'>
    enqueuedAt: number
    nextRunAt: number
    attempts: number
    maxAttempts: number
    reason?: string
  }>>([])
  const attentionConfig = ref({
    tickIntervalMs: 2_000,
    taskNotifyWindowMs: 60_000,
    requeueDelayMs: 30_000,
    maxAttempts: 3,
  })
  let tickTimer: ReturnType<typeof setInterval> | undefined
  let proactiveTopicTimer: ReturnType<typeof setInterval> | undefined
  const lastProactiveTopicTime = ref<number>(0)
  const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()
  const sparkNotifyAgent = setupAgentSparkNotifyHandler({
    stream,
    getActiveProvider: () => activeProvider.value,
    getActiveModel: () => activeModel.value,
    getProviderInstance: name => providersStore.getProviderInstance(name),
    onReactionDelta: (eventId, text) => characterStore.onSparkNotifyReactionStreamEvent(eventId, text),
    onReactionEnd: (eventId, text) => characterStore.onSparkNotifyReactionStreamEnd(eventId, text),
    getSystemPrompt: () => systemPrompt.value,
    getProcessing: () => processing.value,
    setProcessing: next => processing.value = next,
    getPending: () => pendingNotifies.value,
    setPending: next => pendingNotifies.value = next,
  })

  function computeNextRunAt(event: WebSocketEventOf<'spark:notify'>, attempts: number) {
    const now = Date.now()
    const baseDelay = (() => {
      switch (event.data.urgency) {
        case 'immediate':
          return 0
        case 'soon':
          return 10_000
        case 'later':
          return 60_000
        default:
          return 30_000
      }
    })()

    return now + baseDelay + (attempts * attentionConfig.value.requeueDelayMs)
  }

  function removePending(eventId: string) {
    pendingNotifies.value = pendingNotifies.value.filter(item => item.data.id !== eventId)
  }

  function enqueueSparkNotify(event: WebSocketEventOf<'spark:notify'>, options?: { reason?: string, nextRunAt?: number, maxAttempts?: number }) {
    if (!pendingNotifies.value.find(item => item.data.id === event.data.id)) {
      pendingNotifies.value = [...pendingNotifies.value, event]
    }

    scheduledNotifies.value = [...scheduledNotifies.value, {
      event,
      enqueuedAt: Date.now(),
      nextRunAt: options?.nextRunAt ?? computeNextRunAt(event, 0),
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? attentionConfig.value.maxAttempts,
      reason: options?.reason,
    }]
  }

  async function processSparkNotify(event: WebSocketEventOf<'spark:notify'>) {
    const result = await sparkNotifyAgent.handle(event)
    if (!result?.commands?.length)
      return result

    for (const command of result.commands) {
      modsServerChannelStore.send({
        type: 'spark:command',
        data: command,
      })
    }

    return result
  }

  async function handleIncomingSparkNotify(event: WebSocketEventOf<'spark:notify'>) {
    if (event.data.urgency === 'immediate' && !processing.value) {
      return await processSparkNotify(event)
    }

    enqueueSparkNotify(event, { reason: 'spark:notify' })
    return undefined
  }

  function enqueueDueTasks(now: number) {
    const dueTasks = notebookStore.getDueTasks(now, attentionConfig.value.taskNotifyWindowMs)
    if (!dueTasks.length)
      return

    for (const task of dueTasks) {
      const event: WebSocketEventOf<'spark:notify'> = {
        type: 'spark:notify',
        source: 'character:task-scheduler',
        data: {
          id: `task-${task.id}`,
          eventId: task.id,
          kind: 'reminder',
          urgency: task.priority === 'critical' ? 'immediate' : 'soon',
          headline: `Task reminder: ${task.title}`,
          note: task.details,
          destinations: ['character'],
          payload: {
            taskId: task.id,
            dueAt: task.dueAt,
            priority: task.priority,
          },
        },
      }

      enqueueSparkNotify(event, { reason: 'task:due' })
      notebookStore.markTaskNotified(task.id, now + attentionConfig.value.requeueDelayMs)
    }
  }

  function isWithinAllowedTimeRange(now: number): boolean {
    const { start, end } = memoryAdvancedSettings.settings.proactiveTimeRange
    const currentHour = new Date(now).getHours()

    if (start <= end) {
      return currentHour >= start && currentHour < end
    }
    else {
      // Handle overnight range (e.g., 22:00 - 9:00)
      return currentHour >= start || currentHour < end
    }
  }

  function generateProactiveTopic(now: number) {
    if (!memoryAdvancedSettings.settings.enableProactiveTopic)
      return

    if (!isWithinAllowedTimeRange(now)) {
      console.log('[Proactive Topic] Outside allowed time range, skipping')
      return
    }

    // 创建一个主动话题事件，让 AI 根据记忆和上下文自己决定说什么
    const event: WebSocketEventOf<'spark:notify'> = {
      type: 'spark:notify',
      source: 'character:proactive-topic',
      data: {
        id: `proactive-${now}`,
        eventId: `proactive-${now}`,
        kind: 'chat',
        urgency: 'later',
        headline: 'Time to initiate a proactive conversation',
        note: [
          'You notice that the user hasn\'t said anything for a while.',
          'Based on your memories and recent conversations, think about what would be a good topic to bring up.',
          'You can:',
          '- Ask about something they mentioned before',
          '- Share something interesting you thought of',
          '- Check how they\'re doing with something they were working on',
          '- Remind them of something they might have forgotten',
          '- Just start a casual conversation about anything',
          '',
          'Be natural and spontaneous. Don\'t force it if you don\'t have anything meaningful to say.',
          'You can also use the builtIn_sparkNoResponse tool if you feel it\'s not a good time to talk.',
        ].join('\n'),
        destinations: ['character'],
        payload: {
          timestamp: now,
          type: 'proactive-conversation',
        },
      },
    }

    console.log('[Proactive Topic] Triggered proactive conversation check')
    enqueueSparkNotify(event, { reason: 'proactive-topic' })
  }

  async function tick() {
    if (processing.value)
      return

    const now = Date.now()
    enqueueDueTasks(now)

    const nextIndex = scheduledNotifies.value.findIndex(item => item.nextRunAt <= now)
    if (nextIndex < 0)
      return

    const [next] = scheduledNotifies.value.splice(nextIndex, 1)
    removePending(next.event.data.id)

    try {
      await processSparkNotify(next.event)
    }
    catch (error) {
      if (next.attempts + 1 < next.maxAttempts) {
        scheduledNotifies.value = [...scheduledNotifies.value, {
          ...next,
          attempts: next.attempts + 1,
          nextRunAt: computeNextRunAt(next.event, next.attempts + 1),
        }]
        pendingNotifies.value = [...pendingNotifies.value, next.event]
      }
      else {
        console.warn('Dropped spark:notify after max attempts:', error)
      }
    }
  }

  function startTicker() {
    if (tickTimer)
      return

    tickTimer = setInterval(() => {
      void tick()
    }, attentionConfig.value.tickIntervalMs)
  }

  function stopTicker() {
    if (!tickTimer)
      return

    clearInterval(tickTimer)
    tickTimer = undefined
  }

  function startProactiveTopicTimer() {
    if (proactiveTopicTimer)
      return

    if (!memoryAdvancedSettings.settings.enableProactiveTopic)
      return

    const getNextInterval = () => {
      if (memoryAdvancedSettings.settings.proactiveRandomInterval) {
        const min = memoryAdvancedSettings.settings.proactiveMinInterval
        const max = memoryAdvancedSettings.settings.proactiveMaxInterval
        const randomMinutes = Math.random() * (max - min) + min
        return randomMinutes * 60 * 1000
      }
      else {
        return memoryAdvancedSettings.settings.proactiveCheckInterval * 60 * 1000
      }
    }

    const scheduleNext = () => {
      const intervalMs = getNextInterval()
      const intervalMinutes = (intervalMs / 60000).toFixed(1)
      console.log(`[Proactive Topic] Next check in ${intervalMinutes} minutes`)

      proactiveTopicTimer = setTimeout(() => {
        const now = Date.now()
        generateProactiveTopic(now)
        scheduleNext() // Schedule the next one
      }, intervalMs) as any
    }

    console.log('[Proactive Topic] Timer started')
    scheduleNext()
  }

  function stopProactiveTopicTimer() {
    if (!proactiveTopicTimer)
      return

    console.log('[Proactive Topic] Timer stopped')
    clearTimeout(proactiveTopicTimer as any)
    proactiveTopicTimer = undefined
  }

  // Watch for settings changes
  watch(
    () => memoryAdvancedSettings.settings.enableProactiveTopic,
    (enabled) => {
      if (enabled) {
        startProactiveTopicTimer()
      }
      else {
        stopProactiveTopicTimer()
      }
    },
    { immediate: true },
  )

  watch(
    () => [
      memoryAdvancedSettings.settings.proactiveCheckInterval,
      memoryAdvancedSettings.settings.proactiveRandomInterval,
      memoryAdvancedSettings.settings.proactiveMinInterval,
      memoryAdvancedSettings.settings.proactiveMaxInterval,
    ],
    () => {
      if (memoryAdvancedSettings.settings.enableProactiveTopic) {
        stopProactiveTopicTimer()
        startProactiveTopicTimer()
      }
    },
  )

  async function handleSparkEmit(_: WebSocketBaseEvent<'spark:emit', WebSocketEvents['spark:emit']>) {
    // Currently no-op
    return undefined
  }

  function initialize() {
    modsServerChannelStore.onEvent('spark:notify', async (event) => {
      try {
        await handleIncomingSparkNotify(event)
      }
      catch (error) {
        console.warn('Failed to handle spark:notify event:', error)
      }
    })

    modsServerChannelStore.onEvent('spark:emit', async (event) => {
      try {
        await handleSparkEmit(event)
      }
      catch (error) {
        console.warn('Failed to handle spark:emit event:', error)
      }
    })

    startTicker()
    startProactiveTopicTimer()
  }

  return {
    processing,
    pendingNotifies,
    scheduledNotifies,
    attentionConfig,
    lastProactiveTopicTime,

    initialize,
    startTicker,
    stopTicker,
    startProactiveTopicTimer,
    stopProactiveTopicTimer,

    handleSparkNotify: handleIncomingSparkNotify,
    handleSparkEmit,
  }
})
