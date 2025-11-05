// events.js - Centralized event handlers

import { checkAnkiConnection, AnkiAPI, buildAnkiQuery } from "./core/api.js";
import {
    AlertUI,
    ImportModalUI,
    DatasetUI,
    QuizCreationUI,
    QuizTakingUI,
    QuizResultUI,
    DefinitionMappingUI
} from "./ui/index.js";
import { datasetManager } from "./core/DatasetManager.js";
import { quizManager } from "./core/QuizManager.js";
import { QuizTimer } from "./quiz/QuizTimer.js";
import { storageManager } from "./core/storage.js";
import { EventManager } from "./core/EventManager.js";
import { DATASET_TYPES } from "./types.js";

const DEFAULT_DEFINITION_TEMPLATE = {
    forward: "Từ {keyword} có nghĩa là gì?",
    reverse: "Từ nào sau đây mang nghĩa {definition}?"
}

let quizTimer = null;
let quizTakingUI = null;
let quizResultUI = null;

const ALERT_DELAY = 350;

export function setupEventHandlers() {
    setupConnectionCheck();
    setupDefinitionMapping();
    setupImportEvents();
    setupDatasetEvents();
    setupQuizCreationEvents();
    setupQuizTakingEvents();
    setupQuizResultEvents();
    setupBackupEvents();
}

// === Connection Check ===
function setupConnectionCheck() {
    // Auto-check on load handled in init
}

// === Import Events ===
function setupImportEvents() {
    EventManager.bind('#importBtn', 'click', () => on_importBtn(), 'import');

    EventManager.bind('#saveDatasetBtn', 'click', () => on_saveDatasetBtn(), 'import');
}

async function on_importBtn() {
    try {
        // 1️⃣ Kiểm tra kết nối Anki
        const connected = await checkAnkiConnection();
        if (!connected) {
            AlertUI.warning("Vui lòng mở Anki trước khi tiếp tục.", 5000);
            return;
        }
    } catch (err) {
        console.error("Anki connection check failed:", err);
        AlertUI.error("Không thể kiểm tra kết nối Anki.", 5000);
        return;
    }
    
    // 2️⃣ Hiển thị modal + loading
    ImportModalUI.show();
    ImportModalUI.showLoading();

    try {
        // 3️⃣ Tải dữ liệu từ Anki song song
        const [decks, noteTypes, tags] = await Promise.all([
            AnkiAPI.getDecks(),
            AnkiAPI.getModels(),
            AnkiAPI.getTags()
        ]);

        // 4️⃣ Đổ dữ liệu vào các select
        ImportModalUI.fillSelect('deckSelect', decks, '-- Chọn Deck --');
        ImportModalUI.fillSelect('noteTypeSelect', noteTypes, '-- Chọn Note Type --');
        ImportModalUI.fillSelect('tagsSelect', tags);
        ImportModalUI.reset();
        DefinitionMappingUI.display('');
        ImportModalUI.showForm();
    } catch (error) {
        console.error("Import data load failed:", error);
        if (error.message.includes("fetch") || error.message.includes("network")) {
            AlertUI.warning("Mất kết nối mạng. Vui lòng thử lại.", 5000);
        } else {
            AlertUI.error(`Lỗi khi tải dữ liệu: ${error.message}`, 5000);
        }
        ImportModalUI.hide();
    }
}

async function on_saveDatasetBtn() {
    try {
        const formData = ImportModalUI.getImportFormData();
        ImportModalUI.validateImportForm(formData);

        const query = buildAnkiQuery(
            formData.deck,
            formData.noteType,
            formData.tags,
            formData.onlyStudied
        );

        const noteIds = await AnkiAPI.findNotes(query);
        const notes = await AnkiAPI.getNotesInfo(noteIds);

        // Get metadata for Definition type
        const metadata = formData.type === DATASET_TYPES.DEFINITION ? {
            forwardQuestionTemplate: document.getElementById('forwardQuestionTemplate').value.trim() || DEFAULT_DEFINITION_TEMPLATE.forward,
            reverseQuestionTemplate: document.getElementById('reverseQuestionTemplate').value.trim() || DEFAULT_DEFINITION_TEMPLATE.reverse
        } : {};

        const dataset = await datasetManager.create({
            name: formData.name,
            type: formData.type,
            deck: formData.deck,
            noteType: formData.noteType,
            tags: formData.tags,
            notesInfo: notes,
            metadata: metadata
        });

        ImportModalUI.hide();
        document.getElementById('importForm').reset();
        AlertUI.success(`Đã nhập thành công ${dataset.cardCount} thẻ!`);
    } catch (err) {
        console.error("Save dataset failed:", err);
        AlertUI.error("Nhập dữ liệu thất bại");
    }      
}
// === Dataset Events ===
function setupDatasetEvents() {
    DatasetUI.init();
        
    // 🧹 Xóa tất cả event cũ trong namespace 'dataset'
    EventManager.clear('dataset');

     // 🎯 Event delegation — chỉ gắn 1 lần vào tbody
    EventManager.bind('#datasetTableBody', 'click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return; // Không phải nút có data-action

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!action || !id) return;

        switch (action) {
            case 'detail':
                DatasetUI.showDetail(id);
                break;
            case 'view':
                DatasetUI.viewCards(id);
                break;
            case 'delete':
                DatasetUI.deleteDataset(id);
                break;
            default:
                console.warn('Unknown dataset action:', action);
        }
    }, 'dataset');
}

