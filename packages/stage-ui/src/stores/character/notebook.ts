import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { notebookRepo } from '../../database/repos/notebook.repo'

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
  const characterId = ref<string>('default')
  const isLoaded = ref(false)
  const isSaving = ref(false)

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
      console.log('[Notebook] Load already in progress, waiting...')
      return loadPromise
    }

    // 创建新的加载 Promise
    loadPromise = (async () => {
      try {
        console.log('[Notebook] Starting load from storage...')
        const data = await notebookRepo.load(characterId.value)
        if (data) {
          entries.value = data.entries || []
          tasks.value = data.tasks || []
          console.log('[Notebook] Loaded from storage:', entries.value.length, 'entries,', tasks.value.length, 'tasks')
        }
        else {
          console.log('[Notebook] No data found in storage, starting fresh')
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
    console.error('[Notebook] ========== saveToStorage 被调用 ==========')
    console.error('[Notebook] 调用栈:', new Error().stack)
    console.error('[Notebook] isSaving:', isSaving.value)
    console.error('[Notebook] isLoaded:', isLoaded.value)

    if (isSaving.value || !isLoaded.value) {
      console.error('[Notebook] 跳过保存（正在保存或未加载）')
      return
    }

    try {
      isSaving.value = true
      console.error('[Notebook] 开始保存到 IndexedDB...')
      console.error('[Notebook] characterId:', characterId.value)
      console.error('[Notebook] entries.length:', entries.value.length)

      await notebookRepo.save(characterId.value, {
        entries: entries.value,
        tasks: tasks.value,
        version: 1,
      })

      console.error('[Notebook] ========== 保存成功！==========')
      console.error('[Notebook] Saved to storage:', entries.value.length, 'entries')
    }
    catch (error) {
      console.error('[Notebook] ========== 保存失败 ==========:', error)
      console.error('[Notebook] Failed to save to storage:', error)
    }
    finally {
      isSaving.value = false
      console.error('[Notebook] isSaving 重置为 false')
    }
  }

  // 防抖保存函数
  function debouncedSave() {
    console.error('[Notebook] ========== debouncedSave 被调用 ==========')
    if (saveTimer) {
      console.error('[Notebook] 清除之前的定时器')
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      console.error('[Notebook] ========== 防抖定时器触发，执行 saveToStorage ==========')
      saveToStorage()
      saveTimer = null
    }, 500) // 500ms 防抖
    console.error('[Notebook] 已设置 500ms 防抖定时器，ID:', saveTimer)
  }

  // 监听变化并自动保存
  watch([entries, tasks], () => {
    console.error('[Notebook] ========== WATCH 回调被触发 ==========')
    console.error('[Notebook] 调用栈:', new Error().stack)
    console.error('[Notebook] isLoaded:', isLoaded.value)
    console.error('[Notebook] entries.length:', entries.value.length)
    console.error('[Notebook] tasks.length:', tasks.value.length)

    if (isLoaded.value) {
      console.error('[Notebook] 调用 debouncedSave')
      debouncedSave()
    }
    else {
      console.error('[Notebook] 跳过保存（未加载）')
    }
  }, { deep: true })

  // 立即加载数据（不要用 onMounted，因为 store 不是组件）
  loadFromStorage()

  function addEntry(kind: NotebookEntryKind, text: string, options?: { tags?: string[], metadata?: Record<string, unknown> }) {
    console.error('[Notebook] ========== addEntry 被调用 ==========')
    console.error('[Notebook] 调用栈:', new Error().stack)
    console.error('[Notebook] kind:', kind)
    console.error('[Notebook] text:', text.slice(0, 50))
    console.error('[Notebook] 当前条目数:', entries.value.length)
    console.error('[Notebook] entries 是否是 ref:', entries.value !== undefined)
    console.error('[Notebook] entries.value 类型:', Array.isArray(entries.value) ? 'Array' : typeof entries.value)

    const entry: NotebookEntry = {
      id: nanoid(),
      kind,
      text,
      createdAt: Date.now(),
      tags: options?.tags,
      metadata: options?.metadata,
    }

    // 尝试直接修改数组
    const oldLength = entries.value.length
    entries.value.push(entry)
    const newLength = entries.value.length

    console.error('[Notebook] 条目已添加')
    console.error('[Notebook] 旧长度:', oldLength, '新长度:', newLength)
    console.error('[Notebook] push 是否成功:', newLength === oldLength + 1)
    console.error('[Notebook] isLoaded:', isLoaded.value)
    console.error('[Notebook] 将触发 watch 回调进行保存')

    // 强制触发一次保存（绕过 watch）
    console.error('[Notebook] 强制触发保存（测试）')
    setTimeout(() => {
      console.error('[Notebook] 延迟 100ms 后检查 watch 是否触发')
      console.error('[Notebook] 当前条目数:', entries.value.length)
    }, 100)

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
