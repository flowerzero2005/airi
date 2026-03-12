# 项目重命名总结：AIRI → Rin（凛）

## 完成时间
2026-03-11

## 重命名范围

### 1. 包名和命名空间
- ✅ `@proj-airi/*` → `@proj-rin/*` (已在根 package.json 中完成)
- ✅ 所有 package.json 中的包名已更新
- ✅ 所有 import 语句中的包引用已更新

### 2. 项目标识
- ✅ 应用 ID: `ai.moeru.airi` → `ai.moeru.rin`
- ✅ 产品名称: `AIRI` → `Rin`
- ✅ 可执行文件名: `airi` → `rin`
- ✅ 仓库 URL: `moeru-ai/airi` → `moeru-ai/rin`
- ✅ 域名: `airi.moeru.ai` → `rin.moeru.ai`
- ✅ 邮箱: `airi@moeru.ai` → `rin@moeru.ai`

### 3. 数据库名称
- ✅ `rin-notebook` (已在 notebook.repo.ts 中配置)
- ⚠️ `airi-local` → `rin-local` (需要用户手动迁移数据)

### 4. 配置文件
- ✅ electron-builder.config.ts
- ✅ package.json (所有包)
- ✅ flake.nix
- ✅ Dockerfile
- ✅ .toml 配置文件
- ✅ .desktop 文件
- ✅ GitHub workflows
- ✅ cspell.config.yaml
- ✅ .gitignore

### 5. 代码中的引用
- ✅ 窗口标题: "About AIRI" → "About Rin"
- ✅ 托盘图标和应用名称
- ✅ 权限描述文本
- ✅ Linux 应用描述

### 6. 角色卡片和默认提示词
- ✅ 中文提示词: AIRI → Rin（凛）
- ✅ 英文提示词: AIRI → Rin (凛)
- ✅ 角色名称含义更新：
  - 旧: A.I. + "Ri"（茉莉）
  - 新: Rin（凛），意为"凛冽、清冷"
- ✅ 发音更新: /ˈaɪriː/ → /rɪn/

### 7. 文件和目录重命名
- ✅ `airi-card.ts` → `character-card.ts`
- ✅ `airi-adapter.ts` → `rin-adapter.ts` (services)
- ⚠️ `airi-card/` → `character-card/` (目录重命名因权限问题未完成)
- ⚠️ `services/airi/` 目录保持不变（内部服务目录）
- ⚠️ VSCode 插件目录 `vscode-airi/` 和 `airi-plugin-vscode/` 保持不变
- ⚠️ Plugins 目录 `airi-plugin-*` 保持不变

### 8. 文档更新
- ✅ README.md 文件
- ✅ 所有语言的 base.yaml
- ✅ settings.yaml 翻译文件

## 需要手动处理的项目

### 1. 目录重命名（权限限制）
以下目录因权限问题无法自动重命名，需要手动处理：
- `packages/stage-pages/src/pages/settings/airi-card/` → `character-card/`
- `apps/stage-tamagotchi/src/main/services/airi/` (可选，建议保留)
- `integrations/vscode/vscode-airi/` (可选，建议保留)
- `integrations/vscode/airi-plugin-vscode/` (可选，建议保留)
- `plugins/airi-plugin-*` (可选，建议保留)

### 2. 数据迁移
用户需要手动迁移 IndexedDB 数据：
- 旧数据库: `airi-local`, `airi-notebook`
- 新数据库: `rin-local`, `rin-notebook`

建议在应用启动时添加自动迁移逻辑。

### 3. Git 仓库
- 需要在 GitHub 上将仓库从 `moeru-ai/airi` 重命名为 `moeru-ai/rin`
- 更新所有 CI/CD 配置中的仓库引用

### 4. 域名和部署
- 配置新域名: `rin.moeru.ai`
- 更新 DNS 记录
- 更新 CDN 配置
- 更新 Cloudflare Workers 配置

### 5. 发布和分发
- 更新 Flatpak 配置
- 更新 Nix 包配置
- 更新 Docker Hub 仓库名
- 更新 npm 包名（如果有公开发布）

## 验证清单

- [ ] 编译通过: `pnpm build`
- [ ] 类型检查通过: `pnpm typecheck`
- [ ] Lint 检查通过: `pnpm lint`
- [ ] 测试通过: `pnpm test`
- [ ] Electron 应用可以正常启动
- [ ] Web 应用可以正常访问
- [ ] 数据库迁移逻辑正常工作
- [ ] 所有链接和引用已更新

## 注意事项

1. **向后兼容性**: 考虑添加数据迁移逻辑，自动将旧的 `airi-*` 数据库迁移到 `rin-*`
2. **用户通知**: 在更新日志中明确说明品牌重塑和数据迁移事项
3. **搜索引擎**: 设置 301 重定向从旧域名到新域名
4. **社交媒体**: 更新所有社交媒体账号和链接
5. **文档站点**: 更新所有文档中的截图和示例

## 相关 PR 和 Issue

- 本次重命名涉及 600+ 个文件的更改
- 主要更改集中在配置文件、翻译文件和代码引用

## 后续工作

1. 完成目录重命名（需要管理员权限）
2. 实现数据库自动迁移功能
3. 更新所有外部服务配置
4. 发布重命名公告
5. 更新品牌资产（Logo、图标等）
