const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
const ANKI_MEDIA_URL = 'https://iili.io/';
let datasets = [];
let ankiConnected = false;

// AnkiConnect API
async function invoke(action, params = {}) {
    const response = await fetch(ANKI_CONNECT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, version: 6, params })
    });
    const result = await response.json();
    if (result.error) {
        throw new Error(result.error);
    }
    return result.result;
}

// Check Anki Connection on Page Load
async function checkAnkiConnection() {
    const statusDiv = document.getElementById('connectionStatus');
    const importBtn = document.getElementById('importBtn');

    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra kết nối với Anki...';
    statusDiv.className = 'alert alert-info';
    importBtn.disabled = true;

    try {
        await invoke('version');
        ankiConnected = true;
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Kết nối Anki thành công! Sẵn sàng nhập dữ liệu.';
        statusDiv.className = 'alert alert-success';
        importBtn.disabled = false;
    } catch (error) {
        ankiConnected = false;
        statusDiv.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i> 
                    <strong>Không thể kết nối với Anki!</strong><br>
                    <small>Lỗi: ${error.message}</small><br>
                    <small>Đảm bảo:</small>
                    <ul class="mb-0 mt-2">
                        <li>Anki đang chạy</li>
                        <li>AnkiConnect đã được cài đặt (code: 2055492159)</li>
                        <li>Đã thêm "https://claude.ai" vào webCorsOriginList</li>
                        <li>Đã khởi động lại Anki sau khi cấu hình</li>
                    </ul>
                    <button class="btn btn-sm btn-warning mt-2" onclick="checkAnkiConnection()">
                        <i class="fas fa-sync"></i> Thử lại
                    </button>
                `;
        statusDiv.className = 'alert alert-danger';
        importBtn.disabled = true;
    }
}

// Show Import Modal
document.getElementById('importBtn').addEventListener('click', async () => {
    if (!ankiConnected) {
        alert('Vui lòng kết nối với Anki trước!');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    modal.show();

    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('importForm').style.display = 'none';
    document.getElementById('saveDatasetBtn').style.display = 'none';

    try {
        // Get decks
        const decks = await invoke('deckNames');
        const deckSelect = document.getElementById('deckSelect');
        deckSelect.innerHTML = '<option value="">-- Chọn Deck --</option>';
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck;
            option.textContent = deck;
            deckSelect.appendChild(option);
        });

        // Get note types
        const noteTypes = await invoke('modelNames');
        const noteTypeSelect = document.getElementById('noteTypeSelect');
        noteTypeSelect.innerHTML = '<option value="">-- Chọn Note Type --</option>';
        noteTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            noteTypeSelect.appendChild(option);
        });

        // Get all tags
        const tags = await invoke('getTags');
        const tagsSelect = document.getElementById('tagsSelect');
        tagsSelect.innerHTML = '';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagsSelect.appendChild(option);
        });

        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('importForm').style.display = 'block';
        document.getElementById('saveDatasetBtn').style.display = 'block';

        document.getElementById('connectionStatus').className = 'alert alert-success';
        document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-check-circle"></i> Kết nối Anki thành công!';
    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('connectionStatus').className = 'alert alert-danger';
        document.getElementById('connectionStatus').innerHTML = `<i class="fas fa-exclamation-circle"></i> Lỗi: ${error.message}. Đảm bảo Anki đang chạy và AnkiConnect đã được cài đặt.`;
        modal.hide();
    }
});

// Save Dataset
document.getElementById('saveDatasetBtn').addEventListener('click', async () => {
    const name = document.getElementById('datasetName').value.trim();
    const deck = document.getElementById('deckSelect').value;
    const noteType = document.getElementById('noteTypeSelect').value;
    const type = document.getElementById('datasetType').value;
    const tagsSelect = document.getElementById('tagsSelect');
    const selectedTags = Array.from(tagsSelect.selectedOptions).map(opt => opt.value);

    if (!name || !deck || !noteType || !type) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    try {
        // Build query
        let query = `deck:"${deck}" note:"${noteType}"`;
        if (selectedTags.length > 0) {
            const tagQuery = selectedTags.map(tag => `tag:"${tag}"`).join(' OR ');
            query += ` (${tagQuery})`;
        }

        // Get cards
        const notesInfo = await invoke('notesInfo', { query });
        const data = parseAnkiData(notesInfo, type);
        const cardCount = data.length;

        const dataset = {
            id: Date.now(),
            name,
            type,
            deck,
            noteType,
            tags: selectedTags,
            cardCount,
            notesInfo: data,  
            createdAt: new Date().toISOString()
        };

        datasets.push(dataset);
        renderDatasets();

        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        document.getElementById('importForm').reset();

        alert(`Đã nhập thành công ${cardCount} thẻ!`);
    } catch (error) {
        alert('Lỗi khi lấy dữ liệu: ' + error.message);
    }
});

function parseAnkiData(notesInfo, dataset_type) {
    try {
        let data = [];
        notesInfo.forEach(note => {
            if (!note.fields || typeof note.fields !== 'object') {
                throw new Error('Cấu trúc trường dữ liệu không hợp lệ');
            }
            if (dataset_type === 'True/False') {
                data.push({ id: note.noteId, question: fixImgSrc(note.fields.Question.value.trim()), answer: note.fields.Answer.value.trim(), extra: fixImgSrc(note.fields.Note.value.trim())});
            } else if (dataset_type === 'Multiple Choices') {
                let choices = [];
                if (note.fields['Choice 1'].value !== "") {
                    fixImgSrc(choices.push(note.fields['Choice 1'].value.trim()));
                }
                if (note.fields['Choice 2'].value !== "") {
                    fixImgSrc(choices.push(note.fields['Choice 2'].value.trim()));
                }
                if (note.fields['Choice 3'].value !== "") {
                    fixImgSrc(choices.push(note.fields['Choice 3'].value.trim()));
                }
                if (note.fields['Choice 4'].value !== "") {
                    fixImgSrc(choices.push(note.fields['Choice 4'].value.trim()));
                }
                if (note.fields['Choice 5'].value !== "") {
                    fixImgSrc(choices.push(note.fields['Choice 5'].value.trim()));
                }
                if (choices.length !== 0) {
                    data.push({ id: note.noteId, question: fixImgSrc(note.fields.Question.value.trim()), choices: choices, answer: note.fields.Answer.value.trim(), extra: fixImgSrc(note.fields.Note.value.trim())});
                }
            } else if (dataset_type === 'Short Answer') {
                if (note.fields['Choice 1'].value === "") {
                    data.push({ id: note.noteId, question: fixImgSrc(note.fields.Question.value.trim()), answer: note.fields.Answer.value.trim(), extra: fixImgSrc(note.fields.Note.value.trim())});
                }
            }
        });
        return data;
    }
    catch (error) {
        throw new Error('Dữ liệu Anki không hợp lệ: ' + error.message);
    }
}

function fixImgSrc(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = doc.getElementsByTagName('img');
    for (let img of imgs) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('https://')) {
            const fixedSrc = ANKI_MEDIA_URL + src;
            img.setAttribute('src', fixedSrc);
        }
    }
    return doc.body.innerHTML;
}

// Render Datasets Table
function renderDatasets() {
    const tbody = document.getElementById('datasetTableBody');

    if (datasets.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">
                            <i class="fas fa-inbox"></i> Chưa có bộ dữ liệu nào
                        </td>
                    </tr>
                `;
        return;
    }

    tbody.innerHTML = datasets.map(dataset => `
                <tr>
                    <td><strong>${dataset.name}</strong></td>
                    <td><span class="badge bg-primary">${dataset.type}</span></td>
                    <td>${dataset.cardCount} thẻ</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewDetail(${dataset.id})">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                        <button class="btn btn-info btn-sm" onclick="viewCards(${dataset.id})">
                            <i class="fas fa-eye"></i> Chi tiết
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteDataset(${dataset.id})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </td>
                </tr>
            `).join('');
}

