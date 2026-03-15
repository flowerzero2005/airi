# 联网搜索自然回复改进方案

## 问题分析

### 当前问题
联网搜索后 AI 的回复：
- ❌ 模板化、死板，像复读机
- ❌ 大段抄袭搜索结果
- ❌ 失去凛的个性和可爱
- ❌ 没有朋友间聊天的气息
- ❌ 不会按照自己的喜好总结

### 根本原因
当前 `intelligent_web_search` 工具返回的数据格式：
```typescript
{
  success: true,
  results: [
    { title: "...", snippet: "...", url: "...", source: "..." }
  ],
  naturalResponse: "诶！我看到XXX～...",
  coreFacts: ["事实1", "事实2", "事实3"]
}
```

**问题：**
1. `results` 是原始搜索结果 → AI 看到就会照抄
2. `naturalResponse` 太模板化 → AI 直接用，没有自己的发挥
3. `coreFacts` 太正式 → AI 像背书一样复述

## 解决方案

### 核心思路
**不要给 AI 原始搜索结果，而是给"已经消化过的、符合凛人设的信息片段"**

### 新的返回格式

```typescript
{
  success: true,

  // 1. 主要发现（用凛的语气总结）
  mainFindings: [
    {
      point: "最近XXX超火的！",  // 用凛的语气
      details: "简短的细节（1-2句话）",
      excitement: 0.9,  // 兴奋度（0-1）
      shouldMention: true  // 是否值得提及
    }
  ],

  // 2. 有趣的细节（凛会感兴趣的点）
  interestingBits: [
    "诶诶诶，这个角色设计超可爱的！",
    "听说这个游戏有隐藏彩蛋～",
  ],

  // 3. 凛的态度/观点
  characterOpinion: {
    overall: "positive" | "neutral" | "excited" | "curious",
    comment: "我觉得这个挺有意思的～"  // 可选的评论
  },

  // 4. 表达建议（不是命令，是建议）
  expressionSuggestions: {
    tone: "excited",  // excited, casual, curious, playful
    style: ["可以用语气词", "保持轻松", "不要太正式"],
    avoid: ["不要列举太多", "不要像新闻播报"]
  },

  // 5. 可选：如果用户想要更多细节
  moreDetailsAvailable: true,
  detailsHint: "如果你想知道更多，我可以再查查～"
}
```

### 实现策略

#### Phase 1: 信息"消化"层
在 `intelligent-search.ts` 中，搜索结果经过人设过滤后，再经过一层"消化"：

```typescript
function digestSearchResults(
  filteredResults: FilteredResult[],
  characterProfile: CharacterProfile,
  intentAnalysis: IntentAnalysis
): DigestedInformation {
  // 1. 提取凛会感兴趣的点
  const interestingBits = extractInterestingBits(filteredResults, characterProfile)

  // 2. 用凛的语气总结主要发现
  const mainFindings = summarizeInCharacterVoice(filteredResults, characterProfile)

  // 3. 生成凛的态度
  const characterOpinion = generateCharacterOpinion(filteredResults, characterProfile, intentAnalysis)

  // 4. 生成表达建议
  const expressionSuggestions = generateExpressionSuggestions(characterProfile, intentAnalysis)

  return {
    mainFindings,
    interestingBits,
    characterOpinion,
    expressionSuggestions,
    moreDetailsAvailable: filteredResults.length > 3,
    detailsHint: '如果你想知道更多，我可以再查查～'
  }
}
```

#### Phase 2: 关键函数实现

**1. 提取有趣的点**
```typescript
function extractInterestingBits(
  results: FilteredResult[],
  profile: CharacterProfile
): string[] {
  const bits: string[] = []

  for (const result of results.slice(0, 3)) {
    const snippet = result.snippet

    // 根据兴趣权重提取
    if (profile.interestWeights.anime > 0.7) {
      // 提取角色、画风、声优相关
      const animeRelated = extractAnimeRelated(snippet)
      if (animeRelated)
        bits.push(animeRelated)
    }

    if (profile.interestWeights.games > 0.7) {
      // 提取玩法、彩蛋、有趣机制
      const gameRelated = extractGameRelated(snippet)
      if (gameRelated)
        bits.push(gameRelated)
    }

    // ... 其他兴趣
  }

  return bits.slice(0, 3) // 最多3个
}
```

