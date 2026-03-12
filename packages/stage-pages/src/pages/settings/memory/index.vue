<script setup lang="ts">
import { useCharacterNotebookStore } from '@proj-airi/stage-ui/stores/character/notebook'
import { useMaintenanceLogStore } from '@proj-airi/stage-ui/stores/maintenance-log'
import { useMemorySettingsStore } from '@proj-airi/stage-ui/stores/settings/memory'
import { computed, ref } from 'vue'

const notebookStore = useCharacterNotebookStore()
const memorySettings = useMemorySettingsStore()
const maintenanceLog = useMaintenanceLogStore()
const searchQuery = ref('')
const selectedEntries = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)
const activeTab = ref<'config' | 'keywords' | 'manage' | 'merge' | 'maintenance' | 'stats' | 'logs'>('manage')
const isAddingKeyword = ref(false)
const editingKeywordId = ref<string | null>(null)
const keywordForm = ref({
  keyword: '',
  importance: 'medium' as 'low' | 'medium' | 'high',
  tags: '',
  description: '',
  enabled: true,
})
const mergeThreshold = ref(0.30)
const duplicateGroups = ref<Array<{ entry: any, duplicates: any[], similarity: number }>>([])
const isScanning = ref(false)

// 编辑记忆状态
const editingEntryId = ref<string | null>(null)
const entryForm = ref({
  text: '',
  tags: '',
  kind: 'note' as 'note' | 'focus' | 'diary',
})

// 加载数据
if (!notebookStore.isLoaded) {
  notebookStore.loadFromStorage()
}

// 筛选记忆
const filteredEntries = computed(() => {
  const entries = notebookStore.entries || []
  if (!searchQuery.value)
    return entries

  const query = searchQuery.value.toLowerCase()
  return entries.filter(entry =>
    entry.text.toLowerCase().includes(query),
  )
})

// 统计
const total = computed(() => notebookStore.entries?.length || 0)

const stats = computed(() => ({
  total: notebookStore.entries?.length || 0,
  high: notebookStore.entries?.filter(e => e.metadata?.importance === 'high').length || 0,
  medium: notebookStore.entries?.filter(e => e.metadata?.importance === 'medium').length || 0,
  focus: notebookStore.entries?.filter(e => e.kind === 'focus').length || 0,
  note: notebookStore.entries?.filter(e => e.kind === 'note').length || 0,
}))

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0)
    return '今天'
  if (days === 1)
    return '昨天'
  if (days < 7)
    return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 重要性颜色
function getImportanceColor(importance?: string) {
  if (importance === 'high')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (importance === 'medium')
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
}

// 删除单条记忆
function deleteEntry(id: string) {
  if (confirm('确定删除这条记忆？')) {
    notebookStore.removeEntry(id)
  }
}

// 打开编辑记忆表单
function openEditEntry(entry: any) {
  editingEntryId.value = entry.id
  entryForm.value = {
    text: entry.text,
    tags: entry.tags?.join(', ') || '',
    kind: entry.kind,
  }
}

// 保存编辑的记忆
function saveEntry() {
  if (!editingEntryId.value || !entryForm.value.text.trim())
    return

  const entry = notebookStore.entries.find(e => e.id === editingEntryId.value)
  if (!entry)
    return

  // 更新记忆内容
  entry.text = entryForm.value.text.trim()
  entry.kind = entryForm.value.kind
  entry.tags = entryForm.value.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  // 触发保存
  notebookStore.saveToStorage()

  // 关闭编辑表单
  editingEntryId.value = null
}

// 取消编辑
function cancelEditEntry() {
  editingEntryId.value = null
}

// 批量删除
function deleteSelected() {
  if (selectedEntries.value.size === 0)
    return
  if (confirm(`确定删除选中的 ${selectedEntries.value.size} 条记忆？`)) {
    selectedEntries.value.forEach(id => notebookStore.removeEntry(id))
    selectedEntries.value.clear()
    isSelectionMode.value = false
  }
}

// 删除关键词
function deleteKeyword(id: string) {
  if (confirm('确定删除这个关键词规则？')) {
    memorySettings.deleteKeyword(id)
  }
}

// 切换关键词启用状态
function toggleKeyword(id: string) {
  memorySettings.toggleKeyword(id)
}

// 打开添加关键词表单
function openAddKeyword() {
  keywordForm.value = {
    keyword: '',
    importance: 'medium',
    tags: '',
    description: '',
    enabled: true,
  }
  editingKeywordId.value = null
  isAddingKeyword.value = true
}

// 打开编辑关键词表单
function openEditKeyword(id: string) {
  const keyword = memorySettings.customKeywords.find(k => k.id === id)
  if (keyword) {
    keywordForm.value = {
      keyword: keyword.keyword,
      importance: keyword.importance,
      tags: keyword.tags.join(', '),
      description: keyword.description || '',
      enabled: keyword.enabled,
    }
    editingKeywordId.value = id
    isAddingKeyword.value = true
  }
}

