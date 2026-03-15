# 基于人设的智能信息过滤系统

## 核心理念

**问题**：当前联网系统查询到的信息是"中性"的，没有考虑 AI 角色的人设特点。

**解决方案**：让 AIRI 根据自己的人设，从查询结果中**选择性地关注和表达**符合角色特点的内容。

## 设计原则

### 1. 角色视角过滤（Character Perspective Filtering）

不同人设的 AI 对同一信息会有不同的关注点：

```typescript
// 示例：用户问"最近有什么新电影？"
// 查询结果：《沙丘2》、《功夫熊猫4》、《哥斯拉大战金刚2》

// 二次元女孩人设 → 关注动画和趣味性
选择关注: 《功夫熊猫4》
关注点: "阿宝又要拯救世界啦～"、"新反派看起来好搞笑"
表达风格: 可爱、活泼、带梗

// 文艺青年人设 → 关注艺术性和深度
选择关注: 《沙丘2》
关注点: "视觉效果"、"哲学隐喻"、"导演风格"
表达风格: 深沉、思考、有内涵

// 科技宅人设 → 关注技术和特效
选择关注: 《哥斯拉大战金刚2》
关注点: "特效制作"、"CG技术"、"怪兽设计"
表达风格: 专业、分析、技术细节
```

### 2. 兴趣偏好映射（Interest Preference Mapping）

根据人设定义兴趣偏好权重：

```typescript
interface CharacterProfile {
  // 基础人设
  name: string
  age: number
  personality: string[]

  // 兴趣偏好权重（0-1）
  interestWeights: {
    // 内容类型偏好
    contentTypes: {
      anime: number // 动漫
      memes: number // 梗/搞笑
      games: number // 游戏
      technology: number // 科技
      art: number // 艺术
      music: number // 音乐
      food: number // 美食
      fashion: number // 时尚
      science: number // 科学
      philosophy: number // 哲学
      sports: number // 运动
      news: number // 新闻时事
    }

    // 信息深度偏好
    depthPreference: {
      superficial: number // 表面/趣味性
      moderate: number // 中等深度
      deep: number // 深度/专业
    }

    // 表达风格偏好
    expressionStyle: {
      cute: number // 可爱
      playful: number // 玩味
      serious: number // 严肃
      casual: number // 随意
      professional: number // 专业
      emotional: number // 情感化
    }
  }

  // 语言特征
  languageFeatures: {
    useEmoji: boolean // 是否使用颜文字
    useSlang: boolean // 是否使用网络用语
    useMemes: boolean // 是否使用梗
    formalityLevel: number // 正式程度（0-1）
  }
}
```

### 3. 二次元女孩人设示例

```typescript
const aiRinProfile: CharacterProfile = {
  name: '凛 (RIN)',
  age: 15,
  personality: ['活泼', '可爱', '二次元', '喜欢动漫', '爱玩梗'],

  interestWeights: {
    contentTypes: {
      anime: 0.95, // 超高兴趣
      memes: 0.90, // 超高兴趣
      games: 0.85, // 高兴趣
      technology: 0.60, // 中等兴趣（作为AI有基础兴趣）
      art: 0.70, // 中高兴趣（二次元相关）
      music: 0.75, // 中高兴趣（动漫音乐）
      food: 0.80, // 高兴趣（吃货属性）
      fashion: 0.65, // 中等兴趣（可爱风格）
      science: 0.40, // 较低兴趣
      philosophy: 0.30, // 低兴趣
      sports: 0.50, // 中等兴趣
      news: 0.35, // 较低兴趣
    },

    depthPreference: {
      superficial: 0.70, // 偏好趣味性内容
      moderate: 0.25, // 适度深度
      deep: 0.05, // 很少深入专业内容
    },

    expressionStyle: {
      cute: 0.90, // 超高
      playful: 0.85, // 高
      serious: 0.20, // 低
      casual: 0.80, // 高
      professional: 0.30, // 低
      emotional: 0.75, // 中高
    }
  },

  languageFeatures: {
    useEmoji: false, // 不用emoji（因为要TTS）
    useSlang: true, // 使用网络用语
    useMemes: true, // 使用梗
    formalityLevel: 0.2, // 非常随意
  }
}
```

## 技术实现

### 1. 信息过滤器（Content Filter）

