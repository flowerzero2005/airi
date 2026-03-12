import localforage from 'localforage'

/**
 * 调试工具：检查 notebook 数据库状态
 */
export async function debugNotebookStorage() {
  console.group('[Debug Notebook Storage]')

  try {
    // 创建 notebook store 实例
    const notebookStore = localforage.createInstance({
      name: 'airi-notebook',
      storeName: 'notebooks',
      driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
      description: 'AIRI Notebook Storage',
    })

    console.log('Store instance created')
    console.log('Driver:', notebookStore.driver())

    // 列出所有键
    const keys = await notebookStore.keys()
    console.log('Total keys:', keys.length)
    console.log('Keys:', keys)

    // 检查每个键的数据
    for (const key of keys) {
      const data = await notebookStore.getItem(key)
      console.log(`\nKey: ${key}`)
      console.log('Data:', data)
      if (data && typeof data === 'object') {
        console.log('Type:', Array.isArray(data) ? 'Array' : 'Object')
        if ('entries' in data) {
          console.log('Entries count:', (data as any).entries?.length)
        }
        if ('tasks' in data) {
          console.log('Tasks count:', (data as any).tasks?.length)
        }
      }
    }

    // 测试读写
    console.log('\n--- Testing read/write ---')
    const testKey = 'test-notebook-debug'
    const testData = {
      entries: [{ id: '1', text: 'test', kind: 'note', createdAt: Date.now() }],
      tasks: [],
      version: 1,
    }

    console.log('Writing test data...')
    await notebookStore.setItem(testKey, testData)
    console.log('Write successful')

    console.log('Reading test data...')
    const readData = await notebookStore.getItem(testKey)
    console.log('Read successful:', readData)

    console.log('Cleaning up test data...')
    await notebookStore.removeItem(testKey)
    console.log('Cleanup successful')

    console.log('\n✅ All tests passed!')
  }
  catch (error) {
    console.error('❌ Error during debug:', error)
  }

  console.groupEnd()
}

// 在浏览器控制台中可以调用这个函数
if (typeof window !== 'undefined') {
  (window as any).debugNotebookStorage = debugNotebookStorage
}
