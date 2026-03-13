import type { MemoryExtractionResult } from './memory-extractor'

import { extractMemoryFromConversation } from './memory-extractor'
import { analyzeMessageImportance } from './memory-heuristics'

export async function hybridMemoryExtraction(
  userMessage: string,
  assistantMessage: string,
): Promise<MemoryExtractionResult | null> {
  // 第一步：规则快速筛选
  const heuristicResult = analyzeMessageImportance(userMessage)

  // 如果规则判断不重要，直接跳过
  if (!heuristicResult.shouldRemember) {
    return null
  }

  // 检测是否是 AI 设定相关的记忆
  const isAiSetting = detectAiSetting(userMessage)
  if (isAiSetting) {
    // 确保包含 AI设定 标签
    if (!heuristicResult.tags.includes('AI设定')) {
      heuristicResult.tags.push('AI设定')
    }
  }

  // 如果规则判断为高优先级，用 LLM 精确分析
  if (heuristicResult.importance === 'high') {
    try {
      const llmResult = await extractMemoryFromConversation(userMessage, assistantMessage)
      if (llmResult) {
        // 如果是 AI 设定，确保添加标签
        if (isAiSetting && !llmResult.tags.includes('AI设定')) {
          llmResult.tags.push('AI设定')
        }
        return llmResult
      }
      else {
        return null
      }
    }
    catch (error) {
      console.error('[HybridMemory] LLM extraction failed, falling back to heuristic result:', error)
      // LLM 失败时降级使用规则结果
      return {
        shouldRemember: true,
        importance: heuristicResult.importance,
        summary: heuristicResult.summary,
        tags: heuristicResult.tags,
        reason: `匹配规则：${heuristicResult.matchedRules.map(r => r.description).join(', ')}`,
      }
    }
  }

  // 中优先级直接使用规则结果
  return {
    shouldRemember: true,
    importance: heuristicResult.importance,
    summary: heuristicResult.summary,
    tags: heuristicResult.tags,
    reason: `匹配规则：${heuristicResult.matchedRules.map(r => r.description).join(', ')}`,
  }
}

/**
 * 检测用户消息是否是对 AI 的设定
 * 返回 true 表示这是用户对 AI 的设定或期望
 */
function detectAiSetting(userMessage: string): boolean {
  const text = userMessage.toLowerCase()

  // AI 设定关键词模式
  const aiSettingPatterns = [
    // 直接设定
    /你([是叫要会得]|的名字|应该|需要|可以)/,
    /你的(名字|性格|角色|设定|特点)/,
    /把你(叫|称为|当作|设定为)/,
    /称呼你/,
    /叫你/,

    // 角色扮演
    /扮演|角色|人设|性格|特点/,
    /你要(表现|展现|体现)/,

    // 行为规则
    /你(不能|不要|不可以|禁止|必须|一定要)/,
    /规则|要求|限制/,

    // 能力设定
    /你(能|会|可以|擅长|精通)/,
  ]

  // 检查是否匹配任何模式
  return aiSettingPatterns.some(pattern => pattern.test(text))
}