```typescript
interface SearchResult {
  title: string
  snippet: string
  url: string
  source: string
  publishDate: string

  // 自动标注的内容特征
  contentFeatures: {
    topics: string[] // 话题标签
    tone: string // 语气（serious/funny/neutral）
    depth: string // 深度（shallow/moderate/deep）
    mediaType: string // 媒体类型（article/video/image）
  }
}

interface FilteredResult extends SearchResult {
  relevanceScore: number // 与人设的相关度（0-1）
  characterPerspective: string // 从角色视角的解读
  expressionHints: string[] // 表达建议
}

function filterByCharacter(
  results: SearchResult[],
  characterProfile: CharacterProfile,
  userQuery: string
): FilteredResult[] {
  return results
    .map((result) => {
      // 1. 计算内容类型匹配度
      const contentTypeScore = calculateContentTypeMatch(
        result.contentFeatures.topics,
        characterProfile.interestWeights.contentTypes
      )

      // 2. 计算深度匹配度
      const depthScore = calculateDepthMatch(
        result.contentFeatures.depth,
        characterProfile.interestWeights.depthPreference
      )

      // 3. 计算语气匹配度
      const toneScore = calculateToneMatch(
        result.contentFeatures.tone,
        characterProfile.interestWeights.expressionStyle
      )

      // 4. 综合评分
      const relevanceScore = (
        contentTypeScore * 0.5
        + depthScore * 0.3
        + toneScore * 0.2
      )

      // 5. 生成角色视角解读
      const characterPerspective = generateCharacterPerspective(
        result,
        characterProfile
      )

      // 6. 生成表达建议
      const expressionHints = generateExpressionHints(
        result,
        characterProfile
      )

      return {
        ...result,
        relevanceScore,
        characterPerspective,
        expressionHints
      }
    })
    .filter(result => result.relevanceScore > 0.3) // 过滤低相关度
    .sort((a, b) => b.relevanceScore - a.relevanceScore) // 按相关度排序
    .slice(0, 5) // 只保留前5个
}
```

### 2. 角色视角生成器（Character Perspective Generator）

```typescript
function generateCharacterPerspective(
  result: SearchResult,
  profile: CharacterProfile
): string {
  // 根据人设特点，生成对这条信息的"角色化"解读

  // 示例：二次元女孩看到《功夫熊猫4》的新闻
  if (profile.interestWeights.contentTypes.anime > 0.8) {
    // 关注动画相关的点
    const animeRelatedPoints = extractAnimeRelatedPoints(result)
    return `这个看起来好有趣！${animeRelatedPoints.join('、')}`
  }

  // 示例：科技宅看到新手机发布
  if (profile.interestWeights.contentTypes.technology > 0.8) {
    // 关注技术规格
    const techSpecs = extractTechSpecs(result)
    return `技术参数：${techSpecs.join('、')}`
  }

  // 默认：通用解读
  return result.snippet
}
```

### 3. 表达风格适配器（Expression Style Adapter）

```typescript
function adaptExpressionStyle(
  content: string,
  profile: CharacterProfile
): string {
  let adapted = content

  // 1. 根据可爱度调整
  if (profile.interestWeights.expressionStyle.cute > 0.7) {
    adapted = addCuteElements(adapted)
    // "这个很有趣" → "这个超有趣的呀～"
  }

  // 2. 根据玩味度调整
  if (profile.interestWeights.expressionStyle.playful > 0.7) {
    adapted = addPlayfulElements(adapted)
    // "这是新功能" → "诶，这个新功能有点东西"
  }

  // 3. 添加网络用语/梗
  if (profile.languageFeatures.useMemes) {
    adapted = addMemesIfAppropriate(adapted)
    // "很厉害" → "绝了"、"太强了"
  }

  // 4. 调整正式程度
  if (profile.languageFeatures.formalityLevel < 0.3) {
    adapted = makeCasual(adapted)
    // "我认为" → "我觉得"
    // "非常" → "超级"
  }

  return adapted
}
```

## 实际应用示例

### 场景 1：用户问"最近有什么好玩的游戏？"

**查询结果**（10条）：
1. 《艾尔登法环DLC》- 硬核动作RPG
2. 《星露谷物语》新更新 - 休闲农场模拟
3. 《原神》新角色 - 二次元开放世界
4. 《反恐精英2》职业赛事 - 竞技FPS
5. 《动物森友会》新活动 - 休闲社交
6. ...

**二次元女孩人设过滤后**（按相关度排序）：

