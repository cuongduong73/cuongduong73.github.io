import { storageManager } from './storage.js';
import { DataParserFactory } from '../data/DataParserFactory.js';

class DatasetManager {
    constructor() {
        this._datasets = [];
        this._listeners = {};
    }

    // === Event System ===
    on(event, callback) {
        (this._listeners[event] ||= []).push(callback);
    }

    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }

    async load() {
        this._datasets = await storageManager.loadAll();
        this.emit('updated', this._datasets);
        return this._datasets;
    }

    getAll() { return this._datasets; }

    async create({ name, type, deck, noteType, tags, notesInfo, metadata }) {
        const parser = DataParserFactory.create(type, notesInfo);
        const parsedData = parser.parse();
        const dataset = {
            id: Date.now(),
            name, type, deck, noteType, tags,
            cardCount: parsedData.length,
            notesInfo: parsedData,
            createdAt: new Date().toISOString(),
            metadata: metadata || {}
        };

        await storageManager.save(dataset);
        this._datasets.push(dataset);
        this.emit('updated', this._datasets);
        return dataset;
    }

    async delete(id) {
        await storageManager.delete(Number(id));
        this._datasets = this._datasets.filter(d => d.id !== Number(id));
        this.emit('updated', this._datasets);
    }

    async importFromFile(file) {
        const imported = await this._importFile(file);
        this._datasets = imported;
        this.emit('updated', this._datasets);
    }

    _importFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    await storageManager.saveAll(imported);
                    resolve(imported);
                } catch (err) { reject(err); }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
}

export const datasetManager = new DatasetManager();