// === Quiz Creation Events ===
function setupQuizCreationEvents() {
    // ⚙️ Gắn sự kiện cho nút "Tạo Quiz" (gắn 1 lần duy nhất)
    EventManager.bind('#createBtn', 'click', () => {
        const datasets = datasetManager.getAll();

        if (datasets.length === 0) {
            AlertUI.warning('Vui lòng nhập dữ liệu trước!');
            return;
        }

        // 🧩 Hiển thị UI tạo quiz
        QuizCreationUI.show(datasets);

        // 🧹 Xóa event form cũ trước khi gắn lại
        EventManager.clear('quiz-creation-form');

        const formEl = document.getElementById('quizCreationForm');

        // 🎯 Event delegation: Bắt sự kiện thay đổi trong form
        EventManager.bind(formEl, 'change', e => {
            const target = e.target;

            if (target.classList.contains('dataset-select')) {
                QuizCreationUI.updateQuestionTypeVisibility();
            }
        }, 'quiz-creation-form');

        // 🧮 Tự động cập nhật điểm khi nhập
        EventManager.bind(formEl, 'input', e => {
            if (e.target.classList.contains('question-points')) {
                QuizCreationUI.updateTotalPoints();
            }
        }, 'quiz-creation-form');

        // 🔙 Quay về màn chính
        EventManager.bind('#backToMainBtn', 'click', () => {
            QuizCreationUI.hide();
        }, 'quiz-creation-form');
    }, 'quiz-creation');

    // 📝 Xử lý khi submit form (chỉ gắn 1 lần)
    EventManager.bind('#quizCreationForm', 'submit', e => {
        e.preventDefault();

        try {
            const formData = QuizCreationUI.getFormData();
            QuizCreationUI.validateForm(formData);

            const datasets = datasetManager.getAll();
            quizManager.createQuiz(
                datasets,
                formData.selectedDatasets,
                formData.questionTypes,
                formData.duration
            );
            startQuizTaking();
        } catch (error) {
            AlertUI.error(error.message);
        }
    }, 'quiz-creation');
}


// === Quiz Taking Events ===
function setupQuizTakingEvents() {
    quizTakingUI = new QuizTakingUI();
}

function startQuizTaking() {
    const state = quizManager.getState();

    // ✅ Kiểm tra quiz có hợp lệ không
    if (!state.quiz || !state.quiz.questions || state.quiz.questions.length === 0) {
        AlertUI.error('Không có câu hỏi nào được tạo. Vui lòng kiểm tra dữ liệu!');
        QuizCreationUI.show(datasetManager.getAll()); // Quay lại form tạo quiz
        return;
    }

    // Clear old quiz events before binding new ones
    EventManager.clear('quiz');

    quizTakingUI.show();
    quizTakingUI.renderQuiz(state.quiz);
    quizTakingUI.updateDisplay(state.currentIndex, state.answers);

    // Bind navigation events
    bindNavigationEvents()

    // Bind answer events
    bindAnswerEvents()

    // Listen to quiz manager events
    quizManager.on('questionChanged', (index) => {
        const state = quizManager.getState();
        quizTakingUI.updateDisplay(index, state.answers);
    });

    quizManager.on('answerSaved', () => {
        const state = quizManager.getState();
        quizTakingUI.updateDisplay(state.currentIndex, state.answers);
    });

    // Start timer
    startTimer();
}

function bindNavigationEvents() {
    // ✅ Event delegation cho navigation buttons (thay vì querySelectorAll)
    EventManager.bind('#questionNav', 'click', (e) => {
        const btn = e.target.closest('.question-nav-btn');
        if (!btn) return;
        
        const index = parseInt(btn.dataset.index);
        if (!isNaN(index)) {
            quizManager.goToQuestion(index);
        }
    }, 'quiz');

    // Prev button
    EventManager.bind('#prevBtn', 'click', () => {
        quizManager.prevQuestion();
    }, 'quiz');

    // Next button
    EventManager.bind('#nextBtn', 'click', () => {
        quizManager.nextQuestion();
    }, 'quiz');

    // Submit button
    EventManager.bind('#submitBtn', 'click', () => {
        AlertUI.confirm(
            'Bạn có chắc chắn muốn <b>nộp bài</b>?<br><small>Sau khi nộp, bạn sẽ không thể thay đổi đáp án.</small>',
            async () => {
                try {
                    await submitQuiz();
                    setTimeout(() => {
                        AlertUI.success('Bài làm của bạn đã được nộp!');
                    }, ALERT_DELAY);
                } catch (error) {
                    setTimeout(() => {
                        AlertUI.error('Có lỗi khi nộp bài: ' + error.message);
                    }, ALERT_DELAY);
                }
            },
            () => {
                setTimeout(() => {
                    AlertUI.info('Đã hủy thao tác nộp bài.');
                }, ALERT_DELAY);
            }
        );
    }, 'quiz');
}

