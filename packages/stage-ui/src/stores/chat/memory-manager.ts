import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCharacterNotebookStore } from '../character/notebook'
import { useMemorySettingsStore } from '../settings/memory'
import { calculateSimilarity, findDuplicates, mergeDuplicates } from './memory-deduplication'
import { hybridMemoryExtraction } from './memory-hybrid'

export const useMemoryManager = defineStore('memory-manager', () => {
  const notebookStore = useCharacterNotebookStore()
  const memorySettings = useMemorySettingsStore()
  const isProcessing = ref(false)
  const lastProcessedAt = ref<number>(0)
  const lastDeduplicationAt = ref<number>(0)

  console.log('[MemoryManager] Store 初始化')
  console.log('[MemoryManager] notebookStore.isLoaded:', notebookStore.isLoaded)
  console.log('[MemoryManager] memorySettings.settings:', memorySettings.settings)

  // 确保 notebook store 已加载
  if (!notebookStore.isLoaded) {
    console.log('[MemoryManager] Notebook store 尚未加载，等待加载...')
    notebookStore.loadFromStorage().then(() => {
      console.log('[MemoryManager] Notebook store 加载完成')
    }).catch((err) => {
      console.error('[MemoryManager] Notebook store 加载失败:', err)
    })
  }

  // Log callback for UI display
  type LogCallback = (type: 'info' | 'success' | 'warning', message: string) => void
  const logCallbacks: LogCallback[] = []

  function onLog(callback: LogCallback) {
    logCallbacks.push(callback)
    return () => {
      const index = logCallbacks.indexOf(callback)
      if (index !== -1) {
        logCallbacks.splice(index, 1)
      }
    }
  }

  function emitLog(type: 'info' | 'success' | 'warning', message: string) {
    console.log(`[MemoryManager] ${message}`)
    logCallbacks.forEach(cb => cb(type, message))
  }

  async function processConversationTurn(
    userMessage: string,
    assistantMessage: string,
  ) {
    console.log('[MemoryManager] ========== processConversationTurn 被调用 ==========')
    console.log('[MemoryManager] 调用栈:', new Error().stack)
    console.log('[MemoryManager] 用户消息:', userMessage.slice(0, 100))
    console.log('[MemoryManager] 助手消息:', assistantMessage.slice(0, 100))

    // 检查记忆系统是否启用
    if (!memorySettings.settings.enabled) {
      console.log('[MemoryManager] 记忆系统已禁用，跳过处理')
      emitLog('info', '记忆系统已禁用')
      return
    }

    // 检查是否启用自动提取
    if (!memorySettings.settings.autoExtract) {
      console.log('[MemoryManager] 自动提取已禁用，跳过处理')
      emitLog('info', '自动提取已禁用')
      return
    }

    // 确保 notebook store 已加载
    if (!notebookStore.isLoaded) {
      console.log('[MemoryManager] 等待 notebook store 加载...')
      await notebookStore.loadFromStorage()
      console.log('[MemoryManager] Notebook store 加载完成，isLoaded:', notebookStore.isLoaded)
    }

    // 输入验证
    if (!userMessage || !assistantMessage || typeof userMessage !== 'string' || typeof assistantMessage !== 'string') {
      emitLog('warning', '无效的输入消息')
      console.log('[MemoryManager] 输入验证失败')
      return
    }

    if (userMessage.trim().length === 0 || assistantMessage.trim().length === 0) {
      emitLog('info', '消息为空，跳过处理')
      console.log('[MemoryManager] 消息为空')
      return
    }

    emitLog('info', '开始分析对话内容...')

    if (isProcessing.value) {
      emitLog('warning', '正在处理中，跳过本次')
      console.log('[MemoryManager] 正在处理中')
      return
    }

    try {
      isProcessing.value = true
      console.log('[MemoryManager] 开始混合策略提取...')

      // 使用混合策略提取记忆
      const memoryResult = await hybridMemoryExtraction(userMessage, assistantMessage)

      console.log('[MemoryManager] 提取结果:', memoryResult)

      if (!memoryResult) {
        emitLog('info', '未检测到重要信息，不保存记忆')
        console.log('[MemoryManager] 未检测到重要信息')
        return
      }

      emitLog('info', `检测到${memoryResult.importance === 'high' ? '高' : '中'}优先级信息`)
      emitLog('info', `匹配原因: ${memoryResult.reason}`)

      // 检查是否与现有记忆重复
      console.log('[MemoryManager] 检查重复...')
      const isDuplicate = await checkForDuplicates(memoryResult.summary)
      if (isDuplicate) {
        emitLog('warning', `跳过重复记忆: ${memoryResult.summary.slice(0, 30)}...`)
        console.log('[MemoryManager] 发现重复记忆')
        return
      }

      emitLog('success', `保存记忆: ${memoryResult.summary.slice(0, 50)}...`)
      console.log('[MemoryManager] 准备保存记忆到 notebook store...')

      // 根据重要性决定存储类型
      if (memoryResult.importance === 'high') {
        // 高优先级：存为 focus（焦点）
        console.error('[MemoryManager] ========== 添加焦点条目 ==========')
        console.error('[MemoryManager] 调用栈:', new Error().stack)
        notebookStore.addFocusEntry(memoryResult.summary, {
          tags: memoryResult.tags,
          metadata: {
            importance: memoryResult.importance,
            reason: memoryResult.reason,
            extractedAt: Date.now(),
            userMessage: userMessage.slice(0, 200), // 保留原始消息片段
          },
        })
        console.error('[MemoryManager] 焦点条目已添加')
      }
      else if (memoryResult.importance === 'medium') {
        // 中优先级：存为 note（笔记）
        console.error('[MemoryManager] ========== 添加笔记条目 ==========')
        console.error('[MemoryManager] 调用栈:', new Error().stack)
        notebookStore.addNote(memoryResult.summary, {
          tags: memoryResult.tags,
          metadata: {
            importance: memoryResult.importance,
            reason: memoryResult.reason,
            extractedAt: Date.now(),
            userMessage: userMessage.slice(0, 200),
          },
        })
        console.error('[MemoryManager] 笔记条目已添加')
      }

      lastProcessedAt.value = Date.now()

      emitLog('success', `记忆已保存到${memoryResult.importance === 'high' ? '焦点' : '笔记'}区`)
      emitLog('info', `当前记忆总数: ${notebookStore.entries.length}`)
      console.log('[MemoryManager] 当前记忆总数:', notebookStore.entries.length)

      // 返回反馈信息，用于 AI 感知
      const feedback = {
        success: true,
        summary: memoryResult.summary,
        importance: memoryResult.importance,
        tags: memoryResult.tags,
        reason: memoryResult.reason,
      }

      // 每 3 条记忆进行一次去重（更积极的去重策略）
      // 使用 85% 的相似度阈值来识别包含关系
      if (notebookStore.entries.length > 0 && notebookStore.entries.length % 3 === 0) {
        emitLog('info', '开始去重检查...')
        console.log('[MemoryManager] 开始去重检查...')
        await deduplicateMemories(0.85)
      }

      console.log('[MemoryManager] ========== 处理完成 ==========')
      return feedback
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      emitLog('warning', `记忆提取失败: ${errorMessage}`)
      console.error('[MemoryManager] Failed to process conversation:', error)
    }
    finally {
      isProcessing.value = false
    }
  }

  /**
   * 检查新记忆是否与现有记忆重复
   */
  async function checkForDuplicates(newMemoryText: string, threshold = 0.75): Promise<boolean> {
    const tempEntry = {
      id: 'temp',
      kind: 'note' as const,
      text: newMemoryText,
      createdAt: Date.now(),
      tags: [],
    }

    for (const existingEntry of notebookStore.entries) {
      const similarity = calculateSimilarity(tempEntry, existingEntry)
      if (similarity >= threshold) {
        console.log('[MemoryManager] Found duplicate with similarity:', similarity)
        return true
      }
    }

    return false
  }

  /**
   * 对现有记忆进行去重
   */
  async function deduplicateMemories(threshold = 0.85): Promise<number> {
    if (notebookStore.entries.length === 0) {
      return 0
    }

    try {
      const duplicateGroups = findDuplicates(notebookStore.entries, threshold)

      if (duplicateGroups.length === 0) {
        emitLog('info', '未发现重复记忆')
        return 0
      }

      let mergedCount = 0
      for (const group of duplicateGroups) {
        try {
          // 合并重复条目
          const mergedEntry = mergeDuplicates(group.entry, group.duplicates)

          // 删除旧条目
          notebookStore.removeEntry(group.entry.id)
          group.duplicates.forEach(dup => notebookStore.removeEntry(dup.id))

          // 添加合并后的条目
          if (mergedEntry.kind === 'focus') {
            notebookStore.addFocusEntry(mergedEntry.text, {
              tags: mergedEntry.tags,
              metadata: mergedEntry.metadata,
            })
          }
          else {
            notebookStore.addNote(mergedEntry.text, {
              tags: mergedEntry.tags,
              metadata: mergedEntry.metadata,
            })
          }

          mergedCount += group.duplicates.length
        }
        catch (error) {
          console.error('[MemoryManager] Failed to merge duplicate group:', error)
          // 继续处理其他组
        }
      }

      lastDeduplicationAt.value = Date.now()
      const message = `已合并 ${mergedCount} 条重复记忆`
      console.log(`[MemoryManager] ${message}`)
      emitLog('success', message)

      return mergedCount
    }
    catch (error) {
      console.error('[MemoryManager] Failed to deduplicate memories:', error)
      emitLog('warning', '去重过程出错')
      return 0
    }
  }

  function searchRelevantMemories(query: string, limit = 5) {
    console.log('[MemoryManager] ========== searchRelevantMemories 被调用 ==========')
    console.log('[MemoryManager] 查询:', query)
    console.log('[MemoryManager] 当前记忆总数:', notebookStore.entries.length)

    // 输入验证
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.log('[MemoryManager] 查询为空，返回空数组')
      return []
    }

    const queryLower = query.toLowerCase()

    // 智能关键词映射：将问句转换为实际要搜索的概念
    const conceptMap: Record<string, string[]> = {
      // 身份相关
      我是谁: ['用户', '姓名', '名字', '身份', '自称'],
      叫什么: ['姓名', '名字', '用户名', '自称'],
      名字: ['姓名', '名字', '用户名', '自称'],
      是谁: ['用户', '姓名', '名字', '身份'],
      // 年龄相关
      多大: ['年龄', '岁', '出生'],
      几岁: ['年龄', '岁', '出生'],
      年龄: ['年龄', '岁', '出生'],
      // 地点相关
      住在: ['住', '居住', '常住', '地址', '城市'],
      哪里: ['住', '居住', '地址', '城市', '来自'],
      在哪: ['住', '居住', '地址', '城市'],
      // 喜好相关
      喜欢: ['喜欢', '爱好', '偏好', '喜爱'],
      爱好: ['喜欢', '爱好', '偏好', '兴趣'],
      // 学习工作相关
      学校: ['学校', '大学', '学院', '就读'],
      工作: ['工作', '职业', '公司'],
      专业: ['专业', '学', '就读'],
    }

    // 改进的关键词提取：支持中文和英文
    const keywords: string[] = []

    // 先检查是否匹配概念映射
    for (const [pattern, concepts] of Object.entries(conceptMap)) {
      if (queryLower.includes(pattern)) {
        keywords.push(...concepts)
        console.log(`[MemoryManager] 匹配到概念模式 "${pattern}"，添加关键词:`, concepts)
      }
    }

    // 英文分词
    const englishWords = queryLower.split(/\s+/).filter(k => k.length > 1)
    keywords.push(...englishWords)

    // 中文字符提取（提取 2-4 字的词组）
    const chineseChars = queryLower.match(/[\u4E00-\u9FA5]+/g) || []
    for (const segment of chineseChars) {
      // 提取 2 字词
      for (let i = 0; i <= segment.length - 2; i++) {
        keywords.push(segment.slice(i, i + 2))
      }
      // 提取 3 字词
      for (let i = 0; i <= segment.length - 3; i++) {
        keywords.push(segment.slice(i, i + 3))
      }
      // 提取 4 字词
      for (let i = 0; i <= segment.length - 4; i++) {
        keywords.push(segment.slice(i, i + 4))
      }
      // 也保留完整的中文段落
      if (segment.length > 1) {
        keywords.push(segment)
      }
    }

    // 去重
    const uniqueKeywords = [...new Set(keywords)]

    console.log('[MemoryManager] 提取的关键词:', uniqueKeywords)

    if (uniqueKeywords.length === 0) {
      console.log('[MemoryManager] 没有提取到关键词，返回空数组')
      return []
    }

    // 计算相关性分数
    const scored = notebookStore.entries
      .filter(entry => entry.kind !== 'diary') // 排除日记
      .map((entry) => {
        const textLower = entry.text.toLowerCase()
        let score = 0
        const matchedKeywords: string[] = []

        // 关键词匹配
        for (const keyword of uniqueKeywords) {
          if (textLower.includes(keyword)) {
            score += 10
            matchedKeywords.push(keyword)
          }
        }

        // 标签匹配
        if (entry.tags) {
          for (const tag of entry.tags) {
            if (uniqueKeywords.some(k => tag.toLowerCase().includes(k))) {
              score += 5
              matchedKeywords.push(`tag:${tag}`)
            }
          }
        }

        // 重要性加权
        const importance = entry.metadata?.importance as string | undefined
        if (importance === 'high')
          score *= 2
        else if (importance === 'medium')
          score *= 1.5

        // 时间衰减（7天内不衰减，之后逐渐降低）
        const ageMs = Date.now() - entry.createdAt
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        if (ageDays > 7) {
          score *= Math.max(0.3, 1 - (ageDays - 7) / 90) // 90天后降至30%
        }

        console.log(`[MemoryManager] 条目 "${entry.text.slice(0, 30)}..." 得分: ${score}, 匹配关键词:`, matchedKeywords)

        return { entry, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(limit, 20))) // 限制在 1-20 之间

    console.log('[MemoryManager] 找到', scored.length, '条相关记忆')
    console.log('[MemoryManager] ========== searchRelevantMemories 完成 ==========')

    return scored.map(item => item.entry)
  }

  return {
    isProcessing,
    lastProcessedAt,
    lastDeduplicationAt,
    processConversationTurn,
    searchRelevantMemories,
    deduplicateMemories,
    checkForDuplicates,
    onLog,
  }
})
