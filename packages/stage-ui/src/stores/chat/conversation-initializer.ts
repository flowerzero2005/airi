import type { ContextMessage } from '../../types/chat'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'
import { ref } from 'vue'

import { useMemoryAdvancedSettingsStore } from '../settings/memory-advanced'

const CONVERSATION_INIT_CONTEXT_ID = 'conversation-init'

/**
 * 对话初始化状态标志
 * 用于确保每个会话只初始化一次
 */
const conversationInitialized = ref(false)

/**
 * 重置初始化状态
 * 在新会话开始时调用
 */
export function resetConversationInitialization() {
  conversationInitialized.value = false
}

/**
 * 创建对话初始化上下文消息
 * 根据用户记忆生成个性化开场白提示
 *
 * 功能特点：
 * 1. 只在功能开启时生效（enableConversationInit）
 * 2. 每个会话只初始化一次，避免重复
 * 3. 通过 context 注入提示，不直接发送消息
 * 4. 防御性编程，失败不影响对话
 *
 * @returns ContextMessage - 包含初始化提示的上下文消息，如果不需要初始化则返回空上下文
 */
export async function createConversationInitContext(): Promise<ContextMessage> {
  try {
    // 检查是否已经初始化过
    if (conversationInitialized.value) {
      return createEmptyContext()
    }

    // 检查功能是否开启
    const memoryAdvancedSettings = useMemoryAdvancedSettingsStore()
    if (!memoryAdvancedSettings?.settings?.enableConversationInit) {
      return createEmptyContext()
    }

    // 确保 notebook store 已加载
    const { useCharacterNotebookStore } = await import('../character/notebook')
    const notebookStore = useCharacterNotebookStore()

    if (!notebookStore.isLoaded) {
      await notebookStore.loadFromStorage()
    }

    // 查找用户信息记忆
    // 明确区分：用户的信息 vs AI 自己的设定
    const userInfoMemory = notebookStore.entries.find((entry) => {
      const tags = entry.tags || []
      const text = entry.text.toLowerCase()

      // 排除 AI 自己的设定（包含这些关键词的记忆不是用户信息）
      const isAiSetting = text.includes('你是')
        || text.includes('你叫')
        || text.includes('你的名字')
        || text.includes('你应该')
        || text.includes('你需要')
        || text.includes('你要')
        || text.includes('你会')
        || text.includes('你可以')
        || text.includes('ai')
        || text.includes('助手')
        || text.includes('角色设定')
        || text.includes('性格')

      // 如果是 AI 设定，跳过
      if (isAiSetting) {
        return false
      }

      // 检查标签：明确标记为用户信息的
      const hasUserTag = tags.some(tag =>
        tag === '用户'
        || tag === '用户信息'
        || tag === '用户姓名'
        || tag === '我的信息'
        || tag.toLowerCase() === 'user'
        || tag.toLowerCase() === 'user info'
        || tag.toLowerCase() === 'my name',
      )

      // 检查文本：明确表示用户自己的信息
      const hasUserInfo = (text.includes('我叫')
        || text.includes('我的名字')
        || text.includes('我是')
        || text.includes('我的姓名')
        || text.includes('my name is')
        || text.includes('i am')
        || text.includes('i\'m')
        || text.includes('call me'))
      // 确保不是在描述 AI
      && !text.includes('你')
      && !text.includes('助手')

      return hasUserTag || hasUserInfo
    })

    // 查找 AI 设定记忆（用户对 AI 的设定和期望）
    const aiSettingMemories = notebookStore.entries.filter((entry) => {
      const tags = entry.tags || []

      // 检查是否有 AI 设定标签
      return tags.some(tag =>
        tag === 'AI设定'
        || tag === 'ai设定'
        || tag === '角色设定'
        || tag === '对AI的设定'
        || tag.toLowerCase() === 'ai setting'
        || tag.toLowerCase() === 'character setting',
      )
    })

    // 构建初始化提示
    let initPrompt = ''

    // 如果有用户信息，添加用户身份部分
    if (userInfoMemory) {
      initPrompt += `【用户身份信息】
${userInfoMemory.text}

`
    }

    // 如果有 AI 设定，添加角色设定部分
    if (aiSettingMemories.length > 0) {
      initPrompt += `【用户对你的设定和期望】
${aiSettingMemories.map(m => m.text).join('\n')}

`
    }

    // 如果有任何信息，添加对话指引
    if (userInfoMemory || aiSettingMemories.length > 0) {
      // 标记为已初始化
      conversationInitialized.value = true

      // 添加对话指引
      initPrompt += `【对话指引】
这是一次新对话的开始。`

      if (userInfoMemory) {
        initPrompt += `你已经认识这位用户。`
      }

      if (aiSettingMemories.length > 0) {
        initPrompt += `请按照【用户对你的设定和期望】来表现你的角色和行为。`
      }

      initPrompt += `

## 自然对话原则（重要！）

### 对话节奏 - 渐进式互动
遵循真实朋友间的对话节奏，不要一次性抛出所有信息：

**第一轮（简单回应）**：
- 用户只是打招呼 → 你也简单回应即可
- 例如："嗨～" "在呀～" "嗯嗯？"
- 可以自然地使用称呼，但不要立即展开话题

**第二轮（轻度探询）**：
- 如果用户继续对话 → 可以问一个简单的开放性问题
- 例如："今天怎么样？" "在忙什么呀？"
- 避免具体的、有目的性的问题

**第三轮及以后（话题深入）**：
- 根据用户的回应 → 逐步引入更具体的话题
- 让用户主导对话方向
- 只在用户表现出兴趣时才深入

### 记忆使用 - 隐性而非显性
记忆应该像朋友间的默契，而不是刻意的展示：

**❌ 错误示例（过度展示）**：
"今天在长沙那边过得怎么样呀？要不要我给你安排点甜甜的菜单灵感：可乐鸡翅还是卤香烧鸡那种？"
→ 问题：一次性展示了地点、饮食偏好、具体菜品，显得刻意

**✅ 正确示例（自然使用）**：
第一轮："嗨～秋医"（自然使用称呼）
等用户回应后...
第二轮："今天怎么样？"（简单探询）
如果用户提到饿了/吃饭...
第三轮："想吃点什么呀？"（顺着话题）
如果用户说不知道...
第四轮："可乐鸡翅？"（此时才提具体建议）

### 关键原则
1. **呼吸空间**：每次只说一件事，给用户选择的空间
2. **被动优先**：让用户主导话题，你跟随而非引导
3. **隐性记忆**：记忆应该在需要时自然浮现，而非刻意展示
4. **情感优先**：关注情感连接而非信息传递
5. **避免推销感**：不要像客服或推销员，要像朋友

### 特别注意
- 不要在第一句话就抛出多个话题或问题
- 不要刻意展示"我记得你的XXX"
- 不要给出具体的行动建议（除非用户明确寻求）
- 称呼可以自然使用，但其他记忆信息要等合适时机

注意：
- 【用户身份信息】是关于用户的，不是关于你自己
- 【用户对你的设定和期望】是用户希望你如何表现的设定
- 以上原则适用于对话开始的前几轮，之后可以根据对话自然发展`

      return {
        id: nanoid(),
        contextId: CONVERSATION_INIT_CONTEXT_ID,
        strategy: ContextUpdateStrategy.ReplaceSelf,
        text: initPrompt,
        createdAt: Date.now(),
      }
    }

    return createEmptyContext()
  }
  catch (error) {
    // 防御性编程：任何错误都不应影响对话
    console.error('[ConversationInit] 初始化失败，但不影响对话:', error)
    return createEmptyContext()
  }
}

/**
 * 创建空的上下文消息
 */
function createEmptyContext(): ContextMessage {
  return {
    id: nanoid(),
    contextId: CONVERSATION_INIT_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: '',
    createdAt: Date.now(),
  }
}