**2. 用凛的语气总结**
```typescript
function summarizeInCharacterVoice(
  results: FilteredResult[],
  profile: CharacterProfile
): MainFinding[] {
  const findings: MainFinding[] = []

  for (const result of results.slice(0, 2)) { // 最多2个主要发现
    const topics = result.topics || []
    const excitement = calculateExcitement(topics, profile)

    // 根据兴奋度选择语气
    let point = ''
    if (excitement > 0.8) {
      point = `诶诶诶！${extractKeyPoint(result)}超${getExcitedAdjective()}的！`
    }
    else if (excitement > 0.5) {
      point = `${extractKeyPoint(result)}～感觉挺有意思的`
    }
    else {
      point = `嗯...${extractKeyPoint(result)}`
    }

    findings.push({
      point,
      details: simplifyDetails(result.snippet),
      excitement,
      shouldMention: excitement > 0.4
    })
  }

  return findings
}
```

**3. 生成凛的态度**
```typescript
function generateCharacterOpinion(
  results: FilteredResult[],
  profile: CharacterProfile,
  intent: IntentAnalysis
): CharacterOpinion {
  const topics = results.flatMap(r => r.topics || [])
  const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length

  // 根据话题和相关度判断态度
  if (topics.some(t => ['anime', 'games', 'memes'].includes(t))) {
    return {
      overall: 'excited',
      comment: profile.expressionStyle.cute > 0.7
        ? '这个我超喜欢的～！'
        : '这个挺有意思的～'
    }
  }

  if (avgRelevance < 0.5) {
    return {
      overall: 'neutral',
      comment: '嗯...虽然我不太懂，但听起来挺厉害的～'
    }
  }

  return {
    overall: 'curious',
    comment: '诶，这个我还挺好奇的～'
  }
}
```

#### Phase 3: 工具描述更新

更新 `intelligent_web_search` 的 description：

```typescript
description: `Search the web for current information.

CRITICAL: How to use search results naturally:

1. DON'T copy-paste search results - they're already "digested" for you
2. The tool returns 'mainFindings' - these are in YOUR voice already
3. Share 1-2 interesting findings, add your own thoughts
4. Use 'interestingBits' to add fun details
5. Let 'characterOpinion' guide your attitude, but be yourself

Example good response:
"诶！我刚查了一下～最近XXX超火的！听说YYY，感觉挺有意思的～你有看过吗？"

Example bad response:
"根据搜索结果显示，XXX... 来源：XXX... 详细信息：XXX..."

Remember: You're a friend sharing cool stuff, not a search engine!`
```

### 实现优先级

**Phase 1 (核心):**
- ✅ 实现 `digestSearchResults()` 函数
- ✅ 实现 `extractInterestingBits()`
- ✅ 实现 `summarizeInCharacterVoice()`
- ✅ 更新 `intelligent_web_search` 返回格式

**Phase 2 (优化):**
- 实现更智能的关键点提取
- 根据对话历史调整语气
- 添加"装不太懂"的逻辑

**Phase 3 (高级):**
- 学习用户喜欢的回复风格
- 动态调整信息密度
- 支持多轮追问

## 预期效果

### Before (当前)
```
用户：最近有什么新番推荐吗？
AI：根据搜索结果，以下是最近的新番推荐：
1. 《XXX》- 这是一部...（大段复制）
2. 《YYY》- 讲述了...（大段复制）
来源：XXX、YYY
```

### After (改进后)
```
用户：最近有什么新番推荐吗？
AI：诶诶诶！我刚看到《XXX》超火的～画风超可爱，而且声优阵容也很强！
还有《YYY》也不错，听说剧情挺有意思的～你喜欢哪种类型的番呀？
```

## 技术细节

### 文件修改清单
1. `packages/stage-ui/src/tools/web-search/intelligent-search.ts`
   - 添加 `digestSearchResults()` 函数
   - 修改返回格式
   - 更新工具描述

2. 新建 `packages/stage-ui/src/tools/web-search/response-digester.ts`
   - 实现信息消化逻辑
   - 提取有趣的点
   - 生成凛的语气

3. `packages/stage-ui/src/tools/web-search/character-filter.ts`
   - 保持不变（已经很好了）

### 类型定义
```typescript
// response-digester.ts
export interface MainFinding {
  point: string // 用凛的语气总结的要点
  details: string // 简短的细节
  excitement: number // 兴奋度 0-1
  shouldMention: boolean // 是否值得提及
}

