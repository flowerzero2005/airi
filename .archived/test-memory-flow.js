// 测试记忆存储流程
// 在浏览器控制台中运行此脚本

console.log('========== 开始测试记忆存储流程 ==========')

// 1. 检查 store 是否存在
async function testStores() {
  console.log('\n1. 检查 Pinia stores...')

  try {
    // 获取 Vue 实例
    const app = document.querySelector('#app').__vueParentComponent
    if (!app) {
      console.error('❌ 无法找到 Vue 应用实例')
      return false
    }

    console.log('✅ Vue 应用实例已找到')
    return true
  }
  catch (error) {
    console.error('❌ 检查 stores 失败:', error)
    return false
  }
}

// 2. 检查 IndexedDB
async function testIndexedDB() {
  console.log('\n2. 检查 IndexedDB...')

  try {
    const dbs = await indexedDB.databases()
    console.log('可用的数据库:', dbs)

    const airiNotebook = dbs.find(db => db.name === 'airi-notebook')
    if (airiNotebook) {
      console.log('✅ airi-notebook 数据库存在')

      // 打开数据库并读取数据
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('airi-notebook')

        request.onsuccess = (event) => {
          const db = event.target.result
          console.log('数据库版本:', db.version)
          console.log('对象存储:', Array.from(db.objectStoreNames))

          if (db.objectStoreNames.contains('notebooks')) {
            const transaction = db.transaction(['notebooks'], 'readonly')
            const store = transaction.objectStore('notebooks')
            const getAllRequest = store.getAll()

            getAllRequest.onsuccess = () => {
              const data = getAllRequest.result
              console.log('✅ 数据库中的记录数:', data.length)
              console.log('记录内容:', data)
              resolve(true)
            }

            getAllRequest.onerror = () => {
              console.error('❌ 读取数据失败')
              reject(false)
            }
          }
          else {
            console.warn('⚠️ notebooks 对象存储不存在')
            resolve(false)
          }
        }

        request.onerror = () => {
          console.error('❌ 打开数据库失败')
          reject(false)
        }
      })
    }
    else {
      console.warn('⚠️ airi-notebook 数据库不存在')
      return false
    }
  }
  catch (error) {
    console.error('❌ 检查 IndexedDB 失败:', error)
    return false
  }
}

// 3. 手动触发记忆保存测试
async function testMemorySave() {
  console.log('\n3. 测试手动保存记忆...')

  try {
    // 使用 localforage 直接保存测试数据
    const testData = {
      entries: [
        {
          id: `test-${Date.now()}`,
          kind: 'note',
          text: '这是一条测试记忆',
          createdAt: Date.now(),
          tags: ['测试'],
          metadata: { test: true },
        },
      ],
      tasks: [],
      version: 1,
      lastSyncedAt: Date.now(),
    }

    console.log('准备保存测试数据:', testData)

    // 需要先加载 localforage
    if (typeof localforage === 'undefined') {
      console.error('❌ localforage 未加载')
      return false
    }

    const notebookStore = localforage.createInstance({
      name: 'airi-notebook',
      storeName: 'notebooks',
      driver: [localforage.INDEXEDDB],
    })

    await notebookStore.setItem('notebook-default', testData)
    console.log('✅ 测试数据已保存')

    // 验证保存
    const saved = await notebookStore.getItem('notebook-default')
    console.log('✅ 验证保存的数据:', saved)

    return true
  }
  catch (error) {
    console.error('❌ 测试保存失败:', error)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  await testStores()
  await testIndexedDB()
  await testMemorySave()

  console.log('\n========== 测试完成 ==========')
  console.log('\n下一步：')
  console.log('1. 在应用中发送一条消息')
  console.log('2. 观察控制台日志，查找以下标记：')
  console.log('   - [Chat] ========== 准备触发 onChatTurnComplete 钩子 ==========')
  console.log('   - [ChatHooks] emitChatTurnCompleteHooks 被调用')
  console.log('   - [Stage] ========== onChatTurnComplete 钩子被触发 ==========')
  console.log('   - [MemoryManager] ========== processConversationTurn 被调用 ==========')
  console.log('   - [Notebook] addEntry 被调用')
  console.log('   - [NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========')
}

runAllTests()
