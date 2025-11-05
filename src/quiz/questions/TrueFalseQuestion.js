// quiz/questions/TrueFalseQuestion.js

import { BaseQuestion } from './BaseQuestion.js';
import { shuffleArray } from '../../utils/shuffle.js';
import { QUESTION_TYPES } from '../../types.js';

const TF_STATEMENTS_PER_QUESTION = 4;

export class TrueFalseStatementQuestion extends BaseQuestion {
    static generate(cards, count, points) {
        const shuffled = shuffleArray(cards);
        const questions = [];

        for (let i = 0; i < count; i++) {
            const statements = [];
            for (let j = TF_STATEMENTS_PER_QUESTION * i;
                j < TF_STATEMENTS_PER_QUESTION * (i + 1) && j < shuffled.length;
                j++) {
                statements.push(shuffled[j]);
            }

            if (statements.length === TF_STATEMENTS_PER_QUESTION) {
                questions.push({
                    type: QUESTION_TYPES.TRUE_FALSE,
                    statements: statements,
                    points: points
                });
            }
        }

        return questions;
    }

    checkAnswer(userAnswer) {
        let numCorrect = this.data.statements.length;

        for (let si = 0; si < this.data.statements.length; si++) {
            if (!userAnswer || userAnswer[si] !== this.data.statements[si].answer) {
                numCorrect--;
            }
        }

        const totalStatements = this.data.statements.length;
        let points = 0;

        if (numCorrect === totalStatements) {
            points = this.data.points;
        } else if (numCorrect === totalStatements - 1 && numCorrect > 0) {
            points = this.data.points * 0.5;
        } else if (numCorrect === totalStatements - 2 && numCorrect > 0) {
            points = this.data.points * 0.25;
        } else if (numCorrect === totalStatements - 3 && numCorrect > 0) {
            points = this.data.points * 0.1;
        }

        return {
            isCorrect: numCorrect === totalStatements,
            points: points
        };
    }

    render(index) {
        const q = this.data;
        return `
            <div class="question-card" data-index="${index}">
                <h4>Câu ${index + 1} <span class="badge bg-info">${q.points.toFixed(2)} điểm</span></h4>
                <div class="question-content mb-3">${q.question || 'Các mệnh đề sau đây là đúng hay sai?'}</div>
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
}

export class TrueFalseQuestion extends BaseQuestion {
    static generate(cards, count, points) {
        const shuffled = shuffleArray(cards);
        const selected = shuffled.slice(0, count);

        return selected.map(card => {
            const correctAnswers = BaseQuestion.parseCorrectAnswers(
                card.answer,
                card.choices.length
            );

            const statements = card.choices.map((choice, idx) => ({
                question: choice,
                answer: correctAnswers.includes(idx) ? '1' : '0'
            }));

            return {
                type: QUESTION_TYPES.TRUE_FALSE,
                question: card.question,
                statements: statements,
                extra: card.extra,
                points: points,
                id: card.id
            };
        });
    }

    checkAnswer(userAnswer) {
        let numCorrect = this.data.statements.length;

        for (let si = 0; si < this.data.statements.length; si++) {
            if (!userAnswer || userAnswer[si] !== this.data.statements[si].answer) {
                numCorrect--;
            }
        }

        const totalStatements = this.data.statements.length;
        let points = 0;

        if (numCorrect === totalStatements) {
            points = this.data.points;
        } else if (numCorrect === totalStatements - 1 && numCorrect > 0) {
            points = this.data.points * 0.5;
        } else if (numCorrect === totalStatements - 2 && numCorrect > 0) {
            points = this.data.points * 0.25;
        } else if (numCorrect === totalStatements - 3 && numCorrect > 0) {
            points = this.data.points * 0.1;
        }

        return {
            isCorrect: numCorrect === totalStatements,
            points: points
        };
    }

    render(index) {
        return new TrueFalseStatementQuestion(this.data, this.config).render(index);
    }
}