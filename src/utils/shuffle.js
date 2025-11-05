// utils/shuffle.js - Utility functions for shuffling arrays

import { QUESTION_TYPES } from "../types.js";

export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export function shuffleChoicesInQuestions(questions) {
    return questions.map(q => {
        const newQ = { ...q };
        
        if ((newQ.type === QUESTION_TYPES.MULTIPLE_CHOICES || newQ.type === QUESTION_TYPES.DEFINITION) && 
            newQ.choices && newQ.choices.length > 0) {
            const correctAnswer = newQ.answer;
            const indices = newQ.choices.map((_, i) => i);
            const shuffledIndices = shuffleArray(indices);
            
            newQ.choices = shuffledIndices.map(i => newQ.choices[i]);
            newQ.answer = shuffledIndices.indexOf(correctAnswer);

            if (newQ.type === QUESTION_TYPES.DEFINITION) {
                newQ.cards = shuffledIndices.map(i => newQ.cards[i]);
            }
        }
        
        if (newQ.type === QUESTION_TYPES.TRUE_FALSE && newQ.statements && newQ.statements.length > 0) {
            newQ.statements = shuffleArray(newQ.statements);
        }
        
        return newQ;
    });
}