# 智能联网系统设计方案

## 项目背景

### 当前问题
- **简单关键词匹配** - 机械触发，缺乏智能
- **缺乏上下文理解** - 无法理解用户真实意图
- **过度展示知识** - 破坏对话自然度
- **无情境感知** - 不知道何时该查询，何时不该查询

### 用户需求
1. **智能意图识别** - 理解用户真正想要什么
2. **话题重点抓取** - 识别对话中的关键信息点
3. **情境感知联网** - 知道何时需要查询，何时不需要
4. **社交智能** - "装不是很懂"，保持对话自然度

## 系统架构设计

### 整体架构

```
用户输入
    ↓
[意图分析层] ← 理解用户真实需求
    ↓
[情境评估层] ← 判断是否需要联网
    ↓
[查询策略层] ← 决定如何查询
    ↓
[知识整合层] ← 整合查询结果
    ↓
[社交表达层] ← 自然地表达知识
    ↓
AI 回复
```

### 核心组件

#### 1. 意图分析层（Intent Analysis Layer）

**功能**：理解用户话语背后的真实意图

**技术实现**：
```typescript
interface IntentAnalysis {
  // 主要意图类型
  primaryIntent:
    | 'seeking_information' // 寻求信息
    | 'casual_chat' // 闲聊
    | 'seeking_opinion' // 寻求观点
    | 'sharing_experience' // 分享经历
    | 'emotional_support' // 情感支持
    | 'problem_solving' // 解决问题

  // 次要意图（可能有多个）
  secondaryIntents: string[]

  // 话题关键点
  topicKeyPoints: {
    entities: string[] // 实体（人名、地名、事件等）
    concepts: string[] // 概念（技术、理论等）
    timeContext: string | null // 时间上下文
    spatialContext: string | null // 空间上下文
  }

  // 信息需求程度（0-1）
  informationNeedLevel: number

  // 情感色彩
  emotionalTone: 'curious' | 'casual' | 'urgent' | 'playful' | 'serious'
}
```

**示例分析**：

```typescript
// 示例 1：明确的信息需求
用户: "最近有什么好看的电影吗？"
分析结果: {
  primaryIntent: 'seeking_information',
  secondaryIntents: ['seeking_recommendation'],
  topicKeyPoints: {
    entities: [],
    concepts: ['电影', '推荐'],
    timeContext: '最近',
    spatialContext: null
  },
  informationNeedLevel: 0.9,
  emotionalTone: 'curious'
}

// 示例 2：隐含的信息需求
用户: "诶，你知道那个...就是那个很火的AI画画的东西"
分析结果: {
  primaryIntent: 'seeking_information',
  secondaryIntents: ['recall_assistance'],
  topicKeyPoints: {
    entities: [],
    concepts: ['AI', '画画', '工具'],
    timeContext: '最近流行',
    spatialContext: null
  },
  informationNeedLevel: 0.7,
  emotionalTone: 'casual'
}

// 示例 3：不需要联网的闲聊
用户: "今天天气真好呀"
分析结果: {
  primaryIntent: 'casual_chat',
  secondaryIntents: ['sharing_experience'],
  topicKeyPoints: {
    entities: [],
    concepts: ['天气'],
    timeContext: '今天',
    spatialContext: null
  },
  informationNeedLevel: 0.1,
  emotionalTone: 'casual'
}
```

#### 2. 情境评估层（Context Evaluation Layer）

**功能**：判断是否需要联网查询

**评估维度**：

```typescript
interface ContextEvaluation {
  // 是否需要联网
  needsWebSearch: boolean

  // 需要联网的原因
  reason:
    | 'factual_information' // 事实性信息
    | 'current_events' // 时事新闻
    | 'specific_data' // 具体数据
    | 'verification' // 验证信息
    | 'discovery' // 发现新内容
    | null

  // 紧急程度（0-1）
  urgency: number

  // 对话流畅度影响评分（0-1）
  // 高分 = 查询会打断对话流畅度
  conversationFlowImpact: number

  // 推荐的查询时机
  recommendedTiming:
    | 'immediate' // 立即查询
    | 'after_clarification' // 澄清后查询
    | 'background' // 后台查询
    | 'skip' // 跳过查询
}
```

