import { 
    AlertUI,
    QuizTakingUI,
    QuizResultUI
} from "../src/ui/index.js";

import { quizManager } from "../src/core/QuizManager.js";
import { EventManager } from "../src/core/EventManager.js";
import { QuizTimer } from "../src/quiz/QuizTimer.js";
import { AnkiAPI } from "../src/core/api.js";

let quizTimer = null;
let quizTakingUI = null;
let quizResultUI = null;

const ALERT_DELAY = 350;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventHandlers();
});

function setupEventHandlers() {
    setupQuizTakingEvents();
    setupQuizResultEvents();
    setupImportQuizEvents();
}

// === Quiz Taking Events ===
function setupQuizTakingEvents() {
    quizTakingUI = new QuizTakingUI();
}

// === Quiz Result Events ===
function setupQuizResultEvents() {
    quizResultUI = new QuizResultUI();

    EventManager.bind('#retryQuizBtn', 'click', () => {
        if (confirm('Bạn có muốn làm lại bài thi này?')) {
            quizResultUI.hide();
            retryQuiz();
        }
    }, 'quiz-result');

    // Filter buttons
    EventManager.bind('#resultFilterButtons', 'click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        
        const filter = btn.dataset.filter;
        quizResultUI.filterResults(filter);
    }, 'quiz-result');
}

// === Import Quiz Events ===
function setupImportQuizEvents() {
    // Xử lý khi chọn file
    EventManager.bind('#importQuizFileInput', 'change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Kiểm tra file JSON
        if (!file.name.endsWith('.json')) {
            AlertUI.error('Vui lòng chọn file JSON!');
            e.target.value = '';
            return;
        }

        try {
            // Đọc file
            const text = await file.text();
            const quizData = JSON.parse(text);

            // Validate dữ liệu
            validateQuizData(quizData);

            // Load quiz vào quizManager
            loadQuizFromJSON(quizData);

            // Ẩn navbar và welcome screen, hiện quiz
            hideNavbarAndWelcome();

            // Bắt đầu làm bài
            startQuizTaking();

            // Reset input
            e.target.value = '';
        } catch (error) {
            console.error('Import quiz failed:', error);
            AlertUI.error(`Lỗi khi import đề thi: ${error.message}`);
            e.target.value = '';
        }
    }, 'import-quiz');

    // Click nút "Vào thi" sẽ mở file picker
    EventManager.bind('#importQuizBtn', 'click', () => {
        document.getElementById('importQuizFileInput').click();
    }, 'import-quiz');
}

// Ẩn navbar và welcome screen
function hideNavbarAndWelcome() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    const timer = document.getElementById('timer');
    if (timer) timer.classList.remove('d-none');
}

// Hiện navbar và welcome screen
function showNavbarAndWelcome() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) welcomeScreen.style.display = 'block';
    const timer = document.getElementById('timer');
    if (timer) timer.classList.add('d-none');
}

// Validate dữ liệu quiz từ JSON
function validateQuizData(quizData) {
    if (!quizData.quiz) {
        throw new Error('File JSON không hợp lệ: thiếu trường "quiz"');
    }

    if (!quizData.quiz.questions || !Array.isArray(quizData.quiz.questions)) {
        throw new Error('File JSON không hợp lệ: thiếu hoặc sai định dạng "questions"');
    }

    if (quizData.quiz.questions.length === 0) {
        throw new Error('Đề thi không có câu hỏi nào!');
    }

    if (!quizData.quiz.duration || quizData.quiz.duration <= 0) {
        throw new Error('File JSON không hợp lệ: thiếu hoặc sai "duration"');
    }

    // Validate từng câu hỏi
    quizData.quiz.questions.forEach((q, index) => {
        if (!q.type) {
            throw new Error(`Câu ${index + 1}: thiếu "type"`);
        }
        
        if (q.points === undefined || q.points < 0) {
            throw new Error(`Câu ${index + 1}: thiếu hoặc sai "points"`);
        }
    });

    return true;
}

