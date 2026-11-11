/**
 * 语音录音存放在 IndexedDB：localStorage 容量只有几 MB，装不下音频。
 * 浏览器不支持或用户拒绝存储时，事件本身仍可正常保存。
 */
const DB_NAME = 'lifeconfidant'
const DB_VERSION = 1
const STORE = 'recordings'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('当前浏览器不支持 IndexedDB'))
  }
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开录音数据库'))
    request.onblocked = () => reject(new Error('录音数据库被其他页面占用'))
  })
  return dbPromise
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = run(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('录音存储失败'))
      }),
  )
}

export async function saveRecording(id: string, blob: Blob): Promise<void> {
  await withStore('readwrite', (store) => store.put(blob, id) as IDBRequest<IDBValidKey>)
}

export async function loadRecording(id: string): Promise<Blob | null> {
  try {
    const value = await withStore<Blob | undefined>('readonly', (store) => store.get(id))
    return value ?? null
  } catch {
    return null
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
  } catch {
    /* 尽力而为 */
  }
}

export async function clearRecordings(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.clear() as IDBRequest<undefined>)
  } catch {
    /* 尽力而为 */
  }
}
