const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
const ANKI_MEDIA_URL = 'https://iili.io/';
const TF_STATEMENTS_PER_QUESTION = 4;
let datasets = [];
let ankiConnected = false;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let quizTimer = null;
let timeRemaining = 0;
let startTime = 0;

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

// Check Connection
async function checkAnkiConnection() {
    const statusDiv = document.getElementById('connectionStatus');
    const importBtn = document.getElementById('importBtn');

    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra kết nối...';
    statusDiv.className = 'alert alert-info';
    importBtn.disabled = true;

    try {
        await invoke('version');
        ankiConnected = true;
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Kết nối Anki thành công!';
        statusDiv.className = 'alert alert-success';
        importBtn.disabled = false;
    } catch (error) {
        ankiConnected = false;
        statusDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            <strong>Không thể kết nối với Anki!</strong><br>
            <small>Đảm bảo Anki đang chạy và AnkiConnect đã được cài đặt</small>
            <br><br>
            <button class="btn btn-warning btn-sm mt-2" id="retryConnectionBtn">
                <i class="fas fa-redo"></i> Thử lại
            </button>
        `;
        statusDiv.className = 'alert alert-danger';
        importBtn.disabled = true;
        
        // Thêm event listener cho nút thử lại
        document.getElementById('retryConnectionBtn').addEventListener('click', checkAnkiConnection);
    }
}

// Import Modal
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
        const decks = await invoke('deckNames');
        const deckSelect = document.getElementById('deckSelect');
        deckSelect.innerHTML = '<option value="">-- Chọn Deck --</option>';
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck;
            option.textContent = deck;
            deckSelect.appendChild(option);
        });

        const noteTypes = await invoke('modelNames');
        const noteTypeSelect = document.getElementById('noteTypeSelect');
        noteTypeSelect.innerHTML = '<option value="">-- Chọn Note Type --</option>';
        noteTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            noteTypeSelect.appendChild(option);
        });

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
    } catch (error) {
        alert('Lỗi: ' + error.message);
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
        let query = `deck:"${deck}" note:"${noteType}"`;
        if (selectedTags.length > 0) {
            const tagQuery = selectedTags.map(tag => `tag:"${tag}"`).join(' OR ');
            query += ` (${tagQuery})`;
        }

        const notesInfo = await invoke('findNotes', { query: query });
        const notes = await invoke('notesInfo', { notes: notesInfo });
        const data = parseAnkiData(notes, type);

        const dataset = {
            id: Date.now(),
            name,
            type,
            deck,
            noteType,
            tags: selectedTags,
            cardCount: data.length,
            notesInfo: data,
            createdAt: new Date().toISOString()
        };

        datasets.push(dataset);
        await storageManager.save(datasets);
        renderDatasets();

        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        document.getElementById('importForm').reset();
        alert(`Đã nhập thành công ${data.length} thẻ!`);
    } catch (error) {
        alert('Lỗi khi lấy dữ liệu: ' + error.message);
    }
});

function parseAnkiData(notesInfo, datasetType) {
    let data = [];
    notesInfo.forEach(note => {
        if (!note.fields || typeof note.fields !== 'object') return;

        if (datasetType === 'True/False Statement') {
            if (note.fields.Question && note.fields.Answer) {
                data.push({
                    id: note.noteId,
                    question: fixImgSrc(note.fields.Question.value.trim()),
                    answer: note.fields.Answer.value.trim(),
                    extra: note.fields.Extra ? fixImgSrc(note.fields.Extra.value.trim()) : ''
                });
            }
        } else if (datasetType === 'Multiple Choices' || datasetType === 'True/False') {
            let choices = [];
            for (let i = 1; i <= 5; i++) {
                const choiceField = note.fields[`Choice ${i}`];
                if (choiceField && choiceField.value.trim() !== "") {
                    choices.push(fixImgSrc(choiceField.value.trim()));
                }
            }
            if (choices.length > 0) {
                data.push({
                    id: note.noteId,
                    question: fixImgSrc(note.fields.Question.value.trim()),
                    choices: choices,
                    answer: note.fields.Answer.value.trim(),
                    extra: note.fields.Extra ? fixImgSrc(note.fields.Extra.value.trim()) : ''
                });
            }
        } else if (datasetType === 'Short Answer') {
            const hasChoices = note.fields['Choice 1'] && note.fields['Choice 1'].value.trim() !== "";
            if (!hasChoices) {
                data.push({
                    id: note.noteId,
                    question: fixImgSrc(note.fields.Question.value.trim()),
                    answer: note.fields.Answer.value.trim(),
                    extra: note.fields.Extra ? fixImgSrc(note.fields.Extra.value.trim()) : ''
                });
            }
        }
    });
    return data;
}

function fixImgSrc(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = doc.getElementsByTagName('img');
    for (let img of imgs) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('https://')) {
            img.setAttribute('src', ANKI_MEDIA_URL + src);
        }
        if (img.hasAttribute('width')) {
            img.removeAttribute('width');
        }
    }
    return doc.body.innerHTML;
}

// Render Datasets
function renderDatasets() {
    const tbody = document.getElementById('datasetTableBody');
    if (datasets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">
                    <i class="fas fa-inbox"></i> Chưa có bộ dữ liệu nào</td></tr>`;
        return;
    }

    tbody.innerHTML = datasets.map(dataset => `
                <tr>
                    <td><strong>${dataset.name}</strong></td>
                    <td><span class="badge bg-primary">${dataset.type}</span></td>
                    <td>${dataset.cardCount} thẻ</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewDetail(${dataset.id})">
                            <i class="fas fa-circle-info"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="viewCards(${dataset.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteDataset(${dataset.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
}

function viewDetail(id) {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    const content = document.getElementById('detailContent');
    content.innerHTML = `
                <table class="table table-bordered">
                    <tr><th>Tên:</th><td>${dataset.name}</td></tr>
                    <tr><th>Loại:</th><td><span class="badge bg-primary">${dataset.type}</span></td></tr>
                    <tr><th>Deck:</th><td>${dataset.deck}</td></tr>
                    <tr><th>Note Type:</th><td>${dataset.noteType}</td></tr>
                    <tr><th>Tags:</th><td>${dataset.tags.length > 0 ? dataset.tags.join(', ') : 'Tất cả'}</td></tr>
                    <tr><th>Số lượng thẻ:</th><td>${dataset.cardCount}</td></tr>
                    <tr><th>Ngày tạo:</th><td>${new Date(dataset.createdAt).toLocaleString('vi-VN')}</td></tr>
                </table>
            `;
    modal.show();
}

function viewCards(id) {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    const content = document.getElementById('detailContent');

    let html = `<div class="table-responsive" style="max-height: 500px;">
                <table class="table table-bordered table-hover">
                    <thead class="table-light sticky-top">
                        <tr><th>Question</th><th>Answer</th></tr>
                    </thead><tbody>`;

    dataset.notesInfo.forEach(card => {
        const answer = dataset.type === 'True/False Statement'
            ? (card.answer === '1' ? 'Đúng' : 'Sai')
            : card.answer;
        html += `<tr>
                    <td class="text-truncate" style="max-width: 400px;">${card.question}</td>
                    <td>${answer}</td>
                </tr>`;
    });

    html += `</tbody></table></div>`;
    content.innerHTML = html;

    if (window.MathJax) {
        MathJax.typesetPromise([content]).catch(err => console.log('MathJax error:', err));
    }
    modal.show();
}

async function deleteDataset(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ dữ liệu này?')) return;
    datasets = datasets.filter(d => d.id !== id);
    await storageManager.save(datasets);
    renderDatasets();
}

// Quiz Creation
document.getElementById('createBtn').addEventListener('click', () => {
    if (datasets.length === 0) {
        alert('Vui lòng nhập dữ liệu trước!');
        return;
    }

    document.getElementById('mainView').style.display = 'none';
    document.getElementById('quizCreationView').style.display = 'block';

    const container = document.getElementById('datasetSelection');
    container.innerHTML = datasets.map(dataset => `
                <div class="form-check">
                    <input class="form-check-input dataset-select" type="checkbox" value="${dataset.id}" id="ds${dataset.id}">
                    <label class="form-check-label" for="ds${dataset.id}">
                        ${dataset.name} <span class="badge bg-secondary">${dataset.type}</span> (${dataset.cardCount} thẻ)
                    </label>
                </div>
            `).join('');
});

document.getElementById('backToMainBtn').addEventListener('click', () => {
    document.getElementById('quizCreationView').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
});

// Calculate total points
document.querySelectorAll('.question-points').forEach(input => {
    input.addEventListener('input', updateTotalPoints);
});

function updateTotalPoints() {
    let total = 0;
    document.querySelectorAll('.question-points').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('totalPoints').textContent = total.toFixed(1);

    const validation = document.getElementById('pointsValidation');
    if (Math.abs(total - 10) < 0.01) {
        validation.className = 'alert alert-success';
    } else {
        validation.className = 'alert alert-warning';
    }
}

// Submit Quiz Creation
document.getElementById('quizCreationForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const duration = parseInt(document.getElementById('quizDuration').value);
    const selectedDatasets = Array.from(document.querySelectorAll('.dataset-select:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedDatasets.length === 0) {
        alert('Vui lòng chọn ít nhất một bộ dữ liệu!');
        return;
    }

    const totalPoints = parseFloat(document.getElementById('totalPoints').textContent);
    if (Math.abs(totalPoints - 10) > 0.01) {
        alert('Tổng điểm phải bằng 10!');
        return;
    }

    const questionTypes = {};
    document.querySelectorAll('.question-count').forEach(input => {
        const type = input.dataset.type;
        const count = parseInt(input.value) || 0;
        const points = parseFloat(document.querySelector(`.question-points[data-type="${type}"]`).value) || 0;
        if (count > 0) {
            questionTypes[type] = { count, points: points / count };
        }
    });

    if (Object.keys(questionTypes).length === 0) {
        alert('Vui lòng chọn ít nhất một loại câu hỏi!');
        return;
    }

    createQuiz(duration, selectedDatasets, questionTypes);
});

function shuffleArray(array) {
    // Tạo bản sao của array để không thay đổi array gốc
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Shuffle choices và cập nhật answer index
function shuffleChoices(questions) {
    questions.forEach(q => {
        if (q.type === 'Multiple Choices' && q.choices && q.choices.length > 0) {
            // Lưu đáp án đúng hiện tại
            const correctAnswer = q.answer;
            
            // Tạo mảng index và shuffle
            const indices = q.choices.map((_, i) => i);
            shuffleArray(indices);
            
            // Áp dụng shuffle cho choices
            const shuffledChoices = indices.map(i => q.choices[i]);
            q.choices = shuffledChoices;
            
            // Tìm vị trí mới của đáp án đúng
            q.answer = indices.indexOf(correctAnswer);
        }
        
        if (q.type === 'True/False' && q.statements && q.statements.length > 0) {
            // Shuffle các statements
            shuffleArray(q.statements);
        }
    });
    return questions;
}

function createQuiz(duration, selectedDatasetIds, questionTypes) {
    const selectedDatasets = datasets.filter(d => selectedDatasetIds.includes(d.id));
    let allQuestions = [];

    // Generate questions for each type
    for (const [type, config] of Object.entries(questionTypes)) {
        const relevantDatasets = selectedDatasets.filter(d => d.type === type);
        if (relevantDatasets.length === 0) continue;

        // Gather all cards of this type
        const allCards = relevantDatasets.flatMap(d => d.notesInfo.map(card => ({ ...card, type })));
        const shuffled = shuffleArray(allCards);
        if (type === 'True/False Statement') {
            const numQuestions = config.count;
            for (let i = 0; i < numQuestions; i++) {
                const statements = [];
                for (let j = TF_STATEMENTS_PER_QUESTION*i; j < TF_STATEMENTS_PER_QUESTION*i+4 && j < shuffled.length; j++) {
                    statements.push(shuffled[j]);
                }
                if (statements.length === TF_STATEMENTS_PER_QUESTION) {
                    allQuestions.push({
                        type: 'True/False',
                        statements: statements,
                        points: config.points
                    });
                }
            }
        } else if (type === 'Multiple Choices') {
            // select random cards for multiple choice
            const selectedCards = shuffled.slice(0, config.count);
            selectedCards.forEach(card => {
                allQuestions.push({
                    type: 'Multiple Choices',
                    question: card.question,
                    choices: card.choices,
                    answer: card.answer,
                    extra: card.extra,
                    points: config.points,
                    id: card.id
                });
            });
        } else if (type === 'True/False') {
            const selectedCards = shuffled.slice(0, config.count);
            selectedCards.forEach(card => {
                const correctAnswers = parseCorrectAnswers(card.answer, card.choices.length);
                const statements = card.choices.map((choice, idx) => ({
                    question: choice,
                    answer: correctAnswers.includes(idx) ? '1' : '0'
                }));

                allQuestions.push({
                    type: 'True/False',
                    question: card.question,
                    statements: statements,
                    extra: card.extra,
                    points: config.points,
                    id: card.id
                });
            });
        } else if (type === 'Short Answer') {
            const selectedCards = shuffled.slice(0, config.count);
            selectedCards.forEach(card => {
                allQuestions.push({
                    type: 'Short Answer',
                    question: card.question,
                    answer: card.answer,
                    extra: card.extra,
                    points: config.points,
                    id: card.id
                });
            });
        }
    }
    // console.log(allQuestions);

    currentQuiz = {
        questions: allQuestions,
        duration: duration * 60,
        startTime: Date.now()
    };

    startQuiz();
}

function getAnswerIndex(answer, choicesCount) {
    const normalized = answer.trim().toLowerCase();
    const letters = ['a', 'b', 'c', 'd', 'e'];
    const idx = letters.indexOf(normalized);
    if (idx !== -1 && idx < choicesCount) return idx;

    const num = parseInt(normalized);
    if (!isNaN(num) && num >= 1 && num <= choicesCount) return num - 1;

    return 0;
}

function parseCorrectAnswers(answer, choicesCount) {
    if (!answer || answer.trim() === '') return [];

    const normalized = answer.trim().toLowerCase();
    const letters = ['a', 'b', 'c', 'd', 'e'];
    const results = [];

    for (let char of normalized) {
        const idx = letters.indexOf(char);
        if (idx !== -1 && idx < choicesCount) {
            results.push(idx);
        }
    }

    if (results.length > 0) return results;

    for (let char of normalized) {
        const num = parseInt(char);
        if (!isNaN(num) && num >= 1 && num <= choicesCount) {
            results.push(num - 1);
        }
    }

    return results;
}

function startQuiz() {
    document.getElementById('quizCreationView').style.display = 'none';
    document.getElementById('quizTakingView').style.display = 'block';

    userAnswers = {};
    currentQuestionIndex = 0;
    timeRemaining = currentQuiz.duration;
    startTime = Date.now();

    renderQuiz();
    startTimer();
}

function renderQuiz() {
    const nav = document.getElementById('questionNav');
    const container = document.getElementById('questionsContainer');
    // Shuffle questions
    currentQuiz.questions = shuffleChoices(currentQuiz.questions);
    nav.innerHTML = currentQuiz.questions.map((q, i) =>
        `<button class="question-nav-btn" data-index="${i}">${i + 1}</button>`
    ).join('');

    container.innerHTML = currentQuiz.questions.map((q, i) => {
        if (q.type === 'True/False') {
            return renderTFQuestion(q, i);
        } else if (q.type === 'Multiple Choices') {
            return renderMultipleChoiceQuestion(q, i);
        } else if (q.type === 'Short Answer') {
            return renderShortAnswerQuestion(q, i);
        }
    }).join('');

    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch(err => console.log('MathJax error:', err));
    }

    document.querySelectorAll('.question-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentQuestionIndex = parseInt(btn.dataset.index);
            updateQuestionDisplay();
        });
    });

    updateQuestionDisplay();
}

function renderTFQuestion(q, index) {
    return `
                <div class="question-card" data-index="${index}">
                    <h4>Câu ${index + 1} <span class="badge bg-info">${q.points.toFixed(1)} điểm</span></h4>
                    <div class="question-content mb-3">${q.question ? q.question : 'Các mệnh đề sau đây là đúng hay sai?'}</div>
                    ${q.statements.map((stmt, si) => `
                        <div class="tf-statement">
                            <div class="question-content">${stmt.question}</div>
                            <div class="tf-statement-buttons">
                                <button class="tf-btn true" data-q="${index}" data-s="${si}" data-val="1">
                                    <i class="fas fa-check"></i> Đúng
                                </button>
                                <button class="tf-btn false" data-q="${index}" data-s="${si}" data-val="0">
                                    <i class="fas fa-times"></i> Sai
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
}

function renderMultipleChoiceQuestion(q, index) {
    return `
                <div class="question-card" data-index="${index}">
                    <h4>Câu ${index + 1} <span class="badge bg-info">${q.points.toFixed(1)} điểm</span></h4>
                    <div class="question-content mb-4">${q.question}</div>
                    ${q.choices.map((choice, ci) => `
                        <button class="choice-btn" data-q="${index}" data-choice="${ci}">
                            ${String.fromCharCode(65 + ci)}. ${choice}
                        </button>
                    `).join('')}
                </div>
            `;
}

function renderShortAnswerQuestion(q, index) {
    return `
                <div class="question-card" data-index="${index}">
                    <h4>Câu ${index + 1} <span class="badge bg-info">${q.points.toFixed(1)} điểm</span></h4>
                    <div class="question-content mb-4">${q.question}</div>
                    <textarea class="form-control" rows="4" data-q="${index}" 
                        placeholder="Nhập câu trả lời của bạn...">${userAnswers[index] || ''}</textarea>
                </div>
            `;
}

function updateQuestionDisplay() {
    document.querySelectorAll('.question-card').forEach((card, i) => {
        card.classList.toggle('active', i === currentQuestionIndex);
    });

    document.querySelectorAll('.question-nav-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === currentQuestionIndex);
        btn.classList.toggle('answered', userAnswers[i] !== undefined);
    });

    // Restore answers
    const currentQ = currentQuiz.questions[currentQuestionIndex];
    if (currentQ.type === 'True/False') {
        document.querySelectorAll('.tf-btn').forEach(btn => {
            const qIdx = parseInt(btn.dataset.q);
            const sIdx = parseInt(btn.dataset.s);
            if (qIdx === currentQuestionIndex && userAnswers[qIdx]) {
                const isSelected = userAnswers[qIdx][sIdx] === btn.dataset.val;
                btn.classList.toggle('selected', isSelected);
            }
        });
    } else if (currentQ.type === 'Multiple Choices') {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            const qIdx = parseInt(btn.dataset.q);
            if (qIdx === currentQuestionIndex) {
                const isSelected = userAnswers[qIdx] === parseInt(btn.dataset.choice);
                btn.classList.toggle('selected', isSelected);
            }
        });
    }

    // Add event listeners
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', handleTFAnswer);
    });

    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', handleChoiceAnswer);
    });

    document.querySelectorAll('textarea[data-q]').forEach(textarea => {
        textarea.addEventListener('input', handleTextAnswer);
    });
}

function handleTFAnswer(e) {
    const btn = e.currentTarget;
    const qIdx = parseInt(btn.dataset.q);
    const sIdx = parseInt(btn.dataset.s);
    const val = btn.dataset.val;

    if (!userAnswers[qIdx]) {
        userAnswers[qIdx] = {};
    }
    userAnswers[qIdx][sIdx] = val;

    const siblings = btn.parentElement.querySelectorAll('.tf-btn');
    siblings.forEach(s => s.classList.remove('selected'));
    btn.classList.add('selected');

    updateQuestionDisplay();
}

function handleChoiceAnswer(e) {
    const btn = e.currentTarget;
    const qIdx = parseInt(btn.dataset.q);
    const choice = parseInt(btn.dataset.choice);

    userAnswers[qIdx] = choice;

    document.querySelectorAll(`.choice-btn[data-q="${qIdx}"]`).forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');

    updateQuestionDisplay();
}

function handleTextAnswer(e) {
    const textarea = e.currentTarget;
    const qIdx = parseInt(textarea.dataset.q);
    userAnswers[qIdx] = textarea.value.trim();
    updateQuestionDisplay();
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionDisplay();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        updateQuestionDisplay();
    }
});

document.getElementById('submitBtn').addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn nộp bài?')) {
        submitQuiz();
    }
});

function startTimer() {
    updateTimerDisplay();
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            alert('Hết giờ! Bài thi sẽ được tự động nộp.');
            submitQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;

    if (timeRemaining <= 60) {
        document.getElementById('timer').classList.add('warning');
    }
}

function submitQuiz() {
    clearInterval(quizTimer);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    let correctCount = 0;
    let totalScore = 0;

    const results = currentQuiz.questions.map((q, i) => {
        let isCorrect = false;
        let userAnswer = userAnswers[i];
        let points = 0;

        if (q.type === 'True/False') {
            let numCorrect = q.statements.length;
            for (let si = 0; si < q.statements.length; si++) {
                if (!userAnswer || userAnswer[si] !== q.statements[si].answer) {
                    numCorrect--;
                }
            }
            if (numCorrect === q.statements.length) {
                isCorrect = true;
                points = q.points;
            } else {
                isCorrect = false;
                if (numCorrect === q.statements.length - 1 && numCorrect > 0) {
                    points = q.points * 0.5;
                } else if (numCorrect === q.statements.length - 2 && numCorrect > 0) {
                    points = q.points * 0.25;
                } else if (numCorrect === q.statements.length - 3 && numCorrect > 0) {
                    points = q.points * 0.1;
                } else {
                    points = 0;
                }
            }
            
        } else if (q.type === 'Multiple Choices') {
            isCorrect = userAnswer === q.answer;
            if (isCorrect) {
                points = q.points;
            }
        } else if (q.type === 'Short Answer') {
            isCorrect = userAnswer &&
                userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
            if (isCorrect) {
                points = q.points;
            }
        }

        if (isCorrect) {
            correctCount++;
        }
        totalScore += points;

        return { question: q, userAnswer, isCorrect, points };
    });

    showResults(results, totalScore, correctCount, timeSpent);
}

function showResults(results, totalScore, correctCount, timeSpent) {
    document.getElementById('quizTakingView').style.display = 'none';
    document.getElementById('quizResultView').style.display = 'block';

    document.getElementById('finalScore').textContent = totalScore.toFixed(1) + '/10';
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('incorrectCount').textContent = results.length - correctCount;

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('timeSpent').textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = results.map((r, i) => {
        const q = r.question;
        const resultClass = r.isCorrect ? 'correct' : 'incorrect';

        let answerDisplay = '';
        if (q.type === 'True/False') {
            answerDisplay = q.statements.map((stmt, si) => {
                const userAns = r.userAnswer ? r.userAnswer[si] : null;
                const correctAns = stmt.answer;
                const isStmtCorrect = userAns === correctAns;
                if (q.question) {
                    return `
                            <div class="mb-2">
                                <div>${stmt.question}</div>
                                <div><strong>Bạn chọn:</strong> 
                                    <span class="${isStmtCorrect ? 'correct-answer' : 'incorrect-answer'}">
                                        ${userAns === '1' ? 'Đúng' : userAns === '0' ? 'Sai' : 'Chưa trả lời'}
                                    </span>
                                </div>
                                <div><strong>Đáp án:</strong> 
                                    <span class="correct-answer">${correctAns === '1' ? 'Đúng' : 'Sai'}</span>
                                </div>
                            </div>
                        `;
                } else {
                    return `
                            <div class="mb-2">
                                <div onclick="openAnkiNote(this)" id="${stmt.id}">${stmt.question}</div>
                                <div><strong>Bạn chọn:</strong> 
                                    <span class="${isStmtCorrect ? 'correct-answer' : 'incorrect-answer'}">
                                        ${userAns === '1' ? 'Đúng' : userAns === '0' ? 'Sai' : 'Chưa trả lời'}
                                    </span>
                                </div>
                                <div><strong>Đáp án:</strong> 
                                    <span class="correct-answer">${correctAns === '1' ? 'Đúng' : 'Sai'}</span>
                                </div>
                            </div>
                        `;
                }
                
            }).join('');
        } else if (q.type === 'Multiple Choices') {
            answerDisplay = `
                        <div><strong>Bạn chọn:</strong> 
                            <span class="${r.isCorrect ? 'correct-answer' : 'incorrect-answer'}">
                                ${r.userAnswer !== undefined ? String.fromCharCode(65 + r.userAnswer) : 'Chưa trả lời'}
                            </span>
                        </div>
                        <div><strong>Đáp án:</strong> 
                            <span class="correct-answer">${String.fromCharCode(65 + q.answer)}</span>
                        </div>
                    `;
        } else if (q.type === 'Short Answer') {
            answerDisplay = `
                        <div><strong>Câu trả lời của bạn:</strong> 
                            <span class="${r.isCorrect ? 'correct-answer' : 'incorrect-answer'}">
                                ${r.userAnswer || 'Chưa trả lời'}
                            </span>
                        </div>
                        <div><strong>Đáp án:</strong> 
                            <span class="correct-answer">${q.answer}</span>
                        </div>
                    `;
        }

        return `
                    <div class="result-card ${resultClass}">
                        <h5>Câu ${i + 1} 
                            <span class="badge ${r.isCorrect ? 'bg-success' : 'bg-danger'}">
                                ${r.isCorrect ? 'Đúng' : 'Sai'}
                            </span>
                            <span class="badge bg-info">${r.points.toFixed(2)} điểm</span>
                        </h5>
                        ${q.question ? `<div class="mb-2" onclick="openAnkiNote(this)" id="${q.id ? q.id : 0}">${q.question}</div>` : ''}
                        ${answerDisplay}
                        ${q.extra ? `<div class="mt-2"><strong>Giải thích:</strong> ${q.extra}</div>` : ''}
                    </div>
                `;
    }).join('');

    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch(err => console.log('MathJax error:', err));
    }
}

document.getElementById('backToMainFromResultBtn').addEventListener('click', () => {
    document.getElementById('quizResultView').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
    currentQuiz = null;
    userAnswers = {};
});

function openAnkiNote(element) {
    const noteId = element.id;
    // Tạo chuỗi tìm kiếm theo NID
    const searchQuery = `nid:${noteId}`;
    // Payload (dữ liệu gửi đi) cho AnkiConnect
    const payload = {
        "action": "guiBrowse",
        "version": 6,
        "params": {
            "query": searchQuery
        }
    };
    // Gửi yêu cầu bằng Fetch API
    fetch(ANKI_CONNECT_URL, {
        method: 'POST',  // ✅ Đổi từ GET sang POST
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Lỗi AnkiConnect:', data.error);
            alert(`Không thể hiển thị thẻ. Lỗi: ${data.error}`);  // ✅ Sửa syntax alert
        } else {
            console.log(`Đã gửi yêu cầu mở trình duyệt với tìm kiếm: ${searchQuery}`);  // ✅ Sửa syntax console.log
        }
    })
    .catch(error => {
        console.error('Lỗi kết nối AnkiConnect:', error);
        alert('Không thể kết nối tới Anki. Hãy đảm bảo Anki đang chạy và AnkiConnect đã được cài đặt.');
    });
}

// Initialize
renderDatasets();
// Initialize với IndexedDB
async function initApp() {
    await storageManager.init();
    datasets = await storageManager.load();
    renderDatasets();
    checkAnkiConnection();
}

window.addEventListener('DOMContentLoaded', initApp);

// Export Quiz to Static HTML
document.getElementById('exportQuizBtn').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('exportQuizModal'));
    document.getElementById('exportQuizName').value = `Đề thi ${new Date().toLocaleDateString('vi-VN')}`;
    modal.show();
});

document.getElementById('confirmExportBtn').addEventListener('click', () => {
    const quizName = document.getElementById('exportQuizName').value.trim();
    if (!quizName) {
        alert('Vui lòng nhập tên đề thi!');
        return;
    }
    
    exportQuizToHTML(quizName);
    bootstrap.Modal.getInstance(document.getElementById('exportQuizModal')).hide();
});

// Backup/Restore handlers
document.getElementById('exportDataBtn').addEventListener('click', () => {
    storageManager.exportToFile();
});

document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        datasets = await storageManager.importFromFile(file);
        renderDatasets();
        e.target.value = '';
    }
});

document.getElementById('statsBtn').addEventListener('click', async () => {
    const stats = await storageManager.getStats();
    alert(`📊 Thống kê dữ liệu:
    
🗂️ Số datasets: ${stats.count}
📇 Tổng số thẻ: ${stats.totalCards}
💾 Kích thước: ${stats.sizeFormatted}
    `);
});

document.getElementById('clearAllBtn').addEventListener('click', async () => {
    if (await storageManager.clearAll()) {
        datasets = [];
        renderDatasets();
    }
});

function exportQuizToHTML(quizName) {
    if (!currentQuiz) {
        alert('Không có dữ liệu đề thi!');
        return;
    }

    const htmlContent = generateStaticQuizHTML(quizName);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Tạo tên file từ tên đề thi
    const fileName = quizName.toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    
    a.download = `${fileName}_${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Đã xuất đề thi thành công!');
}

function generateStaticQuizHTML(quizName) {
    const questions = currentQuiz.questions;
    const duration = currentQuiz.duration;
    
    // Serialize questions data to JSON
    const questionsData = JSON.stringify(questions);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quizName}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    
    <!-- MathJax Configuration -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['\\\\(', '\\\\)']],
                displayMath: [['\\\\[', '\\\\]']],
                packages: {'[+]': ['mhchem']}
            },
            loader: {
                load: ['[tex]/mhchem']
            },
            startup: {
                pageReady: () => {
                    return MathJax.startup.defaultPageReady();
                }
            }
        };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    
    <style>
        ${getStaticQuizCSS()}
    </style>
</head>
<body>
    <div class="timer" id="timer">${Math.floor(duration/60).toString().padStart(2,'0')}:00</div>
    <div class="container">
        <div class="quiz-container">
            <h2 class="text-center mb-1">${quizName}</h2>
            <p class="text-center text-muted mb-4">
                <i class="fas fa-clock"></i> ${Math.floor(duration/60)} phút | 
                <i class="fas fa-list"></i> <span id="questionCount">0</span> câu hỏi
            </p>
            <div class="question-nav" id="questionNav"></div>
            <div id="questionsContainer"></div>
            <div class="d-flex justify-content-between mt-4">
                <button class="btn btn-secondary" id="prevBtn">
                    <i class="fas fa-arrow-left"></i> Câu trước
                </button>
                <button class="btn btn-danger btn-lg" id="submitBtn">
                    <i class="fas fa-check-circle"></i> Nộp bài
                </button>
                <button class="btn btn-secondary" id="nextBtn">
                    Câu sau <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    </div>
    
    <div id="resultModal" class="modal" style="display:none;">
        <div class="modal-content-result">
            <h2 class="text-center mb-1"><i class="fas fa-trophy"></i> Kết Quả</h2>
            <h4 class="text-center text-muted mb-4">${quizName}</h4>
            <div class="result-stats" id="resultStats"></div>
            <div id="resultDetails"></div>
            <button class="btn btn-primary mt-3" onclick="location.reload()">
                <i class="fas fa-redo"></i> Làm lại
            </button>
            <button class="btn btn-secondary mt-3 ms-2" onclick="reviewQuiz()">
                <i class="fas fa-eye"></i> Xem lại đề
            </button>
        </div>
    </div>

    <script>
        const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
        const QUIZ_DURATION = ${duration};
        const QUIZ_DATA = ${questionsData};
        
        function openAnkiNote(noteId) {
            if (!noteId || noteId === '0') {
                console.log('Không có note ID');
                return;
            }
            
            const searchQuery = \`nid:\${noteId}\`;
            const payload = {
                "action": "guiBrowse",
                "version": 6,
                "params": {
                    "query": searchQuery
                }
            };
            
            fetch(ANKI_CONNECT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Lỗi AnkiConnect:', data.error);
                } else {
                    console.log(\`Đã mở trình duyệt Anki với tìm kiếm: \${searchQuery}\`);
                }
            })
            .catch(error => {
                console.error('Lỗi kết nối AnkiConnect:', error);
            });
        }
        
        function reviewQuiz() {
            document.getElementById('resultModal').style.display = 'none';
            window.scrollTo(0, 0);
        }
        
        // Hàm typesetMath để render lại MathJax
        function typesetMath(element) {
            if (window.MathJax && window.MathJax.typesetPromise) {
                return MathJax.typesetPromise([element]).catch((err) => {
                    console.error('MathJax typeset error:', err);
                });
            } else if (window.MathJax && window.MathJax.Hub) {
                // Fallback cho MathJax 2.x
                return new Promise((resolve) => {
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, element]);
                    MathJax.Hub.Queue(resolve);
                });
            }
            return Promise.resolve();
        }
        
        ${getStaticQuizJS()}
    </script>
</body>
</html>`;
}

function getStaticQuizCSS() {
    return `
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 30px 0;
        }
        .container { max-width: 1200px; }
        .quiz-container {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .timer {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px 25px;
            border-radius: 50px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
            z-index: 1000;
        }
        .timer.warning {
            color: #dc3545;
            animation: pulse 1s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .question-nav {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .question-nav-btn {
            width: 45px;
            height: 45px;
            border: 2px solid #667eea;
            background: white;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .question-nav-btn.answered { background: #667eea; color: white; }
        .question-nav-btn.active { background: #764ba2; color: white; transform: scale(1.1); }
        .question-card {
            display: none;
            background: white;
            padding: 30px;
            border-radius: 15px;
            border: 2px solid #e0e0e0;
        }
        .question-card.active { display: block; }
        .anki-clickable {
            cursor: default;
            transition: all 0.2s;
        }
        .anki-clickable.active {
            cursor: pointer;
        }
        .anki-clickable.active:hover {
            background: #f0f4ff;
            border-radius: 5px;
            padding: 5px;
        }
        .choice-btn {
            width: 100%;
            text-align: left;
            padding: 15px 20px;
            margin-bottom: 10px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 10px;
            transition: all 0.3s;
            cursor: pointer;
        }
        .choice-btn:hover:not(:disabled) { border-color: #667eea; background: #f0f4ff; }
        .choice-btn.selected { border-color: #667eea; background: #667eea; color: white; }
        
        /* Đáp án đúng - Nền xanh lá đậm */
        .choice-btn.correct { 
            border: 3px solid #28a745 !important;
            background: #d4edda !important;
            color: #155724 !important;
            position: relative;
            font-weight: 600;
        }
        .choice-btn.correct::after {
            content: '✓ Đáp án đúng';
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: bold;
            font-size: 0.9rem;
            color: #28a745;
            background: white;
            padding: 2px 8px;
            border-radius: 4px;
        }
        
        /* User chọn sai - Nền đỏ */
        .choice-btn.incorrect { 
            border: 3px solid #dc3545 !important;
            background: #dc3545 !important;
            color: white !important;
            position: relative;
            font-weight: 600;
        }
        .choice-btn.incorrect::after {
            content: '✗ Đã chọn sai';
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .tf-statement {
            padding: 15px;
            margin-bottom: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            background: white;
        }
        .tf-statement-buttons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .tf-btn {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: bold;
            position: relative;
        }
        .tf-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .tf-btn.selected { opacity: 0.8; }
        .tf-btn.true.selected { background: #28a745; color: white; border-color: #28a745; }
        .tf-btn.false.selected { background: #dc3545; color: white; border-color: #dc3545; }
        
        /* Nút đúng - Nền xanh lá nhạt với viền đậm */
        .tf-btn.correct { 
            background: #d4edda !important;
            color: #155724 !important;
            border: 3px solid #28a745 !important;
            font-weight: 600;
        }
        .tf-btn.correct::after {
            content: '✓';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.3rem;
            font-weight: bold;
            color: #28a745;
        }
        
        /* Nút sai user chọn - Nền đỏ đậm */
        .tf-btn.incorrect { 
            background: #dc3545 !important;
            color: white !important;
            border: 3px solid #dc3545 !important;
            font-weight: 600;
        }
        .tf-btn.incorrect::after {
            content: '✗';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.3rem;
            font-weight: bold;
        }
        
        /* Không chọn - Viền vàng đứt nét */
        .tf-btn.not-answered {
            border: 3px dashed #ffc107 !important;
            background: #fff3cd !important;
            color: #856404 !important;
            opacity: 0.7;
        }
        
        /* Khi có cả correct và not-answered, ưu tiên hiển thị correct */
        .tf-btn.correct.not-answered {
            background: #d4edda !important;
            color: #155724 !important;
            border: 3px solid #28a745 !important;
            opacity: 1;
        }
        
        .question-content img {
            max-width: 100%;
            height: auto;
            max-height: 400px;
            display: block;
            margin: 15px auto;
            border-radius: 10px;
        }
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 2000;
            overflow-y: auto;
            padding: 30px;
        }
        .modal-content-result {
            background: white;
            max-width: 900px;
            margin: 0 auto;
            padding: 30px;
            border-radius: 15px;
        }
        .result-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card h3 { font-size: 2rem; margin: 0; }
        .result-item {
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 10px;
            border-left: 5px solid #e0e0e0;
        }
        .result-item.correct { border-left-color: #28a745; background: #d4edda; }
        .result-item.incorrect { border-left-color: #dc3545; background: #f8d7da; }
        .extra-content {
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
    `;
}

function getStaticQuizJS() {
    return `
        let currentIndex = 0;
        let userAnswers = {};
        let timeRemaining = QUIZ_DURATION;
        let timerInterval = null;
        let quizSubmitted = false;
        let currentQuestions = [];

        function shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

        function shuffleChoices(questions) {
            return questions.map(q => {
                const newQ = JSON.parse(JSON.stringify(q)); // Deep clone
                
                if (newQ.type === 'Multiple Choices' && newQ.choices && newQ.choices.length > 0) {
                    const correctAnswer = newQ.answer;
                    const indices = newQ.choices.map((_, i) => i);
                    const shuffledIndices = shuffleArray(indices);
                    
                    newQ.choices = shuffledIndices.map(i => newQ.choices[i]);
                    newQ.answer = shuffledIndices.indexOf(correctAnswer);
                }
                
                if (newQ.type === 'True/False' && newQ.statements && newQ.statements.length > 0) {
                    newQ.statements = shuffleArray(newQ.statements);
                }
                
                return newQ;
            });
        }

        function renderQuestions() {
            const nav = currentQuestions.map((q, i) => 
                \`<button class="question-nav-btn" data-index="\${i}">\${i + 1}</button>\`
            ).join('');
            
            document.getElementById('questionNav').innerHTML = nav;
            document.getElementById('questionCount').textContent = currentQuestions.length;

            const questionsHTML = currentQuestions.map((q, i) => {
                if (q.type === 'True/False') {
                    return \`
                        <div class="question-card" data-index="\${i}">
                            <h4>Câu \${i + 1} <span class="badge bg-info">\${q.points.toFixed(1)} điểm</span></h4>
                            <div class="question-content mb-3 anki-clickable" data-nid="\${q.id || 0}">\${q.question || 'Các mệnh đề sau đây là đúng hay sai?'}</div>
                            \${q.statements.map((stmt, si) => \`
                                <div class="tf-statement">
                                    <div class="question-content anki-clickable" data-nid="\${stmt.id || 0}">\${stmt.question}</div>
                                    <div class="tf-statement-buttons">
                                        <button class="tf-btn true" data-q="\${i}" data-s="\${si}" data-val="1" 
                                            data-answer="\${stmt.answer}">
                                            <i class="fas fa-check"></i> Đúng
                                        </button>
                                        <button class="tf-btn false" data-q="\${i}" data-s="\${si}" data-val="0"
                                            data-answer="\${stmt.answer}">
                                            <i class="fas fa-times"></i> Sai
                                        </button>
                                    </div>
                                </div>
                            \`).join('')}
                            \${q.extra ? \`<div class="extra-content mt-3" style="display:none;"><strong>Giải thích:</strong> \${q.extra}</div>\` : ''}
                        </div>
                    \`;
                } else if (q.type === 'Multiple Choices') {
                    return \`
                        <div class="question-card" data-index="\${i}">
                            <h4>Câu \${i + 1} <span class="badge bg-info">\${q.points.toFixed(1)} điểm</span></h4>
                            <div class="question-content mb-4 anki-clickable" data-nid="\${q.id || 0}">\${q.question}</div>
                            \${q.choices.map((choice, ci) => \`
                                <button class="choice-btn" data-q="\${i}" data-choice="\${ci}"
                                    data-answer="\${q.answer}">
                                    \${String.fromCharCode(65 + ci)}. \${choice}
                                </button>
                            \`).join('')}
                            \${q.extra ? \`<div class="extra-content mt-3" style="display:none;"><strong>Giải thích:</strong> \${q.extra}</div>\` : ''}
                        </div>
                    \`;
                } else if (q.type === 'Short Answer') {
                    return \`
                        <div class="question-card" data-index="\${i}">
                            <h4>Câu \${i + 1} <span class="badge bg-info">\${q.points.toFixed(1)} điểm</span></h4>
                            <div class="question-content mb-4 anki-clickable" data-nid="\${q.id || 0}">\${q.question}</div>
                            <textarea class="form-control" rows="4" data-q="\${i}" 
                                data-answer="\${q.answer}"
                                placeholder="Nhập câu trả lời của bạn..."></textarea>
                            \${q.extra ? \`<div class="extra-content mt-3" style="display:none;"><strong>Giải thích:</strong> \${q.extra}</div>\` : ''}
                        </div>
                    \`;
                }
            }).join('');

            document.getElementById('questionsContainer').innerHTML = questionsHTML;

            // Render MathJax sau khi thêm HTML
            typesetMath(document.getElementById('questionsContainer')).then(() => {
                console.log('Questions rendered with MathJax');
            });

            setupEventListeners();
        }

        function setupEventListeners() {
            // Setup Anki click handlers (disabled initially)
            document.querySelectorAll('.anki-clickable').forEach(el => {
                el.addEventListener('click', function() {
                    if (quizSubmitted) {
                        const noteId = this.dataset.nid;
                        openAnkiNote(noteId);
                    }
                });
            });
            
            document.querySelectorAll('.question-nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentIndex = parseInt(btn.dataset.index);
                    updateDisplay();
                });
            });
            
            document.querySelectorAll('.tf-btn').forEach(btn => {
                btn.addEventListener('click', handleTFAnswer);
            });
            
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.addEventListener('click', handleChoiceAnswer);
            });
            
            document.querySelectorAll('textarea[data-q]').forEach(textarea => {
                textarea.addEventListener('input', handleTextAnswer);
            });
        }

        function init() {
            // Đợi MathJax load xong
            if (window.MathJax) {
                if (MathJax.startup && MathJax.startup.promise) {
                    MathJax.startup.promise.then(() => {
                        console.log('MathJax loaded successfully');
                        startQuiz();
                    }).catch((err) => {
                        console.error('MathJax startup error:', err);
                        startQuiz();
                    });
                } else {
                    // Fallback: đợi 1 giây
                    setTimeout(startQuiz, 1000);
                }
            } else {
                // Nếu MathJax chưa load, đợi và thử lại
                let retries = 0;
                const checkMathJax = setInterval(() => {
                    retries++;
                    if (window.MathJax || retries > 10) {
                        clearInterval(checkMathJax);
                        setTimeout(startQuiz, 500);
                    }
                }, 500);
            }
        }
        
        function startQuiz() {
            // Shuffle choices for new quiz
            currentQuestions = shuffleChoices(QUIZ_DATA);
            
            // Render questions
            renderQuestions();
            
            // Setup navigation
            document.getElementById('prevBtn').addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateDisplay();
                }
            });
            
            document.getElementById('nextBtn').addEventListener('click', () => {
                if (currentIndex < currentQuestions.length - 1) {
                    currentIndex++;
                    updateDisplay();
                }
            });
            
            document.getElementById('submitBtn').addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn nộp bài?')) {
                    submitQuiz();
                }
            });
            
            updateDisplay();
            startTimer();
        }
        
        function updateDisplay() {
            document.querySelectorAll('.question-card').forEach((card, i) => {
                card.classList.toggle('active', i === currentIndex);
            });
            
            document.querySelectorAll('.question-nav-btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === currentIndex);
                btn.classList.toggle('answered', userAnswers[i] !== undefined);
            });
            
            restoreAnswers();
        }
        
        function restoreAnswers() {
            const answer = userAnswers[currentIndex];
            if (!answer) return;
            
            if (answer.type === 'tf') {
                Object.entries(answer.values).forEach(([sIdx, val]) => {
                    const btn = document.querySelector(\`.tf-btn[data-q="\${currentIndex}"][data-s="\${sIdx}"][data-val="\${val}"]\`);
                    if (btn) {
                        btn.parentElement.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    }
                });
            } else if (answer.type === 'choice') {
                document.querySelectorAll(\`.choice-btn[data-q="\${currentIndex}"]\`).forEach(btn => {
                    btn.classList.toggle('selected', parseInt(btn.dataset.choice) === answer.value);
                });
            } else if (answer.type === 'text') {
                const textarea = document.querySelector(\`textarea[data-q="\${currentIndex}"]\`);
                if (textarea) textarea.value = answer.value;
            }
        }
        
        function handleTFAnswer(e) {
            const btn = e.currentTarget;
            const qIdx = parseInt(btn.dataset.q);
            const sIdx = parseInt(btn.dataset.s);
            const val = btn.dataset.val;
            
            if (!userAnswers[qIdx]) {
                userAnswers[qIdx] = { type: 'tf', values: {} };
            }
            userAnswers[qIdx].values[sIdx] = val;
            
            btn.parentElement.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            updateDisplay();
        }
        
        function handleChoiceAnswer(e) {
            const btn = e.currentTarget;
            const qIdx = parseInt(btn.dataset.q);
            const choice = parseInt(btn.dataset.choice);
            
            userAnswers[qIdx] = { type: 'choice', value: choice };
            
            document.querySelectorAll(\`.choice-btn[data-q="\${qIdx}"]\`).forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');
            
            updateDisplay();
        }
        
        function handleTextAnswer(e) {
            const textarea = e.currentTarget;
            const qIdx = parseInt(textarea.dataset.q);
            userAnswers[qIdx] = { type: 'text', value: textarea.value.trim() };
            updateDisplay();
        }
        
        function startTimer() {
            updateTimerDisplay();
            timerInterval = setInterval(() => {
                timeRemaining--;
                updateTimerDisplay();
                
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    alert('Hết giờ! Bài thi sẽ được tự động nộp.');
                    submitQuiz();
                }
            }, 1000);
        }
        
        function updateTimerDisplay() {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const display = \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
            document.getElementById('timer').textContent = display;
            
            if (timeRemaining <= 60) {
                document.getElementById('timer').classList.add('warning');
            }
        }
        
        function submitQuiz() {
            if (quizSubmitted) return;
            quizSubmitted = true;
            
            clearInterval(timerInterval);
            
            // Enable Anki click functionality
            document.querySelectorAll('.anki-clickable').forEach(el => {
                el.classList.add('active');
            });
            
            let correctCount = 0;
            let totalScore = 0;
            let totalQuestions = 0;
            let resultsHTML = '';
            
            document.querySelectorAll('.question-card').forEach((card, i) => {
                totalQuestions++;
                const answer = userAnswers[i];
                const question = currentQuestions[i];
                let isCorrect = false;
                let pointsEarned = 0;
                const totalPoints = question.points;
                
                // Check True/False questions
                if (question.type === 'True/False') {
                    let correctStatements = 0;
                    let totalStatements = question.statements.length;
                    
                    question.statements.forEach((stmt, sIdx) => {
                        const trueBtn = card.querySelector(\`.tf-btn[data-q="\${i}"][data-s="\${sIdx}"][data-val="1"]\`);
                        const falseBtn = card.querySelector(\`.tf-btn[data-q="\${i}"][data-s="\${sIdx}"][data-val="0"]\`);
                        const correctAnswer = stmt.answer;
                        const userAnswer = answer?.values?.[sIdx];
                        
                        // Xóa class selected trước
                        trueBtn.classList.remove('selected');
                        falseBtn.classList.remove('selected');
                        
                        if (userAnswer === correctAnswer) {
                            correctStatements++;
                            // User chọn đúng - chỉ hiển thị correct
                            if (userAnswer === '1') {
                                trueBtn.classList.add('correct');
                            } else {
                                falseBtn.classList.add('correct');
                            }
                        } else {
                            // Luôn đánh dấu đáp án đúng
                            if (correctAnswer === '1') {
                                trueBtn.classList.add('correct');
                            } else {
                                falseBtn.classList.add('correct');
                            }
                            
                            // Nếu user chọn sai (không phải undefined)
                            if (userAnswer !== undefined) {
                                if (userAnswer === '1') {
                                    trueBtn.classList.add('incorrect');
                                } else {
                                    falseBtn.classList.add('incorrect');
                                }
                            } else {
                                // User không chọn - chỉ thêm not-answered vào nút sai
                                if (correctAnswer === '1') {
                                    falseBtn.classList.add('not-answered');
                                } else {
                                    trueBtn.classList.add('not-answered');
                                }
                            }
                        }
                    });
                    
                    if (correctStatements === totalStatements) {
                        isCorrect = true;
                        pointsEarned = totalPoints;
                    } else if (correctStatements === totalStatements - 1 && correctStatements > 0) {
                        pointsEarned = totalPoints * 0.5;
                    } else if (correctStatements === totalStatements - 2 && correctStatements > 0) {
                        pointsEarned = totalPoints * 0.25;
                    } else if (correctStatements === totalStatements - 3 && correctStatements > 0) {
                        pointsEarned = totalPoints * 0.1;
                    }
                }
                
                // Check Multiple Choice questions
                else if (question.type === 'Multiple Choices') {
                    const correctAnswer = question.answer;
                    const userAnswer = answer?.value;
                    
                    card.querySelectorAll('.choice-btn').forEach(btn => {
                        const choiceIdx = parseInt(btn.dataset.choice);
                        btn.classList.remove('selected');
                        
                        if (choiceIdx === correctAnswer) {
                            btn.classList.add('correct');
                        }
                        
                        if (userAnswer !== undefined && choiceIdx === userAnswer) {
                            if (userAnswer === correctAnswer) {
                                isCorrect = true;
                                pointsEarned = totalPoints;
                            } else {
                                btn.classList.add('incorrect');
                            }
                        }
                    });
                }
                
                // Check Short Answer questions
                else if (question.type === 'Short Answer') {
                    const textarea = card.querySelector('textarea');
                    const correctAnswer = question.answer.toLowerCase().trim();
                    const userAnswer = (answer?.value || '').toLowerCase().trim();
                    
                    if (userAnswer === correctAnswer) {
                        isCorrect = true;
                        pointsEarned = totalPoints;
                        textarea.style.borderColor = '#28a745';
                        textarea.style.backgroundColor = '#d4edda';
                    } else {
                        textarea.style.borderColor = '#dc3545';
                        textarea.style.backgroundColor = '#f8d7da';
                        
                        const answerDiv = document.createElement('div');
                        answerDiv.className = 'mt-2 alert alert-success';
                        answerDiv.innerHTML = \`<strong><i class="fas fa-check-circle"></i> Đáp án đúng:</strong> \${question.answer}\`;
                        textarea.parentElement.appendChild(answerDiv);
                    }
                }
                
                // Show extra content
                const extraContent = card.querySelector('.extra-content');
                if (extraContent) {
                    extraContent.style.display = 'block';
                }
                
                if (isCorrect) correctCount++;
                totalScore += pointsEarned;
                
                resultsHTML += \`
                    <div class="result-item \${isCorrect ? 'correct' : 'incorrect'}">
                        <strong>Câu \${i + 1}:</strong> 
                        <span class="badge \${isCorrect ? 'bg-success' : 'bg-danger'}">\${isCorrect ? 'Đúng' : 'Sai'}</span>
                        <span class="badge bg-info">\${pointsEarned.toFixed(2)} điểm</span>
                    </div>
                \`;
            });
            
            document.getElementById('resultStats').innerHTML = \`
                <div class="stat-card">
                    <h3>\${totalScore.toFixed(1)}/10</h3>
                    <p>Điểm số</p>
                </div>
                <div class="stat-card">
                    <h3>\${correctCount}/\${totalQuestions}</h3>
                    <p>Câu đúng</p>
                </div>
                <div class="stat-card">
                    <h3>\${totalQuestions - correctCount}/\${totalQuestions}</h3>
                    <p>Câu sai</p>
                </div>
            \`;
            
            document.getElementById('resultDetails').innerHTML = resultsHTML;
            document.getElementById('resultModal').style.display = 'block';
            
            // Disable all buttons
            document.querySelectorAll('.tf-btn, .choice-btn, textarea').forEach(el => {
                el.disabled = true;
                el.style.pointerEvents = 'none';
            });
            
            // Render lại MathJax cho các phần mới hiển thị (extra content)
            typesetMath(document.body).then(() => {
                console.log('MathJax rerendered after submit');
            });
        }
        
        // Bắt đầu khi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    `;
}