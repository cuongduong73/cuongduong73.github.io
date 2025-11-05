// quiz/QuizRenderer.js - Renders quiz questions and handles display

import { QUESTION_TYPES } from '../types.js';
import { QuestionFactory } from './QuestionFactory.js';

export class QuizRenderer {
    constructor(containerElement, navElement) {
        this.container = containerElement;
        this.nav = navElement;
    }

    /**
     * Render all questions
     */
    renderQuestions(questions) {
        // Render navigation
        this.renderNavigation(questions);

        // Render question cards
        const questionsHTML = questions.map((questionData, index) => {
            const question = QuestionFactory.createInstance(questionData);
            return question.render(index);
        }).join('');

        this.container.innerHTML = questionsHTML;

        // Render MathJax if available
        if (window.MathJax) {
            MathJax.typesetPromise([this.container])
                .catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * Render navigation buttons
     */
    renderNavigation(questions) {
        // Nếu nav element không tồn tại => bỏ qua
        if (!this.nav) return;

        // Dùng DocumentFragment để tối ưu hiệu năng
        const fragment = document.createDocumentFragment();

        questions.forEach((q, i) => {
            const btn = document.createElement('button');
            btn.className = 'question-nav-btn btn btn-outline-secondary mx-1';
            btn.dataset.index = i;
            btn.textContent = i + 1;
            fragment.appendChild(btn);
        });

        // Xóa toàn bộ nội dung cũ và thêm fragment mới
        this.nav.replaceChildren(fragment);
    }

    /**
     * Update question display (show/hide based on current index)
     */
    updateDisplay(currentIndex, answers) {
        // Update question cards visibility
        document.querySelectorAll('.question-card').forEach((card, i) => {
            card.classList.toggle('active', i === currentIndex);
        });

        // Update navigation buttons state
        document.querySelectorAll('.question-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === currentIndex);
            btn.classList.toggle('answered', answers[i] !== undefined);
        });

        // Restore answers for current question
        this.restoreAnswers(currentIndex, answers);
    }

    /**
     * Restore saved answers in UI
     */
    restoreAnswers(currentIndex, answers) {
        const answer = answers[currentIndex];
        if (!answer) return;

        // True/False buttons
        if (answer.type === 'tf') {
            Object.entries(answer.value).forEach(([sIdx, val]) => {
                const btn = document.querySelector(
                    `.tf-btn[data-q="${currentIndex}"][data-s="${sIdx}"][data-val="${val}"]`
                );
                if (btn) {
                    btn.parentElement.querySelectorAll('.tf-btn')
                        .forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            });
        }
        
        // Multiple choice buttons
        else if (answer.type === 'choice') {
            document.querySelectorAll(`.choice-btn[data-q="${currentIndex}"]`).forEach(btn => {
                btn.classList.toggle('selected', parseInt(btn.dataset.choice) === answer.value);
            });
        }
        
        // Text answers
        else if (answer.type === 'text') {
            const textarea = document.querySelector(`textarea[data-q="${currentIndex}"]`);
            if (textarea) textarea.value = answer.value;
        }
    }

    /**
     * Render quiz results
     */
    renderResults(resultsData, containerElement, showOriginalIndex = false) {
        const { results, totalScore, correctCount, incorrectCount, timeSpent } = resultsData;

        // Render summary stats
        document.getElementById('finalScore').textContent = totalScore.toFixed(1) + '/10';
        document.getElementById('correctCount').textContent = correctCount;
        document.getElementById('incorrectCount').textContent = incorrectCount;

        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        document.getElementById('timeSpent').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // 🆕 Render detailed results với original index
        const resultsHTML = results.map((r, i) => {
            // 🆕 Sử dụng originalIndex nếu có, không thì dùng i
            const displayIndex = showOriginalIndex && r.originalIndex !== undefined 
                ? r.originalIndex 
                : i;
            return this.renderResultCard(r, displayIndex);
        }).join('');

        containerElement.innerHTML = resultsHTML;

        // Render MathJax
        if (window.MathJax) {
            MathJax.typesetPromise([containerElement])
                .catch(err => console.log('MathJax error:', err));
        }
    }

    /**
     * Render a single result card
     */
    renderResultCard(result, index) {
        const { question, userAnswer, isCorrect, points } = result;
        const resultClass = isCorrect ? 'correct' : 'incorrect';

        let answerDisplay = '';

        if (question.type === QUESTION_TYPES.TRUE_FALSE) {
            answerDisplay = question.statements.map((stmt, si) => {
                const userAns = userAnswer ? userAnswer[si] : null;
                const correctAns = stmt.answer;
                const isStmtCorrect = userAns === correctAns;
                
                const questionHTML = question.question 
                    ? `<div>${stmt.question}</div>`
                    : `<div onclick="openAnkiNote(this)" id="${stmt.id}">${stmt.question}</div>`;

                return `
                    <div class="mb-2">
                        ${questionHTML}
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
            }).join('');
        }
        
        else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICES || question.type === QUESTION_TYPES.DEFINITION) {
            answerDisplay = `
                <div><strong>Bạn chọn:</strong> 
                    <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">
                        ${userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) : 'Chưa trả lời'}
                    </span>
                </div>
                <div><strong>Đáp án:</strong> 
                    <span class="correct-answer">${String.fromCharCode(65 + question.answer)}</span>
                </div>
            `;

            // Add clickable cards for Definition type
            if (question.type === 'Definition' && question.cards) {
                answerDisplay += '<div class="mt-2"><small class="text-muted">Click vào các lựa chọn để xem thẻ Anki:</small></div>';
                answerDisplay += question.choices.map((choice, idx) => {
                    const card = question.cards[idx];
                    return `<div class="mt-1" onclick="openAnkiNote(this)" id="${card.id}" style="cursor:pointer; color: #667eea;">
                        ${String.fromCharCode(65 + idx)}. ${choice}
                    </div>`;
                }).join('');
            }
        }
        
        else if (question.type === QUESTION_TYPES.SHORT_ANSWER) {
            answerDisplay = `
                <div><strong>Câu trả lời của bạn:</strong> 
                    <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">
                        ${userAnswer || 'Chưa trả lời'}
                    </span>
                </div>
                <div><strong>Đáp án:</strong> 
                    <span class="correct-answer">${question.answer}</span>
                </div>
            `;
        }

        const questionHTML = question.question 
            ? `<div class="mb-2" onclick="openAnkiNote(this)" id="${question.id || 0}">${question.question}</div>`
            : '';

        return `
            <div class="result-card ${resultClass}">
                <h5>Câu ${index + 1} 
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'}">
                        ${isCorrect ? 'Đúng' : 'Sai'}
                    </span>
                    <span class="badge bg-info">${points.toFixed(2)} điểm</span>
                </h5>
                ${questionHTML}
                ${answerDisplay}
                ${question.extra ? `<div class="mt-2"><strong>Giải thích:</strong> ${question.extra}</div>` : ''}
            </div>
        `;
    }
}