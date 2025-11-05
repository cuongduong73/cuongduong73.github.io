// core/QuizManager.js - Manages quiz state and logic

import { QuestionFactory } from '../quiz/QuestionFactory.js';
import { shuffleChoicesInQuestions } from '../utils/shuffle.js';

class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = 0;
        this.startTime = 0;
        this._listeners = {};
    }

    // === Event System ===
    on(event, callback) {
        (this._listeners[event] ||= []).push(callback);
    }

    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }

    /**
     * Create and start a new quiz
     */
    createQuiz(datasets, selectedDatasetIds, questionTypes, duration) {
        const selectedDatasets = datasets.filter(d => selectedDatasetIds.includes(d.id));
        const questions = QuestionFactory.createQuestions(selectedDatasets, questionTypes);

        // Shuffle choices in questions
        const shuffledQuestions = shuffleChoicesInQuestions(questions);

        this.currentQuiz = {
            questions: shuffledQuestions,
            duration: duration * 60,
            startTime: Date.now()
        };

        this.reset();
        this.emit('quizCreated', this.currentQuiz);
        
        return this.currentQuiz;
    }

    /**
     * Reset quiz state
     */
    reset() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = this.currentQuiz.duration;
        this.startTime = Date.now();
    }

    /**
     * Navigate to question
     */
    goToQuestion(index) {
        if (index >= 0 && index < this.currentQuiz.questions.length) {
            this.currentQuestionIndex = index;
            this.emit('questionChanged', index);
        }
    }

    /**
     * Navigate to next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.emit('questionChanged', this.currentQuestionIndex);
        }
    }

    /**
     * Navigate to previous question
     */
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.emit('questionChanged', this.currentQuestionIndex);
        }
    }

    /**
     * Save user answer for current question
     */
    saveAnswer(answer) {
        this.userAnswers[this.currentQuestionIndex] = answer;
        this.emit('answerSaved', {
            questionIndex: this.currentQuestionIndex,
            answer: answer
        });
    }

    /**
     * Get user answer for a question
     */
    getAnswer(index) {
        return this.userAnswers[index];
    }

    /**
     * Update timer
     */
    updateTimer(seconds) {
        this.timeRemaining = seconds;
        this.emit('timerUpdated', seconds);
    }

    /**
     * Submit quiz and calculate results
     */
    submitQuiz() {
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        console.log(timeSpent);
        let correctCount = 0;
        let totalScore = 0;
        const results = this.currentQuiz.questions.map((questionData, i) => {
            const question = QuestionFactory.createInstance(questionData);
            const userAnswer = this.userAnswers[i]?.value ?? undefined;
            const result = question.checkAnswer(userAnswer);

            if (result.isCorrect) {
                correctCount++;
            }
            totalScore += result.points;

            return {
                question: questionData,
                userAnswer: userAnswer,
                isCorrect: result.isCorrect,
                points: result.points
            };
        });
        
        const finalResults = {
            results: results,
            totalScore: totalScore,
            correctCount: correctCount,
            incorrectCount: results.length - correctCount,
            totalQuestions: results.length,
            timeSpent: timeSpent
        };

        this.emit('quizSubmitted', finalResults);
        return finalResults;
    }

    /**
     * Retry current quiz (reshuffle and reset)
     */
    retryQuiz() {
        if (!this.currentQuiz) return null;

        // Reshuffle choices
        this.currentQuiz.questions = shuffleChoicesInQuestions(this.currentQuiz.questions);
        
        // Reset state
        this.reset();
        return this.currentQuiz;
    }

    /**
     * Get current quiz state
     */
    getState() {
        return {
            quiz: this.currentQuiz,
            currentIndex: this.currentQuestionIndex,
            answers: this.userAnswers,
            timeRemaining: this.timeRemaining
        };
    }
}

export const quizManager = new QuizManager();