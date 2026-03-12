/**
 * 记忆系统调试工具
 * 用于快速定位记忆保存和加载问题
 */

import localforage from 'localforage'

import { useCharacterNotebookStore } from '../stores/character/notebook'
import { useMemoryManager } from '../stores/chat/memory-manager'
import { useMemorySettingsStore } from '../stores/settings/memory'
import { notebookRepo } from './repos/notebook.repo'

interface DebugResult {
  success: boolean
  message: string
  details?: unknown
}

/**
 * 调试工具：检查记忆系统状态
 */
export async function debugMemorySystem(): Promise<void> {
  console.log('=== 记忆系统调试开始 ===')
  console.log(`时间: ${new Date().toLocaleString()}`)
  console.log('')

  const results: DebugResult[] = []

  // 1. 检查 stores 是否初始化
  console.log('1️⃣ 检查 Stores 初始化状态...')
  try {
    const notebookStore = useCharacterNotebookStore()
    const memoryManager = useMemoryManager()
    const memorySettings = useMemorySettingsStore()

    results.push({
      success: true,
      message: 'Stores 初始化成功',
      details: {
        notebookStore: {
          isLoaded: notebookStore.isLoaded,
          entriesCount: notebookStore.entries.length,
          tasksCount: notebookStore.tasks.length,
          characterId: notebookStore.characterId,
        },
        memoryManager: {
          isProcessing: memoryManager.isProcessing,
          lastProcessedAt: memoryManager.lastProcessedAt,
          lastDeduplicationAt: memoryManager.lastDeduplicationAt,
        },
        memorySettings: {
          isLoaded: memorySettings.isLoaded,
          enabled: memorySettings.settings.enabled,
          autoExtract: memorySettings.settings.autoExtract,
        },
      },
    })

    console.log('✅ Stores 初始化成功')
    console.log(`   - Notebook 已加载: ${notebookStore.isLoaded}`)
    console.log(`   - 记忆条目数: ${notebookStore.entries.length}`)
    console.log(`   - 任务数: ${notebookStore.tasks.length}`)
    console.log(`   - 记忆设置已加载: ${memorySettings.isLoaded}`)
    console.log(`   - 记忆功能启用: ${memorySettings.settings.enabled}`)
  }
  catch (error) {
    results.push({
      success: false,
      message: 'Stores 初始化失败',
      details: error,
    })
    console.error('❌ Stores 初始化失败:', error)
  }
  console.log('')

  // 2. 检查 IndexedDB 是否可访问
  console.log('2️⃣ 检查 IndexedDB 可访问性...')
  try {
    const testKey = 'debug-test-key'
    const testValue = { test: true, timestamp: Date.now() }

    // 使用 notebookRepo 的 store 实例
    const notebookStore = localforage.createInstance({
      name: 'airi-notebook',
      storeName: 'notebooks',
      driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
    })

    await notebookStore.setItem(testKey, testValue)
    const retrieved = await notebookStore.getItem(testKey)
    await notebookStore.removeItem(testKey)

    const isAccessible = JSON.stringify(retrieved) === JSON.stringify(testValue)

    results.push({
      success: isAccessible,
      message: isAccessible ? 'IndexedDB 可访问' : 'IndexedDB 读写验证失败',
      details: { testValue, retrieved },
    })

    if (isAccessible) {
      console.log('✅ IndexedDB 可访问且工作正常')
    }
    else {
      console.error('❌ IndexedDB 读写验证失败')
    }
  }
  catch (error) {
    results.push({
      success: false,
      message: 'IndexedDB 访问失败',
      details: error,
    })
    console.error('❌ IndexedDB 访问失败:', error)
  }
  console.log('')

  // 3. 检查数据库中的数据
  console.log('3️⃣ 检查数据库中的记忆数据...')
  try {
    const notebookStore = useCharacterNotebookStore()
    const characterId = notebookStore.characterId
    const data = await notebookRepo.load(characterId)

    results.push({
      success: true,
      message: '数据库数据读取成功',
      details: {
        characterId,
        hasData: !!data,
        entriesCount: data?.entries.length || 0,
        tasksCount: data?.tasks.length || 0,
        version: data?.version,
        lastSyncedAt: data?.lastSyncedAt,
      },
    })

    if (data) {
      console.log('✅ 数据库中存在记忆数据')
      console.log(`   - Character ID: ${characterId}`)
      console.log(`   - 记忆条目数: ${data.entries.length}`)
      console.log(`   - 任务数: ${data.tasks.length}`)
      console.log(`   - 版本号: ${data.version}`)
      console.log(`   - 最后同步: ${data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : '未同步'}`)

      if (data.entries.length > 0) {
        console.log('\n   最近的 3 条记忆:')
        data.entries.slice(-3).forEach((entry, index) => {
          console.log(`   ${index + 1}. [${entry.kind}] ${entry.text.slice(0, 50)}...`)
          console.log(`      创建时间: ${new Date(entry.createdAt).toLocaleString()}`)
        })
      }
    }
    else {
      console.log('⚠️  数据库中没有记忆数据')
    }
  }
  catch (error) {
    results.push({
      success: false,
      message: '数据库数据读取失败',
      details: error,
    })
    console.error('❌ 数据库数据读取失败:', error)
  }
  console.log('')

  // 4. 检查所有 IndexedDB 键
  console.log('4️⃣ 列出所有 IndexedDB 键...')
  try {
    const notebookStore = localforage.createInstance({
      name: 'airi-notebook',
      storeName: 'notebooks',
    })

    const keys = await notebookStore.keys()
    results.push({
      success: true,
      message: `找到 ${keys.length} 个键`,
      details: { keys },
    })

    console.log(`✅ 找到 ${keys.length} 个键:`)
    keys.forEach((key) => {
      console.log(`   - ${key}`)
    })
  }
  catch (error) {
    results.push({
      success: false,
      message: '无法列出 IndexedDB 键',
      details: error,
    })
    console.error('❌ 无法列出 IndexedDB 键:', error)
  }
  console.log('')

  // 5. 检查 localStorage 中的设置
  console.log('5️⃣ 检查 localStorage 中的记忆设置...')
  try {
    const settingsKey = 'airi-memory-settings'
    const settingsData = localStorage.getItem(settingsKey)

    if (settingsData) {
      const parsed = JSON.parse(settingsData)
      results.push({
        success: true,
        message: 'localStorage 设置存在',
        details: parsed,
      })

      console.log('✅ localStorage 设置存在')
      console.log(`   - 记忆功能启用: ${parsed.settings?.enabled}`)
      console.log(`   - 自动提取: ${parsed.settings?.autoExtract}`)
      console.log(`   - 最小重要性: ${parsed.settings?.minImportance}`)
      console.log(`   - 自定义关键词数: ${parsed.customKeywords?.length || 0}`)
    }
    else {
      console.log('⚠️  localStorage 中没有记忆设置')
    }
  }
  catch (error) {
    results.push({
      success: false,
      message: 'localStorage 读取失败',
      details: error,
    })
    console.error('❌ localStorage 读取失败:', error)
  }
  console.log('')

  // 总结
  console.log('=== 调试总结 ===')
  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  console.log(`✅ 成功: ${successCount}/${totalCount}`)
  console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`)
  console.log('')

  if (successCount === totalCount) {
    console.log('🎉 所有检查通过！记忆系统工作正常。')
  }
  else {
    console.log('⚠️  发现问题，请查看上面的详细信息。')
  }

  console.log('=== 记忆系统调试结束 ===')
  console.log('')
}

/**
 * 手动测试记忆保存
 */
export async function testMemorySave(options?: {
  userMessage?: string
  assistantMessage?: string
}): Promise<void> {
  console.log('=== 测试记忆保存 ===')
  console.log('')

  const defaultUserMessage = options?.userMessage || '我叫张三，我喜欢编程和阅读。'
  const defaultAssistantMessage = options?.assistantMessage || '很高兴认识你，张三！编程和阅读都是很好的爱好。'

  console.log('测试数据:')
  console.log(`用户消息: ${defaultUserMessage}`)
  console.log(`助手消息: ${defaultAssistantMessage}`)
  console.log('')

  try {
    const memoryManager = useMemoryManager()
    const notebookStore = useCharacterNotebookStore()

    // 记录保存前的状态
    const beforeCount = notebookStore.entries.length
    console.log(`保存前记忆数: ${beforeCount}`)

    // 设置日志回调
    const logs: Array<{ type: string, message: string }> = []
    const unsubscribe = memoryManager.onLog((type, message) => {
      logs.push({ type, message })
      console.log(`[${type.toUpperCase()}] ${message}`)
    })

    // 执行记忆保存
    console.log('\n开始处理对话...')
    await memoryManager.processConversationTurn(defaultUserMessage, defaultAssistantMessage)

    // 等待保存完成（防抖延迟）
    console.log('\n等待保存完成...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 记录保存后的状态
    const afterCount = notebookStore.entries.length
    console.log(`\n保存后记忆数: ${afterCount}`)
    console.log(`新增记忆数: ${afterCount - beforeCount}`)

    if (afterCount > beforeCount) {
      console.log('\n最新的记忆:')
      const latestEntry = notebookStore.entries[notebookStore.entries.length - 1]
      console.log(`  类型: ${latestEntry.kind}`)
      console.log(`  内容: ${latestEntry.text}`)
      console.log(`  标签: ${latestEntry.tags?.join(', ') || '无'}`)
      console.log(`  创建时间: ${new Date(latestEntry.createdAt).toLocaleString()}`)
    }

    // 验证数据库中的数据
    console.log('\n验证数据库保存...')
    await new Promise(resolve => setTimeout(resolve, 500))
    const dbData = await notebookRepo.load(notebookStore.characterId)

    if (dbData && dbData.entries.length === afterCount) {
      console.log('✅ 数据库保存成功！')
      console.log(`   数据库中的记忆数: ${dbData.entries.length}`)
    }
    else {
      console.error('❌ 数据库保存可能失败')
      console.error(`   Store 中的记忆数: ${afterCount}`)
      console.error(`   数据库中的记忆数: ${dbData?.entries.length || 0}`)
    }

    // 清理
    unsubscribe()

    console.log('\n=== 测试完成 ===')
  }
  catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  }
}

/**
 * 清空所有记忆数据（谨慎使用！）
 */
export async function clearAllMemories(): Promise<void> {
  console.log('⚠️  警告: 即将清空所有记忆数据！')

  const confirmed = confirm('确定要清空所有记忆数据吗？此操作不可恢复！')
  if (!confirmed) {
    console.log('操作已取消')
    return
  }

  try {
    const notebookStore = useCharacterNotebookStore()
    const characterId = notebookStore.characterId

    // 清空 store
    notebookStore.entries.length = 0
    notebookStore.tasks.length = 0

    // 清空数据库
    await notebookRepo.clear(characterId)

    console.log('✅ 所有记忆数据已清空')
  }
  catch (error) {
    console.error('❌ 清空失败:', error)
    throw error
  }
}

/**
 * 导出记忆数据（用于备份）
 */
export async function exportMemories(): Promise<string> {
  try {
    const notebookStore = useCharacterNotebookStore()
    const data = {
      characterId: notebookStore.characterId,
      entries: notebookStore.entries,
      tasks: notebookStore.tasks,
      exportedAt: Date.now(),
    }

    const json = JSON.stringify(data, null, 2)
    console.log('✅ 记忆数据已导出')
    console.log(`   记忆条目数: ${data.entries.length}`)
    console.log(`   任务数: ${data.tasks.length}`)

    return json
  }
  catch (error) {
    console.error('❌ 导出失败:', error)
    throw error
  }
}

/**
 * 导入记忆数据（用于恢复）
 */
export async function importMemories(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData)

    if (!Array.isArray(data.entries) || !Array.isArray(data.tasks)) {
      throw new TypeError('无效的数据格式')
    }

    const notebookStore = useCharacterNotebookStore()

    // 确认导入
    const confirmed = confirm(
      `确定要导入 ${data.entries.length} 条记忆和 ${data.tasks.length} 个任务吗？\n当前数据将被覆盖！`,
    )

    if (!confirmed) {
      console.log('导入已取消')
      return
    }

    // 导入数据
    notebookStore.entries.length = 0
    notebookStore.entries.push(...data.entries)
    notebookStore.tasks.length = 0
    notebookStore.tasks.push(...data.tasks)

    // 保存到数据库
    await notebookStore.saveToStorage()

    console.log('✅ 记忆数据已导入')
    console.log(`   记忆条目数: ${data.entries.length}`)
    console.log(`   任务数: ${data.tasks.length}`)
  }
  catch (error) {
    console.error('❌ 导入失败:', error)
    throw error
  }
}

// 导出到全局对象，方便在浏览器控制台中使用
if (typeof window !== 'undefined') {
  (window as any).debugMemory = {
    debug: debugMemorySystem,
    test: testMemorySave,
    clear: clearAllMemories,
    export: exportMemories,
    import: importMemories,
  }

  console.log('💡 记忆调试工具已加载到 window.debugMemory')
  console.log('   - window.debugMemory.debug()    // 运行完整诊断')
  console.log('   - window.debugMemory.test()     // 测试记忆保存')
  console.log('   - window.debugMemory.clear()    // 清空所有记忆')
  console.log('   - window.debugMemory.export()   // 导出记忆数据')
  console.log('   - window.debugMemory.import(json) // 导入记忆数据')
}