**决策逻辑**：

```typescript
function evaluateSearchNeed(
  intent: IntentAnalysis,
  conversationHistory: Message[],
  userProfile: UserProfile
): ContextEvaluation {
  // 规则 1：闲聊不需要联网
  if (intent.primaryIntent === 'casual_chat' && intent.informationNeedLevel < 0.3) {
    return {
      needsWebSearch: false,
      reason: null,
      urgency: 0,
      conversationFlowImpact: 0,
      recommendedTiming: 'skip'
    }
  }

  // 规则 2：明确的信息需求 + 时效性话题 = 需要联网
  if (
    intent.primaryIntent === 'seeking_information'
    && intent.topicKeyPoints.timeContext?.includes('最近|今天|现在')
  ) {
    return {
      needsWebSearch: true,
      reason: 'current_events',
      urgency: 0.8,
      conversationFlowImpact: 0.3,
      recommendedTiming: 'immediate'
    }
  }

  // 规则 3：模糊的问题 = 先澄清再查询
  if (
    intent.informationNeedLevel > 0.5
    && intent.topicKeyPoints.entities.length === 0
    && intent.emotionalTone === 'casual'
  ) {
    return {
      needsWebSearch: true,
      reason: 'discovery',
      urgency: 0.4,
      conversationFlowImpact: 0.6,
      recommendedTiming: 'after_clarification'
    }
  }

  // ... 更多规则
}
```

#### 3. 查询策略层（Query Strategy Layer）

**功能**：决定如何构建查询

**策略类型**：

```typescript
interface QueryStrategy {
  // 查询类型
  queryType:
    | 'direct_search' // 直接搜索
    | 'multi_angle_search' // 多角度搜索
    | 'verification_search' // 验证性搜索
    | 'exploratory_search' // 探索性搜索

  // 查询关键词
  keywords: string[]

  // 查询深度
  depth: 'shallow' | 'moderate' | 'deep'

  // 是否需要多轮查询
  multiRound: boolean

  // 结果过滤条件
  filters: {
    timeRange?: string // 时间范围
    sourceType?: string[] // 来源类型
    language?: string // 语言
  }
}
```

**查询构建示例**：

```typescript
// 示例 1：直接搜索
用户: "Python 3.12 有什么新特性？"
查询策略: {
  queryType: 'direct_search',
  keywords: ['Python 3.12', '新特性', 'new features'],
  depth: 'moderate',
  multiRound: false,
  filters: {
    timeRange: 'past_year',
    sourceType: ['official_docs', 'tech_blogs'],
    language: 'zh-CN,en'
  }
}

// 示例 2：多角度搜索
用户: "那个很火的AI画画工具"
查询策略: {
  queryType: 'multi_angle_search',
  keywords: [
    'AI 绘画工具 2024',
    'Stable Diffusion',
    'Midjourney',
    'DALL-E'
  ],
  depth: 'shallow',
  multiRound: true,
  filters: {
    timeRange: 'past_6_months',
    sourceType: ['news', 'social_media', 'tech_blogs']
  }
}

// 示例 3：探索性搜索
用户: "有什么好玩的？"
查询策略: {
  queryType: 'exploratory_search',
  keywords: ['热门话题', '有趣内容', '推荐'],
  depth: 'shallow',
  multiRound: false,
  filters: {
    timeRange: 'past_week',
    sourceType: ['trending', 'recommendations']
  }
}
```

#### 4. 知识整合层（Knowledge Integration Layer）

**功能**：整合查询结果，提取关键信息

```typescript
interface IntegratedKnowledge {
  // 核心事实
  coreFacts: {
    fact: string
    confidence: number // 置信度（0-1）
    sources: string[] // 来源
  }[]

  // 相关背景
  context: string[]

  // 不同观点
  perspectives: {
    viewpoint: string
    support: string[]
  }[]

  // 时效性标记
  temporalRelevance: 'current' | 'recent' | 'historical'

  // 信息完整度（0-1）
  completeness: number
}
```

**整合策略**：

1. **去重与合并** - 合并来自不同来源的相同信息
2. **置信度评分** - 根据来源可靠性和一致性评分
3. **关键点提取** - 提取最重要的 3-5 个关键点
4. **观点平衡** - 如果存在争议，展示多个观点