function bindAnswerEvents() {
    // ✅ Event delegation cho True/False buttons
    EventManager.bind('#questionsContainer', 'click', (e) => {
        const btn = e.target.closest('.tf-btn');
        if (!btn) return;
        
        const qIdx = parseInt(btn.dataset.q);
        const sIdx = parseInt(btn.dataset.s);
        const val = btn.dataset.val;

        if (isNaN(qIdx) || isNaN(sIdx)) return;

        if (!quizManager.getAnswer(qIdx)) {
            quizManager.saveAnswer({ type: 'tf', value: {} });
        }
        const answer = quizManager.getAnswer(qIdx);
        answer.value[sIdx] = val;
        quizManager.saveAnswer(answer);

        quizTakingUI.handleTFAnswerUI(qIdx, sIdx, val, btn);
    }, 'quiz');

    // ✅ Event delegation cho Multiple choice buttons
    EventManager.bind('#questionsContainer', 'click', (e) => {
        const btn = e.target.closest('.choice-btn');
        if (!btn) return;
        
        const qIdx = parseInt(btn.dataset.q);
        const choice = parseInt(btn.dataset.choice);

        if (isNaN(qIdx) || isNaN(choice)) return;

        quizManager.saveAnswer({ type: 'choice', value: choice });
        quizTakingUI.handleChoiceAnswerUI(qIdx, choice, btn);
    }, 'quiz');

    // ✅ Event delegation cho Text answers
    EventManager.bind('#questionsContainer', 'input', (e) => {
        const textarea = e.target.closest('textarea[data-q]');
        if (!textarea) return;
        
        const qIdx = parseInt(textarea.dataset.q);
        if (isNaN(qIdx)) return;
        
        quizManager.saveAnswer({ type: 'text', value: textarea.value.trim() });
    }, 'quiz');
}

function startTimer() {
    const state = quizManager.getState();

    quizTimer = new QuizTimer(
        state.quiz.duration,
        (seconds) => {
            quizManager.updateTimer(seconds);
            quizTakingUI.updateTimer(seconds);
        },
        () => {
            AlertUI.warning('Hết giờ! Bài thi sẽ được tự động nộp.');
            submitQuiz();
        }
    );

    quizTimer.start();
}

function submitQuiz() {
    if (quizTimer) {
        quizTimer.stop();
    }

    const results = quizManager.submitQuiz();
    showResults(results);
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

// === Quiz Result Events ===
function setupQuizResultEvents() {
    quizResultUI = new QuizResultUI();

    EventManager.bind('#backToMainFromResultBtn', 'click', () => {
        quizResultUI.hide();
        document.getElementById('mainView').style.display = 'block';
    }, 'quiz-result');

    EventManager.bind('#retryQuizBtn', 'click', () => {
        AlertUI.confirm(
            'Bạn có muốn làm lại bài thi này?',
            async () => {
                try {
                    quizResultUI.hide();
                    retryQuiz();
                    setTimeout(() => {
                        AlertUI.success('Bắt đầu bài thi!');
                    }, ALERT_DELAY)
                } catch {
                    setTimeout(() => {
                        AlertUI.error('Không thể tạo lại bài thi!');
                    }, ALERT_DELAY);
                }
            },
            () => {
                setTimeout(() => {
                    AlertUI.info('Đã hủy thao tác.');
                }, ALERT_DELAY);
            }
        );
    }, 'quiz-result');

    // Filter buttons
    EventManager.bind('#resultFilterButtons', 'click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        
        const filter = btn.dataset.filter;
        quizResultUI.filterResults(filter);
    }, 'quiz-result');

    // 🆕 Export quiz button - Hiển thị modal
    EventManager.bind('#exportQuizBtn', 'click', () => {
        console.log("click");
        const modal = new bootstrap.Modal(document.getElementById('exportQuizModal'));
        modal.show();
        
        // Focus vào input tên sau khi modal hiển thị
        setTimeout(() => {
            document.getElementById('exportQuizName').focus();
        }, 500);
    }, 'quiz-result');

    // 🆕 Confirm export button trong modal
    EventManager.bind('#confirmExportBtn', 'click', () => {
        const quizName = document.getElementById('exportQuizName').value.trim();
        
        if (!quizName) {
            AlertUI.warning('Vui lòng nhập tên đề thi!');
            return;
        }
        
        exportCurrentQuiz(quizName);
        
        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportQuizModal'));
        modal.hide();
        
        // Reset input
        document.getElementById('exportQuizName').value = '';
    }, 'quiz-result');

    // 🆕 Xử lý Enter key trong input
    EventManager.bind('#exportQuizName', 'keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmExportBtn').click();
        }
    }, 'quiz-result');
}