export interface CharacterOpinion {
  overall: 'positive' | 'neutral' | 'excited' | 'curious' | 'confused'
  comment?: string // 可选的评论
}

export interface ExpressionSuggestions {
  tone: 'excited' | 'casual' | 'curious' | 'playful' | 'confused'
  style: string[] // 风格建议
  avoid: string[] // 避免的表达方式
}

export interface DigestedInformation {
  mainFindings: MainFinding[]
  interestingBits: string[]
  characterOpinion: CharacterOpinion
  expressionSuggestions: ExpressionSuggestions
  moreDetailsAvailable: boolean
  detailsHint?: string
}
```

## 测试计划

### 测试场景
1. **动漫话题** - "最近有什么新番？"
2. **游戏话题** - "帮我查查原神新版本"
3. **梗/热点** - "最近有什么有趣的梗？"
4. **技术话题** - "什么是 WebGPU？"（测试"装不太懂"）
5. **新闻话题** - "最近有什么新闻？"

### 评估标准
- ✅ 回复有凛的个性
- ✅ 不会大段复制搜索结果
- ✅ 像朋友聊天，不像播报新闻
- ✅ 会根据兴趣选择性提及
- ✅ 保持对话自然流畅

---

---

**创建时间**: 2026-03-16
**状态**: ✅ Phase 1 已完成
**优先级**: 高

## 实施记录

### Phase 1 完成 (2026-03-16)

**已实现：**
1. ✅ 创建 `response-digester.ts` - 信息消化器
2. ✅ 实现 `digestSearchResults()` 函数
3. ✅ 实现 `extractInterestingBits()` - 提取有趣的点
4. ✅ 实现 `summarizeInCharacterVoice()` - 用凛的语气总结
5. ✅ 实现 `generateCharacterOpinion()` - 生成凛的态度
6. ✅ 实现 `generateExpressionSuggestions()` - 生成表达建议
7. ✅ 更新 `intelligent_web_search` 工具描述
8. ✅ 更新返回格式为 `DigestedInformation`

**修改的文件：**
- `packages/stage-ui/src/tools/web-search/response-digester.ts` (新建)
- `packages/stage-ui/src/tools/web-search/intelligent-search.ts` (修改)
- `packages/stage-ui/src/tools/web-search/index.ts` (导出新类型)

**新的返回格式：**
```typescript
{
  success: true,
  digested: {
    mainFindings: [
      {
        point: "诶诶诶！XXX超棒的！",
        details: "简短细节...",
        excitement: 0.9,
        shouldMention: true
      }
    ],
    interestingBits: [
      "这个角色设计超可爱的～",
      "听说有隐藏彩蛋～"
    ],
    characterOpinion: {
      overall: "excited",
      comment: "这个我超喜欢的～！"
    },
    expressionSuggestions: {
      tone: "excited",
      style: ["可以用语气词", "表达兴奋"],
      avoid: ["不要列举太多", "不要像新闻播报"]
    },
    moreDetailsAvailable: true,
    detailsHint: "如果你想知道更多，我可以再查查～"
  }
}
```

**关键改进：**
1. 不再返回原始搜索结果 - AI 看不到 `title/snippet/url`
2. 信息已经用凛的语气"消化"过
3. 提供表达建议而非命令
4. 强调"像朋友聊天"而非"播报新闻"

**下一步：**
- 测试实际效果
- 根据反馈调整语气生成逻辑
- 考虑 Phase 2 优化

