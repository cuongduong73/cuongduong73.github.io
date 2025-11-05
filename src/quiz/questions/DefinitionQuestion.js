// quiz/questions/DefinitionQuestion.js

import { BaseQuestion } from './BaseQuestion.js';
import { shuffleArray } from '../../utils/shuffle.js';

export class DefinitionQuestion extends BaseQuestion {
    static generate(cards, count, points, dataset) {
        if (!dataset.metadata) return [];

        const forwardTemplate = dataset.metadata.forwardQuestionTemplate;
        const reverseTemplate = dataset.metadata.reverseQuestionTemplate;
        
        const shuffled = shuffleArray(cards);
        const selectedCards = shuffled.slice(0, count * 4);
        const usedIndices = new Set();
        const questions = [];

        for (let i = 0; i < count; i++) {
            let availableCards = selectedCards.filter((_, idx) => !usedIndices.has(idx));
            
            if (availableCards.length < 4) break;
            
            const fourCards = shuffleArray(availableCards).slice(0, 4);
            const mainCardIndex = selectedCards.indexOf(fourCards[0]);
            usedIndices.add(mainCardIndex);
            
            const useForward = forwardTemplate && (!reverseTemplate || Math.random() < 0.5);
            
            let questionText, choices;
            if (useForward) {
                questionText = forwardTemplate.replace('{keyword}', `<b>${fourCards[0].question}</b>`);
                choices = fourCards.map(c => c.answer);
            } else {
                questionText = reverseTemplate.replace('{definition}', `<b>${fourCards[0].answer}</b>`);
                choices = fourCards.map(c => c.question);
            }
            
            questions.push({
                type: 'Definition',
                question: questionText,
                choices: choices,
                answer: 0,
                points: points,
                cards: fourCards,
                questionType: useForward ? 'forward' : 'reverse'
            });
        }

        return questions;
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