// View Dataset Detail
async function viewDetail(id) {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    const content = document.getElementById('detailContent');

    content.innerHTML = `
                <div class="mb-3">
                    <h5><i class="fas fa-info-circle"></i> Thông tin cơ bản</h5>
                    <table class="table table-bordered">
                        <tr><th>Tên:</th><td>${dataset.name}</td></tr>
                        <tr><th>Loại:</th><td><span class="badge bg-primary">${dataset.type}</span></td></tr>
                        <tr><th>Deck:</th><td>${dataset.deck}</td></tr>
                        <tr><th>Note Type:</th><td>${dataset.noteType}</td></tr>
                        <tr><th>Tags:</th><td>${dataset.tags.length > 0 ? dataset.tags.join(', ') : 'Tất cả'}</td></tr>
                        <tr><th>Số lượng thẻ:</th><td>${dataset.cardCount}</td></tr>
                        <tr><th>Ngày tạo:</th><td>${new Date(dataset.createdAt).toLocaleString('vi-VN')}</td></tr>
                    </table>
                </div>
            `;

    modal.show();
}

// View Dataset Cards
async function viewCards(id) {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    const content = document.getElementById('detailContent');
    
    if (dataset.type === 'True/False') {
        content.innerHTML = renderTFdatasetCards(dataset);
    } else if (dataset.type === 'Multiple Choices') {
        content.innerHTML = renderMCdatasetCards(dataset);
    } else if (dataset.type === 'Short Answer') {
        content.innerHTML = renderSAdatasetCards(dataset);
    } else {
        content.innerHTML = '<p>Bộ dữ liệu này chưa được hỗ trợ.</p>';
    }
    // Render MathJax sau khi thêm HTML
    if (window.MathJax) {
        MathJax.typesetPromise([content]).catch((err) => console.log('MathJax error:', err));
    }
    modal.show();
}