#### 5. 社交表达层（Social Expression Layer）

**功能**：自然地表达知识，而不是机械地复述

**表达策略**：

```typescript
interface ExpressionStrategy {
  // 表达风格
  style:
    | 'casual_sharing' // 随意分享："诶，我看到..."
    | 'tentative_suggestion' // 试探性建议："可能是..."
    | 'confident_statement' // 自信陈述："是这样的..."
    | 'playful_discovery' // 玩味发现："哦哦，原来..."

  // 知识展示程度（0-1）
  // 0 = 完全隐藏知识来源
  // 1 = 明确说明查询了信息
  knowledgeTransparency: number

  // 是否"装不懂"
  pretendUncertainty: boolean

  // 分段策略
  segmentation: {
    shouldSegment: boolean
    segmentPoints: number[] // 在哪些位置分段
  }
}
```

**表达示例**：

```typescript
// 场景 1：用户问"Python 3.12 有什么新特性？"
// 查询结果：找到了 5 个主要新特性

// ❌ 错误表达（机械复述）：
"根据我查询到的信息，Python 3.12 有以下新特性：
1. 改进的错误消息
2. 更快的启动时间
3. 新的类型系统特性
4. ..."

// ✅ 正确表达（自然分享）：
第一轮："诶，Python 3.12 确实有不少改进呢～"
[等用户回应或继续]
第二轮："最明显的应该是错误提示变得更友好了，还有启动速度快了不少"
[如果用户表现出兴趣]
第三轮："你想了解哪方面的改进呀？类型系统还是性能优化？"

// 场景 2：用户问"那个很火的AI画画工具"
// 查询结果：可能是 Midjourney 或 Stable Diffusion

// ❌ 错误表达（过度自信）：
"你说的应该是 Midjourney，它是目前最流行的 AI 绘画工具..."

// ✅ 正确表达（试探性建议 + 装不确定）：
第一轮："嗯...你说的是 Midjourney 吗？还是 Stable Diffusion？"
[等用户确认]
第二轮："哦哦，Midjourney 呀～我记得它好像是..."
[自然地分享信息，不说"我查询到"]

// 场景 3：用户只是闲聊"今天天气真好"
// 评估结果：不需要联网

// ✅ 正确表达（不查询，自然回应）：
"是呀～这种天气最适合出去走走了"
[不需要查询天气数据，保持对话自然流畅]
```

### 关键设计原则

#### 1. 渐进式信息披露（Progressive Disclosure）

不要一次性倾倒所有查询结果，而是：
- 第一轮：给出核心观点或最重要的 1-2 个点
- 第二轮：根据用户反应，决定是否深入
- 第三轮+：逐步展开细节

#### 2. 社交智能优先（Social Intelligence First）

查询决策应该考虑：
- **对话流畅度** > 信息完整度
- **情感连接** > 知识展示
- **用户体验** > 系统能力展示

#### 3. 适度的不确定性（Calibrated Uncertainty）

即使查询到了准确信息，也要：
- 使用试探性语气："可能是..."、"应该是..."
- 留给用户纠正的空间
- 避免"全知全能"的印象

#### 4. 隐性知识来源（Implicit Knowledge Source）

不要说：
- ❌ "根据我查询到的信息..."
- ❌ "我搜索了一下，发现..."
- ❌ "网上说..."

而是说：
- ✅ "诶，我记得..."
- ✅ "好像是..."
- ✅ "听说..."

## 技术实现方案

### Phase 1：意图分析系统

**文件结构**：
```
packages/stage-ui/src/
├── tools/
│   ├── web-search/
│   │   ├── intent-analyzer.ts          # 意图分析器
│   │   ├── context-evaluator.ts        # 情境评估器
│   │   ├── query-builder.ts            # 查询构建器
│   │   ├── knowledge-integrator.ts     # 知识整合器
│   │   ├── expression-strategy.ts      # 表达策略
│   │   └── index.ts
│   └── index.ts
```

**核心代码**：