// Load quiz từ JSON vào quizManager
function loadQuizFromJSON(quizData) {
    const { name, quiz, metadata } = quizData;

    // Cập nhật thông tin đề thi lên UI
    if (name) {
        const testTitle = document.getElementById('test');
        if (testTitle) testTitle.textContent = name;
    }

    if (quiz.duration) {
        const durationEl = document.getElementById('duration');
        if (durationEl) durationEl.textContent = Math.floor(quiz.duration / 60);
    }

    if (quiz.questions) {
        const questionCountEl = document.getElementById('questionCount');
        if (questionCountEl) questionCountEl.textContent = quiz.questions.length;
    }

    // Load quiz vào quizManager
    quizManager.currentQuiz = quiz

    // console.log('Loaded quiz:', name);
    // console.log('Duration:', quiz.duration, 'seconds');
    // console.log('Questions:', quiz.questions.length);
}

// === Start Quiz ===
function startQuizTaking() {
    const state = quizManager.getState();

    // Kiểm tra quiz có hợp lệ không
    if (!state.quiz || !state.quiz.questions || state.quiz.questions.length === 0) {
        AlertUI.error('Không có câu hỏi nào được tạo. Vui lòng kiểm tra dữ liệu!');
        return;
    }

    // Clear old quiz events before binding new ones
    EventManager.clear('quiz');

    quizTakingUI.show();
    quizTakingUI.renderQuiz(state.quiz);
    quizTakingUI.updateDisplay(state.currentIndex, state.answers);

    // Bind navigation events
    bindNavigationEvents();

    // Bind answer events
    bindAnswerEvents();
    quizManager.reset();
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

    AlertUI.success('Bắt đầu làm bài!');
}

// === Navigation Events ===
function bindNavigationEvents() {
    // Event delegation cho navigation buttons
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
            '📤 Bạn có chắc chắn muốn <b>nộp bài</b>?<br><small>Sau khi nộp, bạn sẽ không thể thay đổi đáp án.</small>',
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

// === Answer Events ===
function bindAnswerEvents() {
    // Event delegation cho True/False buttons
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

    // Event delegation cho Multiple choice buttons
    EventManager.bind('#questionsContainer', 'click', (e) => {
        const btn = e.target.closest('.choice-btn');
        if (!btn) return;
        
        const qIdx = parseInt(btn.dataset.q);
        const choice = parseInt(btn.dataset.choice);

        if (isNaN(qIdx) || isNaN(choice)) return;

        quizManager.saveAnswer({ type: 'choice', value: choice });
        quizTakingUI.handleChoiceAnswerUI(qIdx, choice, btn);
    }, 'quiz');

    // Event delegation cho Text answers
    EventManager.bind('#questionsContainer', 'input', (e) => {
        const textarea = e.target.closest('textarea[data-q]');
        if (!textarea) return;
        
        const qIdx = parseInt(textarea.dataset.q);
        if (isNaN(qIdx)) return;
        
        quizManager.saveAnswer({ type: 'text', value: textarea.value.trim() });
    }, 'quiz');
}

// === Timer ===
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

// === Submit Quiz ===
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

// === Show Results ===
function showResults(results) {
    // Clear quiz events when showing results
    EventManager.clear('quiz');

    quizResultUI.show();
    quizResultUI.render(results);
}

// === Retry Quiz ===
function retryQuiz() {
    // Clear old quiz event
    EventManager.clear('quiz');

    // Retry the quiz (reshuffle and reset)
    const quiz = quizManager.retryQuiz();

    if (!quiz) {
        AlertUI.error('Không thể làm lại bài thi!');
        return;
    }

    // Ẩn navbar và welcome screen khi làm lại
    hideNavbarAndWelcome();

    // Start quiz taking again
    startQuizTaking();
}

window.openAnkiNote = function (element) {
    const noteId = element.id;
    if (!noteId || noteId === '0') {
        // console.log('Không có note ID');
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