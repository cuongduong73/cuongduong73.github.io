// api.js - Giao tiếp với AnkiConnect
const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

// AnkiConnect API
async function invoke(action, params = {}) {
    const response = await fetch(ANKI_CONNECT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, version: 6, params })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.result;
}

export const AnkiAPI = {
    checkConnection: () => invoke("version"),
    getDecks: () => invoke("deckNames"),                                // Lấy tất cả các Deck
    getModels: () => invoke("modelNames"),                              // Lấy tất cả Note Type
    getFields: modelName => invoke("modelFieldNames", { modelName }),   // Lấy tất cả field của Note Type
    getTags: () => invoke("getTags"),                                   // Lấy tất cả Tags
    findNotes: query => invoke('findNotes', { query }),                 // Tìm tất cả các note thỏa mãn điều kiện
    getNotesInfo: notes => invoke("notesInfo", { notes }),              // Lấy nội dung của notes
    openNote: query => invoke('guiBrowse', { query })                   // Xem nội dung note qua Browse
};

export function buildAnkiQuery(deck, noteType, tags, onlyStudied) {
    let query = `deck:"${deck}" note:"${noteType}"`;

    if (tags.length > 0) {
        const tagQuery = tags.map(tag => `tag:"${tag}"`).join(' OR ');
        query += ` (${tagQuery})`;
    }

    if (onlyStudied) {
        query += ' -is:new';
    }

    return query;
}

// Check Connection
export async function checkAnkiConnection() {
    try {
        await AnkiAPI.checkConnection();
        return true;
    } catch (error) {
        return false;
    }
}