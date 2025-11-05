// quiz/questions/ShortAnswerQuestion.js

import { BaseQuestion } from './BaseQuestion.js';
import { shuffleArray } from '../../utils/shuffle.js';
import { QUESTION_TYPES } from '../../types.js';

export class ShortAnswerQuestion extends BaseQuestion {
    static generate(cards, count, points) {
        const shuffled = shuffleArray(cards);
        const selected = shuffled.slice(0, count);

        return selected.map(card => ({
            type: QUESTION_TYPES.SHORT_ANSWER,
            question: card.question,
            answer: card.answer,
            extra: card.extra,
            points: points,
            id: card.id
        }));
    }

    checkAnswer(userAnswer) {
        const isCorrect = userAnswer && 
            userAnswer.toLowerCase().trim() === this.data.answer.toLowerCase().trim();
        
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
                <textarea class="form-control" rows="4" data-q="${index}" 
                    placeholder="Nhập câu trả lời của bạn..."></textarea>
            </div>
        `;
    }
}