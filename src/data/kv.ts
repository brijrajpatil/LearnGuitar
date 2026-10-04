// The storage the rest of the app sees. Today it's IndexedDB on this device. A sync
// backend can implement the same interface later.

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  entries(): Promise<[string, unknown][]>
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.map.get(key)) as T | undefined
  }

  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, structuredClone(value))
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key)
  }

  async entries(): Promise<[string, unknown][]> {
    return [...this.map.entries()].map(([k, v]) => [k, structuredClone(v)])
  }
}

const DB_NAME = "song-practice"
const STORE = "kv"

export class IndexedDbStore implements KeyValueStore {
  private db: Promise<IDBDatabase>

  constructor(factory: IDBFactory = indexedDB) {
    this.db = new Promise((resolve, reject) => {
      const req = factory.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.run("readonly", (s) => s.get(key) as IDBRequest<T | undefined>)
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.run("readwrite", (s) => s.put(value, key))
  }

  async delete(key: string): Promise<void> {
    await this.run("readwrite", (s) => s.delete(key))
  }

  async entries(): Promise<[string, unknown][]> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const store = tx.objectStore(STORE)
      const keys = store.getAllKeys()
      const values = store.getAll()
      tx.oncomplete = () => resolve(keys.result.map((k, i) => [String(k), values.result[i]]))
      tx.onerror = () => reject(tx.error)
    })
  }
}