// 保存关键词
function saveKeyword() {
  if (!keywordForm.value.keyword.trim())
    return

  const tags = keywordForm.value.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  if (editingKeywordId.value) {
    memorySettings.updateKeyword(editingKeywordId.value, {
      keyword: keywordForm.value.keyword.trim(),
      importance: keywordForm.value.importance,
      tags,
      description: keywordForm.value.description.trim(),
      enabled: keywordForm.value.enabled,
    })
  }
  else {
    memorySettings.addKeyword({
      keyword: keywordForm.value.keyword.trim(),
      importance: keywordForm.value.importance,
      tags,
      description: keywordForm.value.description.trim(),
      enabled: keywordForm.value.enabled,
    })
  }

  isAddingKeyword.value = false
}

// 取消编辑
function cancelKeywordEdit() {
  isAddingKeyword.value = false
  editingKeywordId.value = null
}

// 扫描重复记忆
function scanDuplicates() {
  isScanning.value = true
  duplicateGroups.value = []

  const entries = notebookStore.entries || []
  const processed = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    if (processed.has(entries[i].id))
      continue

    const duplicates = []
    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(entries[j].id))
        continue

      const similarity = calculateSimilarity(entries[i].text, entries[j].text)
      if (similarity >= mergeThreshold.value) {
        duplicates.push({ entry: entries[j], similarity })
        processed.add(entries[j].id)
      }
    }

    if (duplicates.length > 0) {
      duplicateGroups.value.push({
        entry: entries[i],
        duplicates: duplicates.map(d => d.entry),
        similarity: duplicates[0].similarity,
      })
      processed.add(entries[i].id)
    }
  }

  isScanning.value = false
}

