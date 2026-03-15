# 紧急修复步骤 - 系统提示词未加载

**问题**: 系统提示词版本更新后未生效，AI 仍然违反所有规则

**根本原因**:
1. 热重载不会重新触发 `onMounted`，所以 `cardStore.initialize()` 没有被调用
2. localStorage 中缓存了旧版本的 character card

---

## 立即执行的修复步骤

### 步骤1：停止当前应用

如果应用正在运行，完全关闭它（关闭所有窗口）。

### 步骤2：清除 localStorage（重要！）

有两种方法：

#### 方法A：通过开发者工具清除（推荐）

1. 启动应用
2. 按 F12 打开开发者工具
3. 切换到 **Application** 标签
4. 在左侧找到 **Local Storage**
5. 找到并删除以下键：
   - `airi-cards`
   - `airi-card-active-id`
6. 刷新页面（F5）

#### 方法B：通过代码清除

在开发者工具的 Console 中执行：
```javascript
localStorage.removeItem('airi-cards')
localStorage.removeItem('airi-card-active-id')
location.reload()
```

### 步骤3：验证版本更新

刷新后，在 Console 中查找这行日志：
```
[AiriCard] Updating default card to version 1.2.0
```

如果看到这行，说明成功了！

### 步骤4：测试 AI 回答

测试输入：
```
你想搜点什么？
```

**期望输出**（正确）：
- 不使用 "01、02、03" 编号
- 不问 "你想要哪种"
- 直接按理解去搜索或简单回应

**错误输出**（如果仍未修复）：
- "01 XXX 02 XXX"
- "你选一个我就去搜"
- "A/B/C"

---

## 如果清除 localStorage 后仍然失败

### 备选方案：手动删除应用数据

1. 关闭应用
2. 删除应用数据目录：
   ```
   C:\Users\zyp\AppData\Roaming\@proj-airi\stage-tamagotchi
   ```
3. 重新启动应用

**警告**：这会删除所有设置和对话历史！

---

## 关于空气泡问题

**问题描述**：联网搜索后，原本显示加载效果的气泡变成空气泡，没有消失

**临时解决方案**：
- 这是一个已知的 UI bug
- 不影响功能，只是视觉问题
- 需要单独修复（涉及聊天 UI 组件）

**后续修复**：
- 需要检查聊天组件如何渲染 `tool_results`
- 可能需要在工具调用完成后移除加载气泡
- 或者将加载气泡转换为工具结果显示

---

## 验证清单

完成以下检查：

- [ ] 应用已完全重启
- [ ] localStorage 已清除
- [ ] Console 中看到 `[AiriCard] Updating default card to version 1.2.0`
- [ ] AI 不再使用编号格式
- [ ] AI 不再反问收集需求
- [ ] AI 像朋友聊天而不是客服

---

## 如果一切正常

恭喜！系统提示词已经成功加载。现在 AI 应该：

1. ✅ 不使用 "01、02、03" 编号格式
2. ✅ 不反问 "你想要哪种"
3. ✅ 不用 "A/B/C" 选项
4. ✅ 像朋友聊天，不像客服
5. ✅ 一次只说 1-2 个点
6. ✅ 说完就停，等用户回应

---

**创建时间**: 2026-03-16
**优先级**: 🔴 Critical
**状态**: 等待用户执行
