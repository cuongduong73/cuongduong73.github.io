// ui/QuizTakingUI.js - Quiz taking screen UI

import { QuizRenderer } from '../quiz/QuizRenderer.js';

export class QuizTakingUI {
    constructor() {
        this.renderer = new QuizRenderer(
            document.getElementById('questionsContainer'),
            document.getElementById('questionNav')
        );
        this.timerElement = document.getElementById('timer');
    }

    show() {
        document.getElementById('quizCreationView')?.style?.setProperty('display', 'none');
        document.getElementById('quizTakingView').style.display = 'block';
    }

    hide() {
        document.getElementById('quizTakingView').style.display = 'none';
    }

    renderQuiz(quiz) {
        this.renderer.renderQuestions(quiz.questions);
    }

    updateDisplay(currentIndex, answers) {
        this.renderer.updateDisplay(currentIndex, answers);
    }

    updateTimer(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        this.timerElement.textContent = display;

        if (seconds <= 60) {
            this.timerElement.classList.add('warning');
        } else {
            this.timerElement.classList.remove('warning');
        }
    }

    // Handle UI updates for answers
    handleTFAnswerUI(qIdx, sIdx, val, btn) {
        btn.parentElement.querySelectorAll('.tf-btn')
            .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }

    handleChoiceAnswerUI(qIdx, choice, btn) {
        document.querySelectorAll(`.choice-btn[data-q="${qIdx}"]`)
            .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }
}