// 执行维护
async function runMaintenance() {
  if (!confirm('确定立即执行维护操作？这可能需要一些时间。'))
    return

  console.log('[Maintenance] 开始维护...')

  try {
    let report = '维护报告：\n'
    let totalAffected = 0

    // 1. 自动去重
    if (memorySettings.settings.autoDeduplication) {
      console.log('[Maintenance] 执行自动去重...')
      const threshold = memorySettings.settings.deduplicationThreshold
      scanDuplicates()

      if (duplicateGroups.value.length > 0) {
        let mergedCount = 0
        for (const group of duplicateGroups.value) {
          await mergeGroup(group)
          mergedCount++
        }
        report += `- 合并了 ${mergedCount} 组重复记忆\n`
        totalAffected += mergedCount

        // 记录日志
        maintenanceLog.addLog({
          type: 'manual',
          action: 'deduplication',
          details: `去重操作：合并了 ${mergedCount} 组重复记忆（阈值: ${threshold})`,
          affectedCount: mergedCount,
          success: true,
        })
      }
      else {
        report += '- 未发现重复记忆\n'
      }
    }

    // 2. 自动归档
    if (memorySettings.settings.autoArchive) {
      console.log('[Maintenance] 执行自动归档...')
      const cutoffDate = Date.now() - (memorySettings.settings.archiveAfterDays * 24 * 60 * 60 * 1000)
      let archivedCount = 0

      notebookStore.entries.forEach((entry) => {
        if (entry.createdAt < cutoffDate && entry.kind !== 'diary') {
          entry.kind = 'diary'
          archivedCount++
        }
      })

      if (archivedCount > 0) {
        notebookStore.saveToStorage()
        report += `- 归档了 ${archivedCount} 条旧记忆\n`
        totalAffected += archivedCount

        // 记录日志
        maintenanceLog.addLog({
          type: 'manual',
          action: 'archive',
          details: `归档操作：将 ${archivedCount} 条超过 ${memorySettings.settings.archiveAfterDays} 天的记忆归档`,
          affectedCount: archivedCount,
          success: true,
        })
      }
      else {
        report += '- 无需归档\n'
      }
    }

    // 3. 自动清理
    if (memorySettings.settings.autoCleanup) {
      console.log('[Maintenance] 执行自动清理...')
      const maxMemories = memorySettings.settings.maxMemories
      const currentCount = notebookStore.entries.length

      if (currentCount > maxMemories) {
        const toDelete = currentCount - maxMemories

        // 按重要性和时间排序
        const sortedEntries = [...notebookStore.entries].sort((a, b) => {
          const importanceOrder = { high: 3, medium: 2, low: 1 }
          const aImportance = importanceOrder[a.metadata?.importance as string] || 1
          const bImportance = importanceOrder[b.metadata?.importance as string] || 1

          if (memorySettings.settings.cleanupLowImportance) {
            if (aImportance !== bImportance)
              return aImportance - bImportance
          }

          return a.createdAt - b.createdAt
        })

        // 删除最旧的低重要性记忆
        for (let i = 0; i < toDelete; i++) {
          notebookStore.removeEntry(sortedEntries[i].id)
        }

        report += `- 清理了 ${toDelete} 条记忆\n`
        totalAffected += toDelete

        // 记录日志
        maintenanceLog.addLog({
          type: 'manual',
          action: 'cleanup',
          details: `清理操作：删除了 ${toDelete} 条记忆（当前 ${currentCount} 条，限制 ${maxMemories} 条）`,
          affectedCount: toDelete,
          success: true,
        })
      }
      else {
        report += '- 无需清理\n'
      }
    }

    report += `\n维护完成！当前记忆总数: ${notebookStore.entries.length}`
    alert(report)
    console.log('[Maintenance] 维护完成')

    // 如果有操作，自动切换到日志标签页
    if (totalAffected > 0) {
      activeTab.value = 'logs'
    }
  }
  catch (error) {
    console.error('[Maintenance] 维护失败:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    alert(`维护失败: ${errorMsg}`)

    // 记录失败日志
    maintenanceLog.addLog({
      type: 'manual',
      action: 'cleanup',
      details: '维护操作失败',
      affectedCount: 0,
      success: false,
      error: errorMsg,
    })
  }
}

// 显示维护日志
function showMaintenanceLog() {
  activeTab.value = 'logs'
}

// 中文友好的相似度计算：bigram + 关键特征匹配
function calculateSimilarity(text1: string, text2: string): number {
  // 提取 2-gram（连续2个字符）
  function getBigrams(text: string): Set<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, '')
    const bigrams = new Set<string>()
    for (let i = 0; i < normalized.length - 1; i++) {
      bigrams.add(normalized.slice(i, i + 2))
    }
    return bigrams
  }

  // 提取关键特征（姓名、年龄、性别、地点等）
  function extractKeyFeatures(text: string): Set<string> {
    const features = new Set<string>()
    const lower = text.toLowerCase()

    // 姓名特征 - 更宽松的匹配
    const nameMatches = text.match(/秋医|疫医|[\u4E00-\u9FA5]{2,4}(?=[，。、是叫/])/g)
    if (nameMatches)
      nameMatches.forEach(m => features.add(`姓名:${m}`))

    // 年龄特征
    const ageMatches = text.match(/\d+岁|\d+歲/g)
    if (ageMatches)
      ageMatches.forEach(m => features.add(`年龄:${m}`))

    // 性别特征
    if (lower.includes('男'))
      features.add('性别:男')
    if (lower.includes('女'))
      features.add('性别:女')

    // 地点特征（城市名和省份）
    const cityMatches = text.match(/长沙|湖南|北京|上海|广州|深圳|成都|武汉|西安|杭州/g)
    if (cityMatches)
      cityMatches.forEach(m => features.add(`地点:${m}`))

    // 学校/机构特征
    if (text.includes('大学') || text.includes('学院')) {
      const schoolMatch = text.match(/[\u4E00-\u9FA5]+大学|[\u4E00-\u9FA5]+学院/g)
      if (schoolMatch)
        schoolMatch.forEach(m => features.add(`学校:${m}`))
    }

    return features
  }

  const bigrams1 = getBigrams(text1)
  const bigrams2 = getBigrams(text2)
  const features1 = extractKeyFeatures(text1)
  const features2 = extractKeyFeatures(text2)

  if (bigrams1.size === 0 || bigrams2.size === 0)
    return 0

  // Bigram 相似度
  const bigramIntersection = new Set([...bigrams1].filter(x => bigrams2.has(x)))
  const bigramUnion = new Set([...bigrams1, ...bigrams2])
  const jaccard = bigramIntersection.size / bigramUnion.size
  const containment1 = bigramIntersection.size / bigrams1.size
  const containment2 = bigramIntersection.size / bigrams2.size
  const maxContainment = Math.max(containment1, containment2)
  const bigramScore = Math.max(jaccard, maxContainment)

  // 关键特征匹配度
  const featureIntersection = new Set([...features1].filter(x => features2.has(x)))
  let featureBonus = 0
  if (features1.size > 0 && features2.size > 0) {
    const featureMatchRatio = featureIntersection.size / Math.min(features1.size, features2.size)
    // 如果有关键特征匹配，给予大幅加成
    featureBonus = featureMatchRatio * 0.7 // 最多加 70%
  }

  // 综合得分
  return Math.min(1.0, bigramScore + featureBonus)
}

// 提取文本中的特征（复用相似度计算中的逻辑）
function extractFeatures(text: string): string[] {
  const features: string[] = []

  // 姓名特征
  const nameMatches = text.match(/秋医|疫医|[\u4E00-\u9FA5]{2,4}(?=[，。、是叫/])/g)
  if (nameMatches)
    nameMatches.forEach(m => features.push(`姓名:${m}`))

  // 年龄特征
  const ageMatches = text.match(/\d+岁|\d+歲/g)
  if (ageMatches)
    ageMatches.forEach(m => features.push(`年龄:${m}`))

  // 性别特征
  if (text.includes('男'))
    features.push('性别:男')
  if (text.includes('女'))
    features.push('性别:女')

  // 地点特征
  const cityMatches = text.match(/长沙|湖南|北京|上海|广州|深圳|成都|武汉|西安|杭州/g)
  if (cityMatches)
    cityMatches.forEach(m => features.push(`地点:${m}`))

  // 学校特征
  const schoolMatch = text.match(/[\u4E00-\u9FA5]+大学|[\u4E00-\u9FA5]+学院/g)
  if (schoolMatch)
    schoolMatch.forEach(m => features.push(`学校:${m}`))

  // 爱好特征
  const hobbyMatches = text.match(/爱好[^，。、]+|喜欢[^，。、]+|爱玩[^，。、]+|爱吃[^，。、]+/g)
  if (hobbyMatches)
    hobbyMatches.forEach(m => features.push(`爱好:${m}`))

  // 游戏/活动节点（用户要求记住的主题）
  const gameMatches = text.match(/《[^》]+》|玩[^，。、]{2,8}(?=游戏|时|的)/g)
  if (gameMatches)
    gameMatches.forEach(m => features.push(`活动节点:${m}`))

  // 明确要求记住的内容
  if (text.match(/记住|别忘|一定要记得|帮我记录/)) {
    const rememberMatch = text.match(/(?:记住|别忘|一定要记得|帮我记录)[^，。、]{2,20}/g)
    if (rememberMatch)
      rememberMatch.forEach(m => features.push(`明确要求:${m}`))
  }

  // 特殊日期（生日、纪念日等）
  const dateMatches = text.match(/生日[是在]?\d+月\d+[日号]?|\d+月\d+[日号].*生日|纪念日/g)
  if (dateMatches)
    dateMatches.forEach(m => features.push(`特殊日期:${m}`))

  // 重要事件（发生了什么）
  const eventMatches = text.match(/完成了[^，。、]+|获得了[^，。、]+|抽到了[^，。、]+|通过了[^，。、]+/g)
  if (eventMatches)
    eventMatches.forEach(m => features.push(`事件:${m}`))

  return features
}

