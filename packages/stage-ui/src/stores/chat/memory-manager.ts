import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCharacterNotebookStore } from '../character/notebook'
import { useMemorySettingsStore } from '../settings/memory'
import { useMemoryAdvancedSettingsStore } from '../settings/memory-advanced'
import { calculateSimilarity, findDuplicates, mergeDuplicates } from './memory-deduplication'
import { hybridMemoryExtraction } from './memory-hybrid'

export const useMemoryManager = defineStore('memory-manager', () => {
  const notebookStore = useCharacterNotebookStore()
  const memorySettings = useMemorySettingsStore()
  const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()
  const isProcessing = ref(false)
  const lastProcessedAt = ref<number>(0)
  const lastDeduplicationAt = ref<number>(0)

  // 确保 notebook store 已加载
  if (!notebookStore.isLoaded) {
    notebookStore.loadFromStorage().catch((err) => {
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
    logCallbacks.forEach(cb => cb(type, message))
  }

  /**
   * 智能价值判断：评估记忆的保存价值
   * 使用保守策略，宁可多保存，不要误删重要记忆
   *
   * @param memoryResult 提取的记忆结果
   * @param userMessage 用户原始消息
   * @returns 价值评分 (0-1)，0.5 以上认为值得保存
   */
  async function evaluateMemoryValue(
    memoryResult: any,
    userMessage: string,
  ): Promise<number> {
    let score = 0.3 // 基础分，确保不会完全过滤

    // 因素1: 用户明确要求记住（权重最高，+0.5）
    if (/记住|别忘|一定要记|记下来|不要忘/.test(userMessage)) {
      score += 0.5
    }

    // 因素2: 时间稳定性（+0.2）
    const hasTemporalWords = /今天|现在|刚才|刚刚|马上|立刻|目前/.test(userMessage)
    if (!hasTemporalWords) {
      score += 0.2
    }

    // 因素3: 信息完整性（+0.2）
    const isComplete = memoryResult.summary.length >= 10 && /[。！？.!?]$/.test(memoryResult.summary)
    if (isComplete) {
      score += 0.2
    }

    // 因素4: 重要性标记（+0.3）
    if (memoryResult.importance === 'high') {
      score += 0.3
    }
    else if (memoryResult.importance === 'medium') {
      score += 0.1
    }

    // 最终评分限制在 0-1 之间
    return Math.min(score, 1.0)
  }

  async function processConversationTurn(
    userMessage: string,
    assistantMessage: string,
  ) {
    // 检查记忆系统是否启用
    if (!memorySettings.settings.enabled) {
      emitLog('info', '记忆系统已禁用')
      return
    }

    // 检查是否启用自动提取
    if (!memorySettings.settings.autoExtract) {
      emitLog('info', '自动提取已禁用')
      return
    }

    // 确保 notebook store 已加载
    if (!notebookStore.isLoaded) {
      await notebookStore.loadFromStorage()
    }

    // 输入验证
    if (!userMessage || !assistantMessage || typeof userMessage !== 'string' || typeof assistantMessage !== 'string') {
      emitLog('warning', '无效的输入消息')
      return
    }

    if (userMessage.trim().length === 0 || assistantMessage.trim().length === 0) {
      emitLog('info', '消息为空，跳过处理')
      return
    }

    emitLog('info', '开始分析对话内容...')

    if (isProcessing.value) {
      emitLog('warning', '正在处理中，跳过本次')
      return
    }

    try {
      isProcessing.value = true

      // 使用混合策略提取记忆
      const memoryResult = await hybridMemoryExtraction(userMessage, assistantMessage)

      if (!memoryResult) {
        emitLog('info', '未检测到重要信息，不保存记忆')
        return
      }

      emitLog('info', `检测到${memoryResult.importance === 'high' ? '高' : '中'}优先级信息`)
      emitLog('info', `匹配原因: ${memoryResult.reason}`)

      // ========== 智能价值判断：AI 二次评估记忆价值 ==========
      try {
        if (memoryAdvancedSettings.settings.enableSmartValueJudgment) {
          const valueScore = await evaluateMemoryValue(memoryResult, userMessage)

          // 使用保守阈值 0.5，宁可多保存，不要误删重要记忆
          if (valueScore < 0.5) {
            emitLog('info', `记忆价值评分过低 (${valueScore.toFixed(2)})，跳过保存`)
            return
          }

          emitLog('info', `记忆价值评分: ${valueScore.toFixed(2)}`)
        }
      }
      catch (error) {
        // 评估失败时降级到原有逻辑，不能丢失重要记忆
        console.error('[MemoryManager] 价值评估失败，降级到原有逻辑:', error)
        emitLog('warning', '价值评估失败，使用默认策略')
      }

      // 检查是否与现有记忆重复
      const isDuplicate = await checkForDuplicates(memoryResult.summary)
      if (isDuplicate) {
        emitLog('warning', `跳过重复记忆: ${memoryResult.summary.slice(0, 30)}...`)
        return
      }

      emitLog('success', `保存记忆: ${memoryResult.summary.slice(0, 50)}...`)

      // 根据重要性决定存储类型
      if (memoryResult.importance === 'high') {
        // 高优先级：存为 focus（焦点）
        notebookStore.addFocusEntry(memoryResult.summary, {
          tags: memoryResult.tags,
          metadata: {
            importance: memoryResult.importance,
            reason: memoryResult.reason,
            extractedAt: Date.now(),
            userMessage: userMessage.slice(0, 200), // 保留原始消息片段
          },
        })
      }
      else if (memoryResult.importance === 'medium') {
        // 中优先级：存为 note（笔记）
        notebookStore.addNote(memoryResult.summary, {
          tags: memoryResult.tags,
          metadata: {
            importance: memoryResult.importance,
            reason: memoryResult.reason,
            extractedAt: Date.now(),
            userMessage: userMessage.slice(0, 200),
          },
        })
      }

      lastProcessedAt.value = Date.now()

      emitLog('success', `记忆已保存到${memoryResult.importance === 'high' ? '焦点' : '笔记'}区`)
      emitLog('info', `当前记忆总数: ${notebookStore.entries.length}`)

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
        await deduplicateMemories(0.85)
      }

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
      emitLog('success', message)

      return mergedCount
    }
    catch (error) {
      console.error('[MemoryManager] Failed to deduplicate memories:', error)
      emitLog('warning', '去重过程出错')
      return 0
    }
  }

  /**
   * 知识图谱：用于语义扩展关键词
   * 将关键词映射到相关概念，提高记忆召回率
   */
  function expandKeywordsWithKnowledgeGraph(keywords: string[]): string[] {
    // 知识图谱映射表
    const knowledgeGraph: Record<string, string[]> = {
      // 动物宠物类
      猫: ['宠物', '动物', '猫粮', '猫砂', '喵', '猫咪'],
      狗: ['宠物', '动物', '狗粮', '汪', '狗狗'],
      宠物: ['猫', '狗', '动物', '养', '饲养'],
      动物: ['猫', '狗', '宠物', '生物'],

      // 工作职业类
      工作: ['职业', '公司', '上班', '就业', '工作单位', '单位'],
      职业: ['工作', '公司', '上班', '就业'],
      公司: ['工作', '职业', '上班', '企业', '单位'],
      上班: ['工作', '职业', '公司'],

      // 学习教育类
      学习: ['学校', '大学', '专业', '课程', '学业', '读书'],
      学校: ['学习', '大学', '学院', '就读', '教育'],
      大学: ['学校', '学习', '专业', '就读', '高校'],
      专业: ['学习', '大学', '学校', '学科'],
      课程: ['学习', '学校', '专业', '上课'],

      // 家庭关系类
      家人: ['父母', '爸爸', '妈妈', '兄弟', '姐妹', '家庭'],
      父母: ['爸爸', '妈妈', '家人', '家庭'],
      爸爸: ['父亲', '父母', '家人'],
      妈妈: ['母亲', '父母', '家人'],
      兄弟: ['哥哥', '弟弟', '家人'],
      姐妹: ['姐姐', '妹妹', '家人'],

      // 兴趣爱好类
      喜欢: ['爱好', '偏好', '喜爱', '兴趣'],
      爱好: ['喜欢', '偏好', '兴趣'],
      兴趣: ['喜欢', '爱好', '偏好'],

      // 地点位置类
      住: ['居住', '常住', '地址', '城市', '家'],
      居住: ['住', '常住', '地址', '城市'],
      城市: ['住', '居住', '地址', '地方'],
      地址: ['住', '居住', '城市', '位置'],

      // 饮食类
      吃: ['食物', '美食', '餐厅', '饮食'],
      食物: ['吃', '美食', '饮食'],
      美食: ['吃', '食物', '餐厅'],
      餐厅: ['吃', '美食', '饭店'],

      // 运动健康类
      运动: ['健身', '锻炼', '体育', '跑步'],
      健身: ['运动', '锻炼', '体育'],
      锻炼: ['运动', '健身', '体育'],

      // 娱乐休闲类
      游戏: ['玩', '娱乐', '电子游戏'],
      电影: ['看', '娱乐', '影片'],
      音乐: ['听', '歌', '娱乐'],
      旅游: ['旅行', '出游', '游玩'],
      旅行: ['旅游', '出游', '游玩'],

      // 情感状态类
      开心: ['高兴', '快乐', '愉快', '心情'],
      难过: ['伤心', '悲伤', '不开心', '心情'],
      生气: ['愤怒', '不满', '心情'],
      心情: ['情绪', '感受', '状态'],
    }

    const expandedKeywords = new Set<string>()

    // 遍历每个关键词，查找知识图谱中的相关概念
    for (const keyword of keywords) {
      // 保留原始关键词
      expandedKeywords.add(keyword)

      // 查找知识图谱中的映射
      if (knowledgeGraph[keyword]) {
        for (const relatedConcept of knowledgeGraph[keyword]) {
          expandedKeywords.add(relatedConcept)
        }
      }
    }

    return Array.from(expandedKeywords)
  }

  function searchRelevantMemories(query: string, limit = 5) {
    // 输入验证
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
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

    // ========== 语义搜索：使用知识图谱扩展关键词 ==========
    let finalKeywords = uniqueKeywords
    try {
      // 检查是否启用语义搜索功能
      if (memoryAdvancedSettings.settings.enableSemanticSearch) {
        // 使用知识图谱扩展关键词
        const expandedKeywords = expandKeywordsWithKnowledgeGraph(uniqueKeywords)
        // 使用扩展后的关键词
        finalKeywords = expandedKeywords
      }
    }
    catch (error) {
      // 语义扩展失败时，降级到原有逻辑
      console.error('[MemoryManager] 语义扩展失败，降级到原有逻辑:', error)
      finalKeywords = uniqueKeywords
    }

    if (finalKeywords.length === 0) {
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
        for (const keyword of finalKeywords) {
          if (textLower.includes(keyword)) {
            score += 10
            matchedKeywords.push(keyword)
          }
        }

        // 标签匹配
        if (entry.tags) {
          for (const tag of entry.tags) {
            if (finalKeywords.some(k => tag.toLowerCase().includes(k))) {
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

        return { entry, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(limit, 20))) // 限制在 1-20 之间

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
