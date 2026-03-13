import type { ChatProvider } from '@xsai-ext/providers/utils'

import { generateText } from '@xsai/generate-text'

import { useConsciousnessStore } from '../modules/consciousness'
import { useProvidersStore } from '../providers'

export interface MemoryExtractionResult {
  shouldRemember: boolean
  importance: 'low' | 'medium' | 'high'
  summary: string
  tags: string[]
  reason: string
}

export async function extractMemoryFromConversation(
  userMessage: string,
  assistantMessage: string,
): Promise<MemoryExtractionResult | null> {
  const consciousnessStore = useConsciousnessStore()
  const providersStore = useProvidersStore()

  const model = consciousnessStore.activeModel
  const providerName = consciousnessStore.activeProvider

  if (!model || !providerName) {
    console.warn('[MemoryExtractor] No active model or provider configured')
    return null
  }

  try {
    const providerConfig = providersStore.getProviderConfig(providerName)
    const provider = await providersStore.getProviderInstance<ChatProvider>(providerName)

    const prompt = `分析以下对话，判断是否包含需要长期记住的重要信息。

对话内容：
用户：${userMessage}
助手：${assistantMessage}

请判断：
1. 是否需要记住这段对话？
   - 如果用户明确说"记住"、"别忘了"等，必须记住
   - 用户的个人信息（姓名、年龄、性别、居住地等）必须记住
   - 用户的偏好、重要事件、待办事项等需要记住
   - 即使用户说"测试"，只要包含真实个人信息，也应该记住
2. 重要程度：low（一般闲聊）/ medium（有用信息）/ high（关键信息）
3. 如果需要记住，提取关键信息摘要（50字以内，只提取事实信息）
4. 添加标签（如：个人信息、偏好、事件、任务等，最多3个）
5. 说明为什么需要记住（20字以内）

以 JSON 格式回复，不要包含任何其他文字：
{
  "shouldRemember": true,
  "importance": "high",
  "summary": "用户姓名张三，25岁",
  "tags": ["个人信息", "姓名", "年龄"],
  "reason": "用户自我介绍"
}`

    const chatConfig = provider.chat(model)

    // 确保 providerConfig 的优先级更高，特别是 baseUrl 和 apiKey
    const finalConfig = {
      ...chatConfig,
      ...providerConfig,
      messages: [{ role: 'user' as const, content: prompt }],
    }

    const response = await generateText(finalConfig)

    // 尝试提取 JSON（可能被包裹在代码块中）
    let jsonText = response.text?.trim() || ''
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const result = JSON.parse(jsonText) as MemoryExtractionResult

    // 验证结果完整性
    if (!result || typeof result.shouldRemember !== 'boolean') {
      throw new Error('Invalid LLM response format')
    }

    return result.shouldRemember ? result : null
  }
  catch (error) {
    const jsonText = ''
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[MemoryExtractor] Failed to extract memory:', {
      error: errorMessage,
      userMessage: userMessage.slice(0, 100),
      response: jsonText?.slice(0, 200),
    })
    throw new Error(`Memory extraction failed: ${errorMessage}`)
  }
}