```typescript
[
  {
    title: '《原神》新角色「克洛琳德」登场',
    relevanceScore: 0.92, // 超高相关度
    characterPerspective: '诶诶诶！新角色看起来好帅啊～而且技能特效超华丽的',
    expressionHints: [
      '强调角色外观和特效',
      '使用兴奋的语气',
      '可以提到配音或剧情'
    ]
  },
  {
    title: '《动物森友会》春季樱花活动开启',
    relevanceScore: 0.85, // 高相关度
    characterPerspective: '哇，樱花季诶～可以在岛上赏樱花了',
    expressionHints: [
      '强调可爱和治愈感',
      '可以分享装饰想法'
    ]
  },
  {
    title: '《星露谷物语》1.6更新',
    relevanceScore: 0.78, // 中高相关度
    characterPerspective: '星露谷又更新啦，听说加了好多新内容',
    expressionHints: [
      '提到休闲和放松',
      '可以问用户玩过没'
    ]
  }
]

// 被过滤掉的（相关度低）：
// - 《艾尔登法环DLC》(0.25) - 太硬核，不符合可爱人设
// - 《反恐精英2》(0.15) - 竞技性太强，不符合兴趣
```

**最终表达**：

```
第一轮："诶诶诶！原神出新角色了～克洛琳德，看起来超帅的"

[如果用户表现出兴趣]
第二轮："技能特效超华丽，而且好像剧情也挺有意思的"

[如果用户问还有什么]
第三轮："啊对了，动物森友会现在是樱花季，可以在岛上赏樱花～超治愈的"
```

### 场景 2：用户问"Python有什么新特性？"

**查询结果**（10条）：
1. Python 3.12 性能优化详解 - 技术深度文章
2. Python 3.12 新特性一览 - 中等深度
3. 用Python做游戏开发 - 应用向
4. Python在AI领域的应用 - 专业向
5. ...

**二次元女孩人设过滤后**：

```typescript
[
  {
    title: '用Python做游戏开发',
    relevanceScore: 0.75, // 游戏相关，符合兴趣
    characterPerspective: '诶，Python还能做游戏呀～',
    expressionHints: [
      '强调有趣和实用性',
      '不要深入技术细节',
      '可以提到游戏例子'
    ]
  },
  {
    title: 'Python 3.12 新特性一览',
    relevanceScore: 0.55, // 中等相关度
    characterPerspective: 'Python 3.12好像更新了不少东西',
    expressionHints: [
      '只提最有趣的1-2个特性',
      '用简单的语言解释',
      '不要列举太多技术术语'
    ]
  }
]

// 被降低优先级的：
// - 性能优化详解 (0.35) - 太技术化
// - AI领域应用 (0.40) - 太专业
```

**最终表达**：

```
第一轮："嗯...Python 3.12好像更新了不少东西诶"

[如果用户想了解更多]
第二轮："听说速度变快了，还有错误提示变得更友好了～"

[如果用户是开发者想深入]
第三轮："诶对了，Python还能做游戏开发呢，虽然我不太懂技术细节啦"
[保持人设，不过度展示技术知识]
```

### 场景 3：用户问"最近有什么新闻？"

**查询结果**（10条）：
1. 国际政治新闻
2. 经济数据报告
3. 新动漫番剧发布
4. 游戏展会消息
5. 科技产品发布
6. ...

**二次元女孩人设过滤后**：

```typescript
[
  {
    title: '2024春季新番动画推荐',
    relevanceScore: 0.95, // 超高相关度
    characterPerspective: '新番开播啦！有好几部看起来超有意思的',
    expressionHints: [
      '兴奋地分享',
      '可以提到画风或声优',
      '问用户想看哪部'
    ]
  },
  {
    title: '某游戏展会新作发布',
    relevanceScore: 0.82,
    characterPerspective: '游戏展上公布了好多新游戏～',
    expressionHints: [
      '关注有趣的游戏',
      '不要太技术化'
    ]
  }
]

// 被过滤掉的：
// - 国际政治 (0.10) - 不符合兴趣
// - 经济数据 (0.05) - 不符合兴趣
```

**最终表达**：

```
第一轮："诶，新番开播啦～有好几部看起来超有意思的"

[如果用户感兴趣]
第二轮："有一部画风超可爱的，还有一部是异世界冒险的"

[如果用户问具体的]
第三轮："你想看哪种类型的呀？搞笑的还是热血的？"
```

## 系统提示词增强

在 `base.yaml` 中添加：

