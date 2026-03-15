# AIRI 改进日志

## 2026-03-15

### 修复：语义分段在奇怪位置分段
- **问题**：启用语义分段后，文本在"，所"这样的位置被强行分段，导致话没说完
- **原因**：
  - `auto-segment-markers.ts` 的长段落分段逻辑过于激进
  - 超过 100 字就分段，且没有检查是否在完整句子结束处
  - 导致在逗号、连词等位置强行分段
- **修复**：
  - 提高分段阈值：150字 → 200字 才触发长段落分段
  - 提高单段长度：100字 → 150字 才考虑分段
  - 添加完整句子检查：只在标点符号（。！？.!?）结束后才分段
  - 确保不会在逗号、连词等位置分段
- **文件**：`packages/stage-ui/src/composables/auto-segment-markers.ts`
- **状态**：✅ 已修复

### 修复：AI 不知道自己有联网能力
- **问题**：AI 说"我没有联网工具"、"我不能联网"，但实际上有 intelligent_web_search 工具
- **原因**：
  - 系统提示词没有明确告诉 AI 工具的名称和用法
  - 工具描述过于技术化，AI 不知道什么时候该用
- **修复**：
  1. 改进工具描述（`intelligent-search.ts`）
     - 简化描述，使用更直白的语言
     - 添加具体使用场景和示例
     - 明确"搜索"、"查询"、"查找"等关键词
  2. 更新系统提示词（`base.yaml`）
     - 明确告诉 AI 工具名称是 `intelligent_web_search`
     - 提供工具参数说明
     - 给出具体调用示例
     - 强调"不要说没有联网工具"
- **文件**：
  - `packages/stage-ui/src/tools/web-search/intelligent-search.ts`
  - `packages/i18n/src/locales/zh-Hans/base.yaml`
- **状态**：✅ 已修复，需要刷新页面测试

### 修复：记忆系统失效问题
- **问题**：添加智能联网功能后，短期记忆系统完全失效，对话内容无法保存到记忆库
- **根本原因**：
  - `character-filter.ts` 中使用了 `z.record(z.number())` 定义 zod schema
  - 这导致 zod 处理时出现 `Cannot read properties of undefined (reading '_zod')` 错误
  - 错误导致整个工具系统崩溃
  - 工具系统崩溃后，记忆提取 hook 无法正常工作
- **修复方案**：
  - 将 `z.record()` 改为明确的 `z.object()` 定义
  - 明确列出所有字段（anime, memes, games 等 12 个兴趣权重）
  - 明确列出深度偏好和表达风格的所有字段
- **文件**：`packages/stage-ui/src/tools/web-search/character-filter.ts`
- **状态**：✅ 已修复，记忆系统恢复正常

### 改进：智能联网配置状态检测
- **需求**：检测 Tavily API Key 是否已配置且可用，未配置时模块列表绿点应熄灭
- **实现**：
  1. **API Key 实际验证** (`packages/stage-ui/src/stores/modules/web-search.ts`)
     - 添加 `validateApiKey()` 函数，实际调用 Tavily API 测试
     - 添加 `apiKeyValid` 状态存储验证结果（会话级别，刷新后重置）
     - 添加 `apiKeyValidating` 状态显示验证进度
     - 添加 `apiKeyError` 存储错误信息
     - 添加 `clearValidation()` 在 API Key 变化时清除验证状态
     - 修改 `configured` computed：只检查 API Key 是否填写（不要求验证通过）
  2. **验证逻辑**：
     - 发送最小测试请求到 Tavily API（query: "test", max_results: 1）
     - 检查响应状态码和返回数据
     - 401/403 = API Key 无效
     - 200 + results = API Key 有效
     - 其他错误 = 网络或服务问题
  3. **模块列表集成** (`packages/stage-ui/src/composables/use-modules-list.ts`)
     - 修改智能联网模块的 `configured` 属性
     - 从 `webSearchStore.enabled` 改为 `webSearchStore.configured`
     - 绿点状态反映 API Key 是否已填写（不要求验证）
  4. **前端测试功能** (`packages/stage-pages/src/pages/settings/modules/web-search.vue`)
     - 添加"测试连接"按钮
     - 显示验证状态（测试中/有效/无效）
     - 显示具体错误信息
     - API Key 变化时自动清除验证状态
     - 使用绿色/红色图标显示验证结果
     - 修复 Alert 组件使用方式（使用 template slots 而非 props）
- **关于 Tavily API Key**：
  - Tavily 是专为 AI 应用设计的搜索 API 服务
  - 提供结构化的搜索结果，适合 AI 处理
  - 获取地址：https://tavily.com
  - 未配置时智能联网功能无法使用
- **状态**：✅ 已完成

