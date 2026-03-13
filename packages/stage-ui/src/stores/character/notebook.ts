import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { notebookRepo } from '../../database/repos/notebook.repo'
import { useMemoryAdvancedSettingsStore } from '../settings/memory-advanced'
import { useUserIdentityStore } from '../user-identity'

export type NotebookEntryKind = 'note' | 'diary' | 'focus'

export interface NotebookEntry {
  id: string
  kind: NotebookEntryKind
  text: string
  createdAt: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'
export type TaskStatus = 'queued' | 'scheduled' | 'done' | 'dropped'

export interface ScheduledTask {
  id: string
  title: string
  details?: string
  priority: TaskPriority
  status: TaskStatus
  dueAt?: number
  createdAt: number
  updatedAt: number
  lastNotifiedAt?: number
  nextNotifyAt?: number
  metadata?: Record<string, unknown>
}

export const useCharacterNotebookStore = defineStore('character-notebook', () => {
  const entries = ref<NotebookEntry[]>([])
  const tasks = ref<ScheduledTask[]>([])
  const isLoaded = ref(false)
  const isSaving = ref(false)

  // 动态 characterId：根据多用户配置决定使用哪个用户 ID
  const characterId = computed(() => {
    const advancedSettings = useMemoryAdvancedSettingsStore()
    const userIdentity = useUserIdentityStore()

    // 如果启用多用户功能，使用当前用户 ID
    if (advancedSettings.settings.enableMultiUser) {
      return userIdentity.currentUserId
    }

    // 否则使用默认用户
    return 'default'
  })

  const partitionDiary = computed(() => entries.value.filter(entry => entry.kind === 'diary'))
  const partitionFocus = computed(() => entries.value.filter(entry => entry.kind === 'focus'))

  // 加载状态跟踪
  let loadPromise: Promise<void> | null = null

  // 从 IndexedDB 加载
  async function loadFromStorage() {
    // 如果已经加载完成，直接返回
    if (isLoaded.value) {
      console.warn('[Notebook] Already loaded, skipping')
      return
    }

    // 如果正在加载中，返回现有的 Promise
    if (loadPromise) {
      return loadPromise
    }

    // 创建新的加载 Promise
    loadPromise = (async () => {
      try {
        // 识别用户身份
        const userIdentity = useUserIdentityStore()
        await userIdentity.identifyUser()

        const data = await notebookRepo.load(characterId.value)
        if (data) {
          entries.value = data.entries || []
          tasks.value = data.tasks || []
        }
        isLoaded.value = true
      }
      catch (error) {
        console.error('[Notebook] Failed to load from storage:', error)
        // 即使加载失败也标记为已加载，避免重复尝试
        isLoaded.value = true
      }
      finally {
        loadPromise = null
      }
    })()

    return loadPromise
  }

  // 保存到 IndexedDB（带防抖）
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  async function saveToStorage() {
    if (isSaving.value || !isLoaded.value) {
      return
    }

    try {
      isSaving.value = true
      await notebookRepo.save(characterId.value, {
        entries: entries.value,
        tasks: tasks.value,
        version: 1,
      })
    }
    catch (error) {
      console.error('[Notebook] Failed to save to storage:', error)
    }
    finally {
      isSaving.value = false
    }
  }

  // 防抖保存函数
  function debouncedSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveToStorage()
      saveTimer = null
    }, 500) // 500ms 防抖
  }

  // 监听变化并自动保存
  watch([entries, tasks], () => {
    if (isLoaded.value) {
      debouncedSave()
    }
  }, { deep: true })

  // 立即加载数据（不要用 onMounted，因为 store 不是组件）
  loadFromStorage()

  function addEntry(kind: NotebookEntryKind, text: string, options?: { tags?: string[], metadata?: Record<string, unknown> }) {
    const entry: NotebookEntry = {
      id: nanoid(),
      kind,
      text,
      createdAt: Date.now(),
      tags: options?.tags,
      metadata: options?.metadata,
    }

    entries.value.push(entry)

    return entry
  }

  function addNote(text: string, options?: { tags?: string[], metadata?: Record<string, unknown> }) {
    return addEntry('note', text, options)
  }

  function addDiaryEntry(text: string, options?: { tags?: string[], metadata?: Record<string, unknown> }) {
    return addEntry('diary', text, options)
  }

  function addFocusEntry(text: string, options?: { tags?: string[], metadata?: Record<string, unknown> }) {
    return addEntry('focus', text, options)
  }

  function scheduleTask(payload: {
    title: string
    details?: string
    priority?: TaskPriority
    dueAt?: number
    metadata?: Record<string, unknown>
  }) {
    const now = Date.now()
    const task: ScheduledTask = {
      id: nanoid(),
      title: payload.title,
      details: payload.details,
      priority: payload.priority ?? 'normal',
      status: payload.dueAt ? 'scheduled' : 'queued',
      dueAt: payload.dueAt,
      createdAt: now,
      updatedAt: now,
      metadata: payload.metadata,
    }

    tasks.value.push(task)
    return task
  }

  function markTaskDone(taskId: string) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task)
      return

    task.status = 'done'
    task.updatedAt = Date.now()
  }

  function requeueTask(taskId: string, options?: { dueAt?: number, reason?: string }) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task)
      return

    task.status = 'queued'
    task.dueAt = options?.dueAt
    task.updatedAt = Date.now()
    task.metadata = {
      ...task.metadata,
      requeueReason: options?.reason,
    }
  }

  function markTaskNotified(taskId: string, nextNotifyAt?: number) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task)
      return

    task.lastNotifiedAt = Date.now()
    task.nextNotifyAt = nextNotifyAt
    task.updatedAt = Date.now()
  }

  function getDueTasks(now: number, windowMs: number) {
    return tasks.value.filter((task) => {
      if (task.status === 'done' || task.status === 'dropped')
        return false
      const dueAt = task.dueAt ?? now
      if (dueAt > now + windowMs)
        return false
      if (typeof task.nextNotifyAt === 'number' && task.nextNotifyAt > now)
        return false
      return true
    })
  }

  function removeEntry(id: string) {
    const index = entries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      entries.value.splice(index, 1)
    }
  }

  // 清理函数：在 store 销毁时清理定时器
  function cleanup() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  return {
    entries,
    tasks,
    partitionDiary,
    partitionFocus,
    characterId,
    isLoaded,
    isSaving,
    loadFromStorage,
    saveToStorage,
    addNote,
    addDiaryEntry,
    addFocusEntry,
    removeEntry,
    scheduleTask,
    markTaskDone,
    requeueTask,
    markTaskNotified,
    getDueTasks,
    cleanup,
  }
})
