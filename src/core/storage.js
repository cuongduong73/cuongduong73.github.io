// core/storage.js
class StorageManager {
    constructor() {
        this.db = null;
        this.dbName = 'AnkiDataDB';
        this.dbVersion = 1;
        this.storeName = 'datasets';
    }

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('name', 'name');
                    store.createIndex('type', 'type');
                    store.createIndex('createdAt', 'createdAt');
                }
            };
        });
    }

    async save(dataset) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(dataset);
            tx.oncomplete = () => resolve(dataset);
            tx.onerror = () => reject(tx.error);
        });
    }

    async saveAll(datasets) {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        for (const ds of datasets) store.put(ds);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async loadAll() {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName], 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getById(id) {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName], 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);

        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(id) {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async clearAll() {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async getStats() {
        const datasets = await this.loadAll();
        const size = new Blob([JSON.stringify(datasets)]).size;
        return {
            count: datasets.length,
            totalCards: datasets.reduce((s, d) => s + (d.cardCount || 0), 0),
            sizeFormatted: (size / 1024 / 1024).toFixed(2) + ' MB'
        };
    }
}

export const storageManager = new StorageManager();