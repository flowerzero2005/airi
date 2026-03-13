import { tool } from '@xsai/tool'
import { z } from 'zod'

/**
 * Memory search tool for AI to actively query memories
 */
export function createMemoryTool(): ReturnType<typeof tool> {
  return tool({
    name: 'search_memory',
    description: '搜索长期记忆。当用户提到过去的信息、个人偏好、或你需要回忆之前的对话内容时，使用此工具主动搜索相关记忆。',
    parameters: z.object({
      query: z.string().describe('搜索关键词，如"用户姓名"、"喜欢的游戏"、"上次提到的计划"等'),
      limit: z.number().optional().default(5).describe('返回结果数量，默认5条'),
    }),
    execute: async ({ query, limit = 5 }) => {
      try {
        // 动态导入避免循环依赖
        const { useMemoryManager } = await import('@proj-airi/stage-ui/stores/chat/memory-manager')
        const memoryManager = useMemoryManager()

        const memories = memoryManager.searchRelevantMemories(query, limit)

        if (memories.length === 0) {
          return {
            success: true,
            message: '没有找到相关记忆',
            memories: [],
          }
        }

        // 格式化记忆结果
        const formattedMemories = memories.map((memory) => {
          const result: any = {
            content: memory.text,
            importance: memory.metadata?.importance || 'medium',
            tags: memory.tags || [],
            createdAt: new Date(memory.createdAt).toLocaleDateString('zh-CN'),
          }

          // 如果有特征时间线，添加详细信息
          const featureTimeline = memory.metadata?.featureTimeline as Record<string, { firstMentioned: number, text: string }> | undefined
          if (featureTimeline && Object.keys(featureTimeline).length > 0) {
            result.features = Object.entries(featureTimeline).map(([feature, info]) => ({
              feature,
              firstMentioned: new Date(info.firstMentioned).toLocaleDateString('zh-CN'),
            }))
          }

          // 如果有节点概括，添加事件信息
          const nodeSummaries = memory.metadata?.nodeSummaries as Record<string, string> | undefined
          if (nodeSummaries && Object.keys(nodeSummaries).length > 0) {
            result.eventSummaries = nodeSummaries
          }

          return result
        })

        return {
          success: true,
          message: `找到 ${memories.length} 条相关记忆`,
          memories: formattedMemories,
        }
      }
      catch (error) {
        console.error('[MemoryTool] Search failed:', error)
        return {
          success: false,
          message: '记忆搜索失败',
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  })
}

export const memoryTool = createMemoryTool()