function retryQuiz() {
    // Clear old quiz event
    EventManager.clear('quiz');

    // Retry the quiz (reshuffle and reset)
    const quiz = quizManager.retryQuiz();

    if (!quiz) {
        AlertUI.error('Không thể làm lại bài thi!');
        return;
    }

    // Start quiz taking again
    startQuizTaking();
}

function showResults(results) {
    // Clear quiz events when showing results
    EventManager.clear('quiz');

    quizResultUI.show();
    quizResultUI.render(results);
}

// === Backup/Restore Events ===
function setupBackupEvents() {
    EventManager.bind('#exportDataBtn', 'click', () => {
        exportToFile();
    }, 'backup');

    EventManager.bind('#importDataBtn', 'click', () => {
        document.getElementById('importFileInput').click();
    }, 'backup');

    EventManager.bind('#importFileInput', 'change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await datasetManager.importFromFile(file);
                AlertUI.success('Đã import dữ liệu thành công!');
            } catch (error) {
                AlertUI.error(`Lỗi import: ${error.message}`);
            }
            e.target.value = '';
        }
    }, 'backup');

    EventManager.bind('#statsBtn', 'click', async () => {
        const stats = await storageManager.getStats();
        AlertUI.info(`<br>📊 <b>Thống kê dữ liệu:</b><br>
                        🗂️ Số datasets: ${stats.count}<br>
                        📇 Tổng số thẻ: ${stats.totalCards}<br>
                        💾 Kích thước: ${stats.sizeFormatted}`, 7000);
    }, 'backup');

    EventManager.bind('#clearAllBtn', 'click', () => {
        AlertUI.confirm(
            'Bạn có chắc chắn muốn xóa <b>TẤT CẢ</b> dữ liệu? Hành động này <u>không thể hoàn tác</u>!',
            async () => {
                try {
                    await storageManager.clearAll();
                    await datasetManager.load(); // reload danh sách
                    setTimeout(() => {
                        AlertUI.success('Đã xóa tất cả dữ liệu!');
                    }, ALERT_DELAY)
                } catch (error) {
                    setTimeout(() => {
                        AlertUI.error('Lỗi khi xóa dữ liệu: ' + error.message);
                    }, ALERT_DELAY);
                }
            },
            () => {
                setTimeout(() => {
                    AlertUI.info('Đã hủy thao tác.');
                }, ALERT_DELAY);
            }
        );
    }, 'backup');
}

function exportToFile() {
    const datasets = datasetManager.getAll();
    const dataStr = JSON.stringify(datasets, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anki-quiz-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    AlertUI.success('Đã export dữ liệu!');
}

// === Definition Mapping ===
function setupDefinitionMapping() {
    DefinitionMappingUI.bindEvents();
}

// === Anki Integration ===
window.openAnkiNote = function (element) {
    const noteId = element.id;
    if (!noteId || noteId === '0') {
        console.log('Không có note ID');
        return;
    }

    const searchQuery = `nid:${noteId}`;
    AnkiAPI.openNote(searchQuery)
        .then(() => {
            AlertUI.info(`Đã mở trình duyệt Anki với tìm kiếm ${searchQuery}.`)
        })
        .catch(() => {
            AlertUI.error(`Lỗi kết nối AnkiConnect!`)
        });
};

// === Export Current Quiz ===
function exportCurrentQuiz(quizName) {
    const state = quizManager.getState();
    
    if (!state.quiz) {
        AlertUI.error('Không có đề thi để xuất!');
        return;
    }

    // Tạo dữ liệu export
    const exportData = {
        name: quizName,
        quiz: {
            questions: state.quiz.questions,
            duration: state.quiz.duration,
            totalPoints: state.quiz.totalPoints
        },
        metadata: {
            exportedAt: new Date().toISOString(),
            exportedDate: new Date().toLocaleString('vi-VN'),
            version: '1.0',
            questionCount: state.quiz.questions.length
        }
    };

    // Convert to JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Tạo tên file từ quiz name
    const safeName = quizName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeName}-${timestamp}.json`;
    
    // Download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    AlertUI.success(`✅ Đã xuất đề thi: <strong>${filename}</strong>`);
}