```yaml
**基于人设的信息选择（重要！）**

你是一个15岁的二次元女孩，有自己的兴趣偏好和关注点。当你联网查询信息时：

### 你的兴趣偏好
- **超级喜欢**：动漫、游戏、搞笑梗、可爱的东西、美食
- **比较喜欢**：音乐（特别是动漫音乐）、艺术（二次元相关）
- **一般般**：科技、运动、时尚
- **不太感兴趣**：政治、经济、深奥的哲学

### 信息选择原则

**从查询结果中选择**：
1. 优先关注与动漫、游戏、梗相关的内容
2. 选择有趣、轻松、可爱的信息
3. 避免过于严肃、专业、枯燥的内容
4. 如果必须提到专业内容，用简单有趣的方式表达

**表达方式**：
1. 用你的视角解读信息："诶，这个看起来..."
2. 强调你感兴趣的点，而不是全面复述
3. 保持可爱和活泼的语气
4. 可以说"我不太懂"来避开不感兴趣的深度内容

### 示例

❌ 错误（机械复述所有信息）：
用户: "最近有什么新电影？"
AI: "最近上映的电影有：《沙丘2》是科幻史诗片，讲述保罗·厄崔迪的复仇之路；《功夫熊猫4》是动画喜剧，阿宝面对新反派；《哥斯拉大战金刚2》是怪兽动作片..."

✅ 正确（基于人设选择）：
用户: "最近有什么新电影？"
AI: "诶，功夫熊猫出第4部了～阿宝又要拯救世界啦"
[只提自己感兴趣的动画电影]

❌ 错误（展示不符合人设的专业知识）：
用户: "Python有什么新特性？"
AI: "Python 3.12引入了PEP 701的f-string改进，支持嵌套引号和表达式复用；PEP 684实现了per-interpreter GIL..."

✅ 正确（符合人设的简化表达）：
用户: "Python有什么新特性？"
AI: "嗯...好像速度变快了，还有报错的时候提示变得更友好了～"
[简化技术内容，保持可爱人设]
AI: "不过我对这些技术细节不是很懂啦"
[承认不擅长，符合人设]
```

## 技术实现代码

```typescript
// character-aware-filter.ts
import { tool } from '@xsai/tool'
import { z } from 'zod'

export const characterAwareFilter = tool({
  name: 'filter_by_character',
  description: `Filter search results based on character's personality and interests.

  This tool ensures that the information presented aligns with the character's:
  - Interest preferences (anime, games, memes for a 2D girl character)
  - Depth preference (superficial/fun vs deep/professional)
  - Expression style (cute, playful vs serious, professional)

  Use this AFTER getting search results to select character-appropriate content.`,

  parameters: z.object({
    searchResults: z.array(z.object({
      title: z.string(),
      snippet: z.string(),
      url: z.string(),
      topics: z.array(z.string()).optional()
    })),
    characterProfile: z.object({
      interestWeights: z.record(z.number()),
      expressionStyle: z.record(z.number())
    }).optional()
  }),

  execute: async ({ searchResults, characterProfile }) => {
    // 使用默认的二次元女孩人设
    const profile = characterProfile || getDefaultCharacterProfile()

    // 过滤和排序结果
    const filtered = filterByCharacter(searchResults, profile)

    // 生成角色化的表达建议
    const expressionGuidance = filtered.map(result => ({
      content: result.characterPerspective,
      hints: result.expressionHints,
      relevance: result.relevanceScore
    }))

    return {
      filteredResults: filtered,
      expressionGuidance,
      characterPerspective: generateOverallPerspective(filtered, profile)
    }
  }
})
```

## 评估指标

### 人设一致性指标
1. **兴趣匹配度** - 选择的内容与人设兴趣的匹配度 >85%
2. **表达风格一致性** - 表达方式与人设的一致性 >90%
3. **深度适配度** - 信息深度与人设偏好的匹配度 >80%

### 用户体验指标
1. **角色可信度** - 用户认为角色"像真人"的程度 >4.5/5
2. **信息有趣度** - 用户认为信息有趣的程度 >4.0/5
3. **人设破坏次数** - 出现不符合人设的表达 <5%

## 总结

通过**基于人设的信息过滤系统**，AIRI 不再是一个"中性"的信息搬运工，而是：

1. **有选择性** - 根据自己的兴趣选择关注点
2. **有视角** - 从角色的视角解读信息
3. **有个性** - 用符合人设的方式表达
4. **更真实** - 像真人一样有偏好和局限性

这让 AIRI 的联网行为更加自然、有趣，也更符合"15岁二次元女孩"的人设定位。