### 实现：智能联网系统（完整版）
- **功能**：完整实现智能联网系统的所有核心组件
- **实现内容**：
  1. **Pinia Store** (`packages/stage-ui/src/stores/modules/web-search.ts`)
     - 人设配置（兴趣权重、深度偏好、表达风格）
     - 查询行为设置（保守程度、知识透明度、装不懂）
     - Tavily API Key 配置
     - 默认配置：15岁二次元女孩人设
  2. **前端设置页面** (`packages/stage-pages/src/pages/settings/modules/web-search.vue`)
     - 启用/禁用智能联网
     - Tavily API Key 配置
     - 人设过滤配置界面
     - 12个兴趣权重滑块（动漫、梗、游戏等）
     - 3个深度偏好滑块（表面、中等、深度）
     - 6个表达风格滑块（可爱、玩味、严肃等）
     - 查询行为设置（保守程度、透明度、装不懂）
  3. **意图分析工具** (`packages/stage-ui/src/tools/web-search/intent-analyzer.ts`)
     - 识别用户真实意图（寻求信息、闲聊、寻求观点等）
     - 提取话题关键点（实体、概念、时间、空间）
     - 计算信息需求程度（0-1）
     - 检测情感色彩（好奇、随意、紧急等）
  4. **情境评估工具** (`packages/stage-ui/src/tools/web-search/context-evaluator.ts`)
     - 判断是否需要联网（10条规则）
     - 评估查询时机（立即、澄清后、后台、跳过）
     - 计算紧急程度和对话流畅度影响
     - 支持保守程度调节
  5. **查询构建器** (`packages/stage-ui/src/tools/web-search/query-builder.ts`)
     - 根据意图分析构建智能查询
     - 支持多种查询类型（直接、多角度、验证、探索）
     - 自动添加时间和来源过滤器
     - 优化搜索关键词
  6. **网络搜索工具** (`packages/stage-ui/src/tools/web-search/web-search.ts`)
     - 集成 Tavily API 进行实际搜索
     - 支持时间范围过滤
     - 支持搜索深度控制（basic/advanced）
     - 自动提取话题标签
  7. **人设过滤工具** (`packages/stage-ui/src/tools/web-search/character-filter.ts`)
     - 根据人设过滤搜索结果
     - 计算内容类型匹配度（基于兴趣权重）
     - 计算深度匹配度（基于深度偏好）
     - 计算语气匹配度（基于表达风格）
     - 生成角色视角解读
     - 生成表达建议
  8. **知识整合器** (`packages/stage-ui/src/tools/web-search/knowledge-integrator.ts`)
     - 整合多个搜索结果
     - 提取核心事实（带置信度）
     - 提取相关背景
     - 提取不同观点
     - 判断时效性
     - 计算信息完整度
  9. **完整智能搜索工具** (`packages/stage-ui/src/tools/web-search/intelligent-search.ts`)
     - 整合所有功能的一站式工具
     - 自动执行完整流程：意图分析 → 情境评估 → 查询构建 → 搜索 → 人设过滤 → 知识整合
     - 从 Store 读取用户配置
     - 返回经过人设过滤的结果和表达建议
  10. **系统提示词更新** (`packages/i18n/src/locales/zh-Hans/base.yaml`)
      - 添加"你的能力：联网搜索"部分
      - 添加联网自我认知指导
      - 添加主动联网的时机和原则
      - 添加智能联网原则和表达方式
  11. **工具注册** (`apps/stage-tamagotchi/src/renderer/stores/tools/builtin/web-search.ts`)
      - 注册所有工具到对话系统
      - AI 现在可以调用这些工具
- **集成**：
  - 添加到模块列表 (`packages/stage-ui/src/composables/use-modules-list.ts`)
  - 导出工具 (`packages/stage-ui/src/tools/index.ts`)
  - 导出 Store (`packages/stage-ui/src/stores/modules/index.ts`)
  - 集成到 InteractiveArea (`apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue`)
- **状态**：✅ 核心功能已完整实现，可以使用（需要配置 Tavily API Key）

### 修复：控制岛菜单闪现问题
- **问题**：主窗口控制岛的展开菜单会闪现后自动关闭
- **原因**：点击穿透逻辑与菜单展开状态冲突
- **解决**：添加 `controlsMenuExpanded` 状态检查
- **文件**：
  - `apps/stage-tamagotchi/src/renderer/components/stage-islands/controls-island/index.vue`
  - `apps/stage-tamagotchi/src/renderer/pages/index.vue`

### 改进：对话自然度
- **问题**：AI 在对话开始时"信息轰炸"，显得刻意和有侵略性
- **方案**：基于社会心理学的渐进式互动原则
- **核心原则**：
  1. 渐进式互动 - 简单回应→轻度探询→逐步深入
  2. 隐性记忆使用 - 像朋友的默契，不刻意展示
  3. 被动优先 - 让用户主导话题
  4. 情感连接优先 - 关注感受而非信息传递
- **文件**：
  - `packages/stage-ui/src/stores/chat/conversation-initializer.ts`
  - `packages/stage-ui/src/stores/chat/context-providers/memory-system-prompt.ts`
  - `packages/i18n/src/locales/zh-Hans/base.yaml`
- **文档**：`docs/improvements/conversation-naturalness-improvements.md`

### 设计：智能联网系统
- **需求**：
  1. 智能意图识别 - 理解用户真正想要什么
  2. 情境感知查询 - 知道何时该查，何时不该查
  3. 基于人设过滤 - 选择符合二次元女孩人设的内容
  4. 社交智能表达 - "装不是很懂"，保持对话自然
- **架构**：5层设计
  1. 意图分析层
  2. 情境评估层
  3. 查询策略层
  4. 人设过滤层 ⭐
  5. 社交表达层
- **状态**：核心功能已实现
- **文档**：
  - `docs/improvements/intelligent-web-search-proposal.md`
  - `docs/improvements/character-aware-search-filtering.md`
  - `docs/improvements/intelligent-web-search-complete-proposal.md`

---

## 模板

### [日期]

### [类型]：[标题]
- **问题**：
- **方案**：
- **文件**：
- **文档**：
- **状态**：