```typescript
// intent-analyzer.ts
import { tool } from '@xsai/tool'
import { z } from 'zod'

export const intentAnalyzer = tool({
  name: 'analyze_user_intent',
  description: `Analyze user's true intent behind their message.

  This tool helps understand:
  - What the user really wants (information, chat, opinion, etc.)
  - Key topics and entities mentioned
  - Whether web search is needed
  - How urgent the information need is

  Use this BEFORE deciding to search the web.`,

  parameters: z.object({
    userMessage: z.string().describe('The user\'s message to analyze'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })).optional().describe('Recent conversation history for context')
  }),

  execute: async ({ userMessage, conversationContext }) => {
    // 实现意图分析逻辑
    // 这里可以调用 LLM 进行分析，或使用规则引擎

    const analysis: IntentAnalysis = {
      primaryIntent: detectPrimaryIntent(userMessage),
      secondaryIntents: detectSecondaryIntents(userMessage),
      topicKeyPoints: extractKeyPoints(userMessage),
      informationNeedLevel: calculateInformationNeed(userMessage, conversationContext),
      emotionalTone: detectEmotionalTone(userMessage)
    }

    return analysis
  }
})
```

```typescript
// context-evaluator.ts
export const contextEvaluator = tool({
  name: 'evaluate_search_need',
  description: `Evaluate whether web search is needed based on intent analysis.

  This tool considers:
  - User's information need level
  - Conversation flow impact
  - Timing appropriateness
  - Social naturalness

  Returns recommendation on whether and when to search.`,

  parameters: z.object({
    intentAnalysis: z.object({
      primaryIntent: z.string(),
      informationNeedLevel: z.number(),
      emotionalTone: z.string()
    }),
    conversationState: z.object({
      messageCount: z.number(),
      lastSearchTime: z.number().optional()
    }).optional()
  }),

  execute: async ({ intentAnalysis, conversationState }) => {
    const evaluation: ContextEvaluation = evaluateSearchNeed(
      intentAnalysis,
      conversationState
    )

    return evaluation
  }
})
```

### Phase 2：智能查询系统

**集成搜索引擎**：

```typescript
// web-search-tool.ts
import { tool } from '@xsai/tool'
import { z } from 'zod'

export const intelligentWebSearch = tool({
  name: 'intelligent_web_search',
  description: `Perform intelligent web search with context awareness.

  This is NOT a simple keyword search. It:
  - Understands user intent
  - Builds smart queries
  - Filters and integrates results
  - Provides natural expression guidance

  Use this when you've determined web search is appropriate.`,

  parameters: z.object({
    intentAnalysis: z.object({
      primaryIntent: z.string(),
      topicKeyPoints: z.object({
        entities: z.array(z.string()),
        concepts: z.array(z.string()),
        timeContext: z.string().nullable(),
        spatialContext: z.string().nullable()
      }),
      informationNeedLevel: z.number()
    }),
    queryStrategy: z.object({
      queryType: z.enum(['direct_search', 'multi_angle_search', 'verification_search', 'exploratory_search']),
      depth: z.enum(['shallow', 'moderate', 'deep']),
      multiRound: z.boolean()
    }).optional()
  }),

  execute: async ({ intentAnalysis, queryStrategy }) => {
    // 1. 构建查询
    const queries = buildSmartQueries(intentAnalysis, queryStrategy)

    // 2. 执行搜索（通过 MCP 调用实际的搜索工具）
    const rawResults = await performSearch(queries)

    // 3. 整合知识
    const integratedKnowledge = integrateKnowledge(rawResults)

    // 4. 生成表达策略
    const expressionStrategy = generateExpressionStrategy(
      intentAnalysis,
      integratedKnowledge
    )

    return {
      knowledge: integratedKnowledge,
      expressionGuidance: expressionStrategy
    }
  }
})
```

### Phase 3：系统提示词增强

**在 `base.yaml` 中添加**：

```yaml
**智能联网原则（重要！）**

你拥有联网搜索能力，但使用时必须遵循以下原则：

### 何时联网

**需要联网的情况**：
- 用户明确询问时效性信息（"最近"、"现在"、"今天"）
- 用户询问具体数据或事实
- 用户询问你不确定的专业知识
- 用户要求验证信息