// 使用 AI 总结合并的记忆
async function summarizeMemories(texts: string[]): Promise<string> {
  try {
    const { useConsciousnessStore } = await import('@proj-airi/stage-ui/stores/modules/consciousness')
    const { useProvidersStore } = await import('@proj-airi/stage-ui/stores/providers')
    const { generateText } = await import('@xsai/generate-text')

    const consciousnessStore = useConsciousnessStore()
    const providersStore = useProvidersStore()

    const model = consciousnessStore.activeModel
    const providerName = consciousnessStore.activeProvider

    if (!model || !providerName) {
      console.warn('[MemorySummarize] No active model, using simple merge')
      return texts.join(' | ')
    }

    const providerConfig = providersStore.getProviderConfig(providerName)
    const provider = await providersStore.getProviderInstance(providerName)

    const prompt = `以下是多条相似的记忆，请合并去重，只保留不重复的关键信息，用简洁的语言总结（不超过100字）：

${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

要求：
1. 去除重复信息（如"21岁"只保留一次）
2. 保留所有不同的信息点
3. 用自然流畅的语言组织
4. 不要添加原文没有的信息

直接输出总结文本，不要其他内容：`

    const chatConfig = provider.chat(model)
    const finalConfig = {
      ...chatConfig,
      ...providerConfig,
      messages: [{ role: 'user', content: prompt }],
    }

    const response = await generateText(finalConfig)
    const summary = response.text?.trim() || texts.join(' | ')

    console.log('[MemorySummarize] AI summary:', summary)
    return summary
  }
  catch (error) {
    console.error('[MemorySummarize] Failed to summarize:', error)
    return texts.join(' | ')
  }
}

