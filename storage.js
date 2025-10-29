// storage.js - Chỉ dùng IndexedDB
class StorageManager {
    constructor() {
        this.db = null;
        this.dbName = 'AnkiDataDB';
        this.dbVersion = 1;
        this.storeName = 'datasets';
    }

    // Khởi tạo IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB đã sẵn sàng');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (db.objectStoreNames.contains(this.storeName)) {
                    db.deleteObjectStore(this.storeName);
                }
                
                const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            };
        });
    }

    // Lưu toàn bộ datasets
    async save(datasets) {
        if (!this.db) await this.init();

        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        await store.clear();
        
        for (const dataset of datasets) {
            store.add(dataset);
        }
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log(`💾 Đã lưu ${datasets.length} datasets`);
                resolve(true);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Load toàn bộ datasets
    async load() {
        if (!this.db) await this.init();

        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const datasets = request.result || [];
                console.log(`📦 Đã tải ${datasets.length} datasets`);
                resolve(datasets);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Xóa một dataset
    async deleteDataset(id) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Export backup
    async exportToFile() {
        const datasets = await this.load();
        const dataStr = JSON.stringify(datasets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anki-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`✅ Đã xuất ${datasets.length} datasets`);
    }

    // Import backup
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) {
                        throw new Error('File không đúng định dạng');
                    }
                    
                    await this.save(imported);
                    alert(`✅ Đã import ${imported.length} datasets`);
                    resolve(imported);
                } catch (error) {
                    alert('❌ File không hợp lệ: ' + error.message);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // Xóa toàn bộ
    async clearAll() {
        if (!confirm('⚠️ Xóa TOÀN BỘ dữ liệu? Không thể hoàn tác!')) {
            return false;
        }
        
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                alert('✅ Đã xóa toàn bộ dữ liệu');
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Thống kê
    async getStats() {
        const datasets = await this.load();
        const size = new Blob([JSON.stringify(datasets)]).size;
        
        return {
            count: datasets.length,
            totalCards: datasets.reduce((sum, d) => sum + d.cardCount, 0),
            sizeFormatted: (size / 1024 / 1024).toFixed(2) + ' MB'
        };
    }
}

const storageManager = new StorageManager();