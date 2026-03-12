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
    console.log('[HybridMemory] No important patterns detected, skipping')
    return null
  }

  console.log('[HybridMemory] Heuristic analysis:', {
    importance: heuristicResult.importance,
    matchedRules: heuristicResult.matchedRules.map(r => r.description),
  })

  // 如果规则判断为高优先级，用 LLM 精确分析
  if (heuristicResult.importance === 'high') {
    console.log('[HybridMemory] High importance detected, using LLM for precise analysis')
    try {
      const llmResult = await extractMemoryFromConversation(userMessage, assistantMessage)
      if (llmResult) {
        console.log('[HybridMemory] LLM extraction successful:', llmResult)
        return llmResult
      }
      else {
        console.log('[HybridMemory] LLM decided not to remember')
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
  console.log('[HybridMemory] Medium importance, using heuristic result')
  return {
    shouldRemember: true,
    importance: heuristicResult.importance,
    summary: heuristicResult.summary,
    tags: heuristicResult.tags,
    reason: `匹配规则：${heuristicResult.matchedRules.map(r => r.description).join(', ')}`,
  }
}