function renderTFdatasetCards(dataset) {
    let html = `
        <div class="mb-3">
            <h5><i class="fas fa-info-circle"></i> Thông tin cơ bản</h5>
            <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-bordered table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th style="width: calc(100% - 50px);">Question</th>
                            <th style="width: 50px;">Answer</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    dataset.notesInfo.forEach(card => {
        html += `
            <tr>
                <td class="text-truncate" style="max-width: 300px;">${card.question}</td>
                <td>${card.answer ==='1'? 'Đúng': 'Sai'}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return html;
}

function renderMCdatasetCards(dataset) {
    let html = `
        <div class="mb-3">
            <h5><i class="fas fa-info-circle"></i> Thông tin cơ bản</h5>
            <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-bordered table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th style="width: calc(100% - 50px);">Question</th>
                            <th style="width: 50px;">Answer</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    dataset.notesInfo.forEach(card => {
        html += `
            <tr>
                <td class="text-truncate" style="max-width: 300px;">${card.question}</td>
                <td>${card.answer}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return html;
}

function renderSAdatasetCards(dataset) {
    let html = `
        <div class="mb-3">
            <h5><i class="fas fa-info-circle"></i> Thông tin cơ bản</h5>
            <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-bordered table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th style="width: calc(100% - 50px);">Question</th>
                            <th style="width: 50px;">Answer</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    dataset.notesInfo.forEach(card => {
        html += `
            <tr>
                <td class="text-truncate" style="max-width: 300px;">${card.question}</td>
                <td>${card.answer}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return html;
}
// Helper function để escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete Dataset
function deleteDataset(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ dữ liệu này?')) return;

    datasets = datasets.filter(d => d.id !== id);
    renderDatasets();
}

// Initialize
renderDatasets();

// Auto-check Anki connection on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAnkiConnection();
});