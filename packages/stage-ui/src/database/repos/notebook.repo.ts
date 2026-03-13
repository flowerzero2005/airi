import type { NotebookEntry, ScheduledTask } from '../../stores/character/notebook'

import localforage from 'localforage'

export interface NotebookData {
  entries: NotebookEntry[]
  tasks: ScheduledTask[]
  version: number
  lastSyncedAt?: number
}

// 创建专门的 notebook store
const notebookStore = localforage.createInstance({
  name: 'airi-notebook',
  storeName: 'notebooks',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  description: 'AIRI Notebook Storage',
})

// 安全的克隆函数，优先使用 structuredClone，失败则降级到 JSON
function safeClone<T>(data: T): T {
  try {
    return structuredClone(data)
  }
  catch {
    return JSON.parse(JSON.stringify(data))
  }
}

export const notebookRepo = {
  async load(characterId: string): Promise<NotebookData | null> {
    console.log('[NotebookRepo] load called with characterId:', characterId)

    if (!characterId || typeof characterId !== 'string') {
      console.error('[NotebookRepo] Invalid characterId')
      return null
    }

    const key = `notebook-${characterId}`
    console.log('[NotebookRepo] Loading from key:', key)

    try {
      const startTime = Date.now()
      const data = await notebookStore.getItem<NotebookData>(key)
      const loadTime = Date.now() - startTime

      console.log('[NotebookRepo] Load completed in', loadTime, 'ms')

      // 验证数据完整性
      if (data && (!Array.isArray(data.entries) || !Array.isArray(data.tasks))) {
        console.error('[NotebookRepo] Corrupted data detected, returning null')
        return null
      }

      if (data) {
        console.log('[NotebookRepo] Loaded data:', data.entries.length, 'entries,', data.tasks.length, 'tasks')
      }
      else {
        console.log('[NotebookRepo] No data found')
      }

      return data || null
    }
    catch (error) {
      console.error('[NotebookRepo] Error during load:', error)
      return null
    }
  },

  async save(characterId: string, data: NotebookData): Promise<void> {
    console.error('[NotebookRepo] ========== save 被调用 ==========')
    console.error('[NotebookRepo] 调用栈:', new Error().stack)
    console.error('[NotebookRepo] characterId:', characterId)
    console.error('[NotebookRepo] entries.length:', data.entries.length)
    console.error('[NotebookRepo] tasks.length:', data.tasks.length)

    if (!characterId || typeof characterId !== 'string') {
      console.error('[NotebookRepo] Invalid characterId')
      throw new Error('[NotebookRepo] Invalid characterId')
    }

    if (!Array.isArray(data.entries) || !Array.isArray(data.tasks)) {
      console.error('[NotebookRepo] Invalid data structure')
      throw new Error('[NotebookRepo] Invalid data structure')
    }

    const key = `notebook-${characterId}`
    console.error('[NotebookRepo] 存储键:', key)

    try {
      // 获取当前版本号
      const currentData = await notebookStore.getItem<NotebookData>(key)
      const currentVersion = currentData?.version || 0
      console.error('[NotebookRepo] 当前版本:', currentVersion)

      const saveData: NotebookData = {
        entries: safeClone(data.entries),
        tasks: safeClone(data.tasks),
        version: currentVersion + 1,
        lastSyncedAt: Date.now(),
      }

      console.error('[NotebookRepo] 准备保存数据，新版本:', saveData.version)
      await notebookStore.setItem(key, saveData)
      console.error('[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========')
    }
    catch (error) {
      console.error('[NotebookRepo] ========== Error during save ==========:', error)
      throw error
    }
  },

  async addToSyncQueue(characterId: string, data: NotebookData): Promise<void> {
    if (!characterId || typeof characterId !== 'string') {
      throw new Error('[NotebookRepo] Invalid characterId')
    }

    if (!Array.isArray(data.entries) || !Array.isArray(data.tasks)) {
      throw new TypeError('[NotebookRepo] Invalid data structure')
    }

    const queueKey = `sync-queue-${characterId}-${Date.now()}`
    try {
      const saveData = {
        characterId,
        data: {
          entries: safeClone(data.entries),
          tasks: safeClone(data.tasks),
          version: data.version,
        },
        queuedAt: Date.now(),
      }
      await notebookStore.setItem(queueKey, saveData)
    }
    catch (error) {
      console.error('[NotebookRepo] Error adding to sync queue:', error)
      throw error
    }
  },

  async getSyncQueue(): Promise<Array<{ key: string, characterId: string, data: NotebookData, queuedAt: number }>> {
    const items: Array<{ key: string, characterId: string, data: NotebookData, queuedAt: number }> = []
    try {
      await notebookStore.iterate<{ characterId: string, data: NotebookData, queuedAt: number }, void>((value, key) => {
        if (key.startsWith('sync-queue-') && value && value.characterId && value.data) {
          items.push({ key, ...value })
        }
      })
    }
    catch (error) {
      console.error('[NotebookRepo] Error getting sync queue:', error)
    }
    return items
  },

  async removeSyncQueueItem(key: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new Error('[NotebookRepo] Invalid key')
    }

    try {
      await notebookStore.removeItem(key)
    }
    catch (error) {
      console.error('[NotebookRepo] Error removing sync queue item:', error)
      throw error
    }
  },

  async clear(characterId: string): Promise<void> {
    if (!characterId || typeof characterId !== 'string') {
      throw new Error('[NotebookRepo] Invalid characterId')
    }

    const key = `notebook-${characterId}`
    try {
      await notebookStore.removeItem(key)
    }
    catch (error) {
      console.error('[NotebookRepo] Error clearing notebook:', error)
      throw error
    }
  },
}
