// quiz/questions/MultipleChoiceQuestion.js

import { BaseQuestion } from './BaseQuestion.js';
import { shuffleArray } from '../../utils/shuffle.js';
import { QUESTION_TYPES } from '../../types.js';

export class MultipleChoiceQuestion extends BaseQuestion {
    static generate(cards, count, points) {
        const shuffled = shuffleArray(cards);
        const selected = shuffled.slice(0, count);

        return selected.map(card => ({
            type: QUESTION_TYPES.MULTIPLE_CHOICES,
            question: card.question,
            choices: card.choices,
            answer: BaseQuestion.getAnswerIndex(card.answer, card.choices.length),
            extra: card.extra,
            points: points,
            id: card.id
        }));
    }

    checkAnswer(userAnswer) {
        const isCorrect = userAnswer === this.data.answer;
        return {
            isCorrect: isCorrect,
            points: isCorrect ? this.data.points : 0
        };
    }

    render(index) {
        const q = this.data;
        return `
            <div class="question-card" data-index="${index}">
                <h4>Câu ${index + 1} <span class="badge bg-info">${q.points.toFixed(2)} điểm</span></h4>
                <div class="question-content mb-4">${q.question}</div>
                ${q.choices.map((choice, ci) => `
                    <button class="choice-btn" data-q="${index}" data-choice="${ci}">
                        ${String.fromCharCode(65 + ci)}. ${choice}
                    </button>
                `).join('')}
            </div>
        `;
    }
}