// 合并记忆组
async function mergeGroup(group: any) {
  if (!confirm(`确定合并这 ${group.duplicates.length + 1} 条相似记忆？`))
    return

  // 收集所有记忆条目（按时间排序）
  const allEntries = [group.entry, ...group.duplicates].sort((a, b) => a.createdAt - b.createdAt)

  // 提取每条记忆的特征，记录首次提及时间
  const featureTimeline: Record<string, { firstMentioned: number, text: string }> = {}

  // 识别记忆节点（主题）
  const memoryNodes: Record<string, Array<{ time: number, event: string }>> = {}

  allEntries.forEach((entry) => {
    const features = extractFeatures(entry.text)
    features.forEach((feature) => {
      // 只记录首次提及的时间
      if (!featureTimeline[feature]) {
        featureTimeline[feature] = {
          firstMentioned: entry.createdAt,
          text: entry.text,
        }
      }

      // 如果是活动节点，收集相关事件
      if (feature.startsWith('活动节点:')) {
        const nodeName = feature.replace('活动节点:', '')
        if (!memoryNodes[nodeName]) {
          memoryNodes[nodeName] = []
        }

        // 提取该条记忆中的事件
        const events = features.filter(f => f.startsWith('事件:'))
        events.forEach((event) => {
          memoryNodes[nodeName].push({
            time: entry.createdAt,
            event: event.replace('事件:', ''),
          })
        })

        // 如果没有明确事件，记录整条文本
        if (events.length === 0) {
          memoryNodes[nodeName].push({
            time: entry.createdAt,
            event: entry.text,
          })
        }
      }
    })
  })

  // 生成节点概括
  const nodeSummaries: Record<string, string> = {}
  Object.entries(memoryNodes).forEach(([nodeName, events]) => {
    const eventList = events.map((e) => {
      const date = new Date(e.time).toLocaleDateString('zh-CN')
      return `${date}: ${e.event}`
    }).join('; ')
    nodeSummaries[nodeName] = `共${events.length}个事件 - ${eventList}`
  })

  // 使用 AI 总结合并文本，去除重复信息
  const allTexts = allEntries.map(e => e.text)
  const mergedText = await summarizeMemories(allTexts)

  // 合并标签
  const allTags = new Set<string>()
  allEntries.forEach((entry) => {
    if (entry.tags)
      entry.tags.forEach((t: string) => allTags.add(t))
  })

  // 记录原始时间线
  const timeline = allEntries.map(e => ({ time: e.createdAt, text: e.text }))

  // 删除旧记忆
  notebookStore.removeEntry(group.entry.id)
  group.duplicates.forEach((d: any) => notebookStore.removeEntry(d.id))

  // 添加合并后的记忆
  const kind = group.entry.kind === 'focus' ? 'focus' : 'note'
  if (kind === 'focus') {
    notebookStore.addFocusEntry(mergedText, {
      tags: Array.from(allTags),
      metadata: {
        importance: group.entry.metadata?.importance || 'medium',
        merged: true,
        timeline,
        featureTimeline, // 特征时间线：记录每个特征首次提及的时间
        memoryNodes, // 记忆节点：按主题组织的事件
        nodeSummaries, // 节点概括
        mergedCount: allEntries.length,
        originalCreatedAt: allEntries[0].createdAt, // 保留最早的创建时间
      },
    })
  }
  else {
    notebookStore.addNote(mergedText, {
      tags: Array.from(allTags),
      metadata: {
        importance: group.entry.metadata?.importance || 'medium',
        merged: true,
        timeline,
        featureTimeline, // 特征时间线
        memoryNodes, // 记忆节点
        nodeSummaries, // 节点概括
        mergedCount: allEntries.length,
        originalCreatedAt: allEntries[0].createdAt,
      },
    })
  }

  // 重新扫描
  scanDuplicates()
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-4">
    <!-- 标题 -->
    <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 class="mb-2 text-2xl font-bold">
        记忆体管理
      </h2>
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        管理 AI 的长期记忆 ({{ stats.total }} 条)
      </p>

      <!-- 标签页导航 -->
      <div class="mt-4 flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          :class="activeTab === 'config' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'config'"
        >
          配置
        </button>
        <button
          :class="activeTab === 'keywords' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'keywords'"
        >
          关键词 ({{ memorySettings.customKeywords.length }})
        </button>
        <button
          :class="activeTab === 'manage' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'manage'"
        >
          管理 ({{ stats.total }})
        </button>
        <button
          :class="activeTab === 'merge' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'merge'"
        >
          合并
        </button>
        <button
          :class="activeTab === 'maintenance' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'maintenance'"
        >
          维护
        </button>
        <button
          :class="activeTab === 'stats' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'stats'"
        >
          统计
        </button>
        <button
          :class="activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-600 dark:text-neutral-400'"
          class="px-4 py-2 transition-colors"
          @click="activeTab = 'logs'"
        >
          日志 ({{ maintenanceLog.logs.length }})
        </button>
      </div>
    </div>

    <!-- 配置标签页 -->
    <div v-if="activeTab === 'config'" class="flex flex-col gap-4">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">
              启用记忆系统
            </div>
            <div class="text-sm text-neutral-500 dark:text-neutral-400">
              自动提取对话中的重要信息
            </div>
          </div>
          <input
            v-model="memorySettings.settings.enabled"
            type="checkbox"
            class="h-5 w-5"
          >
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">
              自动提取
            </div>
            <div class="text-sm text-neutral-500 dark:text-neutral-400">
              对话完成后自动分析并提取记忆
            </div>
          </div>
          <input
            v-model="memorySettings.settings.autoExtract"
            type="checkbox"
            class="h-5 w-5"
            :disabled="!memorySettings.settings.enabled"
          >
        </div>
      </div>
    </div>

    <!-- 关键词标签页 -->
    <div v-if="activeTab === 'keywords'" class="flex flex-col gap-4">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="mb-1 text-lg font-semibold">
              关键词规则
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              自定义记忆提取的关键词和规则
            </p>
          </div>
          <button
            class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            @click="openAddKeyword"
          >
            添加关键词
          </button>
        </div>
      </div>

      <!-- 添加/编辑表单 -->
      <div v-if="isAddingKeyword" class="border-2 border-blue-200/50 rounded-xl bg-blue-50/70 p-4 shadow-sm dark:border-blue-800/60 dark:bg-blue-900/20">
        <h4 class="mb-4 font-semibold">
          {{ editingKeywordId ? '编辑关键词' : '添加关键词' }}
        </h4>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-sm font-medium">关键词模式 *</label>
            <input
              v-model="keywordForm.keyword"
              type="text"
              placeholder="例如: 我叫|我是|我的名字"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              使用 | 分隔多个关键词
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">重要性</label>
            <select
              v-model="keywordForm.importance"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
              <option value="low">
                低
              </option>
              <option value="medium">
                中
              </option>
              <option value="high">
                高
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">标签</label>
            <input
              v-model="keywordForm.tags"
              type="text"
              placeholder="例如: 个人信息, 姓名"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              用逗号分隔多个标签
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">描述</label>
            <input
              v-model="keywordForm.description"
              type="text"
              placeholder="例如: 用户姓名"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="keywordForm.enabled"
              type="checkbox"
              class="h-4 w-4"
            >
            <label class="text-sm">启用此规则</label>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              @click="saveKeyword"
            >
              保存
            </button>
            <button
              class="rounded-lg bg-neutral-200 px-4 py-2 transition-colors dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
              @click="cancelKeywordEdit"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- 关键词列表 -->
      <div class="flex flex-col gap-3">
        <div
          v-for="keyword in memorySettings.customKeywords"
          :key="keyword.id"
          class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60"
          :class="{ 'opacity-50': !keyword.enabled }"
        >
          <div class="mb-2 flex items-start justify-between">
            <div class="flex-1">
              <div class="mb-2 flex items-center gap-2">
                <span
                  :class="getImportanceColor(keyword.importance)"
                  class="rounded px-2 py-1 text-xs font-medium"
                >
                  {{ keyword.importance === 'high' ? '高' : keyword.importance === 'medium' ? '中' : '低' }}
                </span>
                <span class="text-sm font-mono">{{ keyword.keyword }}</span>
                <span
                  v-if="!keyword.enabled"
                  class="rounded bg-neutral-200 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                >
                  已禁用
                </span>
              </div>
              <p v-if="keyword.description" class="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                {{ keyword.description }}
              </p>
              <div v-if="keyword.tags && keyword.tags.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="tag in keyword.tags"
                  :key="tag"
                  class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="text-sm text-blue-500 font-medium hover:text-blue-700"
                @click="toggleKeyword(keyword.id)"
              >
                {{ keyword.enabled ? '禁用' : '启用' }}
              </button>
              <button
                class="text-sm text-neutral-500 font-medium hover:text-neutral-700"
                @click="openEditKeyword(keyword.id)"
              >
                编辑
              </button>
              <button
                class="text-sm text-red-500 font-medium hover:text-red-700"
                @click="deleteKeyword(keyword.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索 -->
    <div v-if="activeTab === 'manage'" class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div class="flex gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索记忆..."
          class="flex-1 border border-neutral-300 rounded-lg bg-white px-4 py-2 dark:border-neutral-600 dark:bg-neutral-800"
        >
        <button
          v-if="!isSelectionMode"
          class="rounded-lg bg-neutral-200 px-4 py-2 transition-colors dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
          @click="isSelectionMode = true"
        >
          批量选择
        </button>
        <template v-else>
          <button
            class="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            :disabled="selectedEntries.size === 0"
            @click="deleteSelected"
          >
            删除 ({{ selectedEntries.size }})
          </button>
          <button
            class="rounded-lg bg-neutral-200 px-4 py-2 transition-colors dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"
            @click="() => { isSelectionMode = false; selectedEntries.clear() }"
          >
            取消
          </button>
        </template>
      </div>
    </div>

    <!-- 记忆列表 -->
    <div v-if="activeTab === 'manage' && filteredEntries.length > 0" class="flex flex-col gap-3">
      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60"
      >
        <div class="mb-3 flex items-start justify-between">
          <!-- 标签行 -->
          <div class="flex items-center gap-2">
            <input
              v-if="isSelectionMode"
              type="checkbox"
              :checked="selectedEntries.has(entry.id)"
              class="h-4 w-4"
              @change="(e) => {
                if ((e.target as HTMLInputElement).checked) {
                  selectedEntries.add(entry.id)
                }
                else {
                  selectedEntries.delete(entry.id)
                }
              }"
            >
            <span
              v-if="entry.metadata?.importance"
              :class="getImportanceColor(entry.metadata.importance)"
              class="rounded px-2 py-1 text-xs font-medium"
            >
              {{ entry.metadata.importance === 'high' ? '高' : entry.metadata.importance === 'medium' ? '中' : '普通' }}
            </span>
            <span
              :class="entry.kind === 'focus' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'"
              class="rounded px-2 py-1 text-xs font-medium"
            >
              {{ entry.kind === 'focus' ? '焦点' : '笔记' }}
            </span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ formatTime(entry.createdAt) }}
            </span>
          </div>
          <!-- 删除按钮 -->
          <div class="flex gap-2">
            <button
              v-if="!isSelectionMode && editingEntryId !== entry.id"
              class="text-sm text-blue-500 font-medium hover:text-blue-700"
              @click="openEditEntry(entry)"
            >
              编辑
            </button>
            <button
              v-if="!isSelectionMode && editingEntryId !== entry.id"
              class="text-sm text-red-500 font-medium hover:text-red-700"
              @click="deleteEntry(entry.id)"
            >
              删除
            </button>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div v-if="editingEntryId === entry.id" class="mt-3 border border-blue-200 rounded-lg bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-sm font-medium">内容 *</label>
              <textarea
                v-model="entryForm.text"
                rows="3"
                class="w-full resize-none border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                placeholder="记忆内容"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">标签</label>
              <input
                v-model="entryForm.tags"
                type="text"
                class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                placeholder="用逗号分隔，如: 个人信息, 姓名"
              >
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">类型</label>
              <select
                v-model="entryForm.kind"
                class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="note">
                  笔记
                </option>
                <option value="focus">
                  焦点
                </option>
                <option value="diary">
                  日记
                </option>
              </select>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                @click="saveEntry"
              >
                保存
              </button>
              <button
                class="rounded-lg bg-neutral-300 px-4 py-2 transition-colors dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                @click="cancelEditEntry"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- 内容 -->
        <p v-if="editingEntryId !== entry.id" class="mb-2 text-neutral-800 dark:text-neutral-200">
          {{ entry.text }}
        </p>

        <!-- 标签 -->
        <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="tag in entry.tags"
            :key="tag"
            class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="activeTab === 'manage' && filteredEntries.length === 0" class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div class="mb-4 text-6xl opacity-30">
        📝
      </div>
      <p class="text-neutral-500 dark:text-neutral-400">
        {{ searchQuery ? '没有找到匹配的记忆' : '暂无记忆' }}
      </p>
    </div>

    <!-- 合并标签页 -->
    <div v-if="activeTab === 'merge'" class="flex flex-col gap-4">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h3 class="mb-3 text-lg font-semibold">
          记忆合并
        </h3>
        <p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          检测并合并相似的记忆，保留完整时间线
        </p>

        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">相似度阈值: {{ Math.round(mergeThreshold * 100) }}%</label>
          <input
            v-model.number="mergeThreshold"
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            class="w-full"
          >
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            阈值越高，合并越严格（只合并非常相似的记忆）
          </p>
        </div>

        <button
          class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          :disabled="isScanning"
          @click="scanDuplicates"
        >
          {{ isScanning ? '扫描中...' : '扫描重复记忆' }}
        </button>
      </div>

      <!-- 重复记忆组 -->
      <div v-if="duplicateGroups.length > 0" class="flex flex-col gap-3">
        <div
          v-for="(group, index) in duplicateGroups"
          :key="index"
          class="border-2 border-orange-200/50 rounded-xl bg-orange-50/70 p-4 shadow-sm dark:border-orange-800/60 dark:bg-orange-900/20"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="text-orange-700 font-semibold dark:text-orange-400">
              发现 {{ group.duplicates.length + 1 }} 条相似记忆 (相似度: {{ Math.round(group.similarity * 100) }}%)
            </div>
            <button
              class="rounded-lg bg-orange-500 px-3 py-1 text-sm text-white transition-colors hover:bg-orange-600"
              @click="mergeGroup(group)"
            >
              合并
            </button>
          </div>

          <div class="space-y-2">
            <div class="rounded-lg bg-white p-3 dark:bg-neutral-800">
              <div class="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                {{ formatTime(group.entry.createdAt) }}
              </div>
              <p class="text-sm">
                {{ group.entry.text }}
              </p>
            </div>
            <div
              v-for="dup in group.duplicates"
              :key="dup.id"
              class="rounded-lg bg-white p-3 dark:bg-neutral-800"
            >
              <div class="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                {{ formatTime(dup.createdAt) }}
              </div>
              <p class="text-sm">
                {{ dup.text }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 无重复 -->
      <div v-else-if="!isScanning && duplicateGroups.length === 0" class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-4 text-6xl opacity-30">
          ✨
        </div>
        <p class="text-neutral-500 dark:text-neutral-400">
          未发现重复记忆
        </p>
      </div>
    </div>

    <!-- 维护标签页 -->
    <div v-if="activeTab === 'maintenance'" class="flex flex-col gap-4">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h3 class="mb-3 text-lg font-semibold">
          自动维护
        </h3>
        <p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          定期自动整理和优化记忆
        </p>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">
                启用自动维护
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                定期自动去重、归档和清理
              </div>
            </div>
            <input
              v-model="memorySettings.settings.autoMaintenance"
              type="checkbox"
              class="h-5 w-5"
            >
          </div>

          <div v-if="memorySettings.settings.autoMaintenance">
            <label class="mb-2 block text-sm font-medium">维护间隔（小时）</label>
            <input
              v-model.number="memorySettings.settings.maintenanceInterval"
              type="number"
              min="1"
              max="168"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              建议：24小时
            </p>
          </div>
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h3 class="mb-3 text-lg font-semibold">
          自动去重
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">
                启用自动去重
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                自动合并相似记忆
              </div>
            </div>
            <input
              v-model="memorySettings.settings.autoDeduplication"
              type="checkbox"
              class="h-5 w-5"
              :disabled="!memorySettings.settings.autoMaintenance"
            >
          </div>

          <div v-if="memorySettings.settings.autoDeduplication">
            <label class="mb-2 block text-sm font-medium">去重阈值: {{ Math.round(memorySettings.settings.deduplicationThreshold * 100) }}%</label>
            <input
              v-model.number="memorySettings.settings.deduplicationThreshold"
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              class="w-full"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              阈值越高，合并越严格
            </p>
          </div>
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h3 class="mb-3 text-lg font-semibold">
          自动归档
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">
                启用自动归档
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                将旧记忆转为日记
              </div>
            </div>
            <input
              v-model="memorySettings.settings.autoArchive"
              type="checkbox"
              class="h-5 w-5"
              :disabled="!memorySettings.settings.autoMaintenance"
            >
          </div>

          <div v-if="memorySettings.settings.autoArchive">
            <label class="mb-2 block text-sm font-medium">归档天数</label>
            <input
              v-model.number="memorySettings.settings.archiveAfterDays"
              type="number"
              min="30"
              max="365"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              超过此天数的记忆将被归档
            </p>
          </div>
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h3 class="mb-3 text-lg font-semibold">
          自动清理
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">
                启用自动清理
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                限制记忆总数
              </div>
            </div>
            <input
              v-model="memorySettings.settings.autoCleanup"
              type="checkbox"
              class="h-5 w-5"
              :disabled="!memorySettings.settings.autoMaintenance"
            >
          </div>

          <div v-if="memorySettings.settings.autoCleanup">
            <label class="mb-2 block text-sm font-medium">最大记忆数量</label>
            <input
              v-model.number="memorySettings.settings.maxMemories"
              type="number"
              min="100"
              max="10000"
              step="100"
              class="w-full border border-neutral-300 rounded-lg bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
            >
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              超过此数量将删除最旧的低重要性记忆
            </p>

            <div class="mt-3 flex items-center gap-2">
              <input
                v-model="memorySettings.settings.cleanupLowImportance"
                type="checkbox"
                class="h-4 w-4"
              >
              <label class="text-sm">优先清理低重要性记忆</label>
            </div>
          </div>
        </div>
      </div>

      <div class="border-2 border-green-200/50 rounded-xl bg-green-50/70 p-4 shadow-sm dark:border-green-800/60 dark:bg-green-900/20">
        <h3 class="mb-3 text-lg font-semibold">
          手动维护
        </h3>
        <p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          立即执行维护操作
        </p>

        <div class="flex gap-2">
          <button
            class="rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
            @click="runMaintenance"
          >
            立即维护
          </button>
          <button
            class="rounded-lg bg-neutral-300 px-4 py-2 transition-colors dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
            @click="showMaintenanceLog"
          >
            查看日志
          </button>
        </div>
      </div>
    </div>

    <!-- 统计标签页 -->
    <div v-if="activeTab === 'stats'" class="grid grid-cols-2 gap-4 md:grid-cols-3">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-2 text-3xl text-blue-600 font-bold dark:text-blue-400">
          {{ stats.total }}
        </div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          总记忆数
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-2 text-3xl text-red-600 font-bold dark:text-red-400">
          {{ stats.high }}
        </div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          高重要性
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-2 text-3xl text-yellow-600 font-bold dark:text-yellow-400">
          {{ stats.medium }}
        </div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          中重要性
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-2 text-3xl text-purple-600 font-bold dark:text-purple-400">
          {{ stats.focus }}
        </div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          焦点记忆
        </div>
      </div>

      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-6 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-2 text-3xl text-neutral-600 font-bold dark:text-neutral-400">
          {{ stats.note }}
        </div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          笔记记忆
        </div>
      </div>
    </div>

    <!-- 日志标签页 -->
    <div v-if="activeTab === 'logs'" class="flex flex-col gap-4">
      <div class="border-2 border-neutral-200/50 rounded-xl bg-white/70 p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">
              维护日志
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              记录所有自动和手动维护操作
            </p>
          </div>
          <button
            class="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
            @click="maintenanceLog.clearLogs()"
          >
            清空日志
          </button>
        </div>

        <!-- 日志列表 -->
        <div v-if="maintenanceLog.logs.length === 0" class="py-8 text-center text-neutral-500 dark:text-neutral-400">
          暂无维护日志
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="log in maintenanceLog.logs"
            :key="log.id"
            class="border border-neutral-200 rounded-lg p-4 dark:border-neutral-700"
            :class="{
              'bg-green-50 dark:bg-green-900/20': log.success,
              'bg-red-50 dark:bg-red-900/20': !log.success,
            }"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class="rounded px-2 py-0.5 text-xs"
                    :class="{
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': log.type === 'auto',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400': log.type === 'manual',
                    }"
                  >
                    {{ log.type === 'auto' ? '自动' : '手动' }}
                  </span>
                  <span
                    class="rounded px-2 py-0.5 text-xs"
                    :class="{
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': log.action === 'deduplication',
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': log.action === 'merge',
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400': log.action === 'archive',
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': log.action === 'cleanup',
                    }"
                  >
                    {{
                      log.action === 'deduplication' ? '去重'
                      : log.action === 'merge' ? '合并'
                        : log.action === 'archive' ? '归档'
                          : '清理'
                    }}
                  </span>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">
                    {{ new Date(log.timestamp).toLocaleString('zh-CN') }}
                  </span>
                </div>
                <div class="mb-1 text-sm">
                  {{ log.details }}
                </div>
                <div class="text-xs text-neutral-600 dark:text-neutral-400">
                  影响 {{ log.affectedCount }} 条记忆
                </div>
                <div v-if="!log.success && log.error" class="mt-1 text-xs text-red-600 dark:text-red-400">
                  错误: {{ log.error }}
                </div>
              </div>
              <div
                class="ml-4"
                :class="{
                  'text-green-600 dark:text-green-400': log.success,
                  'text-red-600 dark:text-red-400': !log.success,
                }"
              >
                <div v-if="log.success" class="i-solar:check-circle-bold text-xl" />
                <div v-else class="i-solar:close-circle-bold text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.memory.description
  icon: i-solar:notebook-bold-duotone
  settingsEntry: true
  order: 5
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