**不需要联网的情况**：
- 用户只是闲聊或分享感受
- 话题是关于用户自己的经历
- 问题可以通过对话澄清
- 联网会打断对话流畅度

### 如何联网

**查询前**：
1. 先使用 `analyze_user_intent` 分析用户意图
2. 使用 `evaluate_search_need` 评估是否真的需要搜索
3. 如果不确定，先通过对话澄清

**查询时**：
1. 使用 `intelligent_web_search` 而不是简单关键词搜索
2. 传入完整的意图分析结果
3. 让系统帮你构建智能查询

**查询后**：
1. 不要说"我查询到"、"根据搜索结果"
2. 使用自然的表达方式分享信息
3. 保持适度的不确定性："可能是..."、"好像..."
4. 分段展示信息，不要一次性倾倒

### 社交智能

**"装不是很懂"的艺术**：
- 即使查到了准确答案，也用试探性语气
- 给用户纠正你的机会
- 避免"全知全能"的印象

**示例**：

❌ 错误方式：
用户: "那个很火的AI画画工具"
AI: "根据我的搜索，你说的应该是 Midjourney，它是由 David Holz 创建的..."

✅ 正确方式：
用户: "那个很火的AI画画工具"
AI: "嗯...你说的是 Midjourney 吗？还是 Stable Diffusion？"
[等用户确认]
AI: "哦哦，Midjourney 呀～听说最近挺火的"
[自然分享，不展示搜索痕迹]
```

## 实施路线图

### Sprint 1：基础架构（1-2周）
- [ ] 创建意图分析工具
- [ ] 创建情境评估工具
- [ ] 集成到现有工具系统
- [ ] 编写单元测试

### Sprint 2：查询系统（2-3周）
- [ ] 实现查询构建器
- [ ] 集成搜索引擎（Tavily/Serper/Brave）
- [ ] 实现知识整合器
- [ ] 测试查询质量

### Sprint 3：表达优化（1-2周）
- [ ] 实现表达策略生成器
- [ ] 优化系统提示词
- [ ] A/B 测试不同表达风格
- [ ] 收集用户反馈

### Sprint 4：迭代优化（持续）
- [ ] 根据用户反馈调整策略
- [ ] 优化意图识别准确率
- [ ] 改进表达自然度
- [ ] 添加更多场景支持

## 评估指标

### 技术指标
1. **意图识别准确率** - 目标 >85%
2. **查询相关性** - 目标 >90%
3. **响应延迟** - 目标 <3秒
4. **查询成功率** - 目标 >95%

### 用户体验指标
1. **对话流畅度评分** - 目标 >4.5/5
2. **信息有用性评分** - 目标 >4.0/5
3. **自然度评分** - 目标 >4.5/5
4. **"不像AI"评分** - 目标 >4.0/5

### 社交智能指标
1. **过度展示知识次数** - 目标 <5%
2. **打断对话次数** - 目标 <10%
3. **用户主动询问比例** - 目标 >70%
4. **用户满意度** - 目标 >4.5/5

## 风险与挑战

### 技术风险
1. **LLM 意图理解偏差** - 缓解：多轮验证 + 规则引擎辅助
2. **搜索API限流** - 缓解：缓存 + 降级策略
3. **响应延迟** - 缓解：后台查询 + 流式响应

### 产品风险
1. **过度谨慎导致不查询** - 缓解：可调节的保守度参数
2. **"装不懂"过度** - 缓解：根据用户偏好调整
3. **信息准确性** - 缓解：多源验证 + 置信度标注

## 参考文献

1. **意图识别**：
   - Hakkani-Tür, D., et al. (2016). "Multi-Domain Joint Semantic Frame Parsing using Bi-directional RNN-LSTM"

2. **对话管理**：
   - Young, S., et al. (2013). "POMDP-based Statistical Spoken Dialog Systems: A Review"

3. **社交智能**：
   - Nass, C., & Moon, Y. (2000). "Machines and Mindlessness: Social Responses to Computers"

4. **信息检索**：
   - Manning, C. D., et al. (2008). "Introduction to Information Retrieval"

## 贡献者

- 方案设计：Claude (Anthropic) + 用户 @zyp
- 技术架构：代码专家团队
- 社交策略：人际交往专家团队
- 日期：2026-03-15
