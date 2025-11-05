// quiz/QuestionFactory.js - Factory for creating question instances

import { DATASET_TYPES } from '../types.js';
import { TrueFalseStatementQuestion, TrueFalseQuestion } from './questions/TrueFalseQuestion.js';
import { MultipleChoiceQuestion } from './questions/MultipleChoiceQuestion.js';
import { DefinitionQuestion } from './questions/DefinitionQuestion.js';
import { ShortAnswerQuestion } from './questions/ShortAnswerQuestion.js';

export class QuestionFactory {
    /**
     * Create question instances from datasets
     * @param {Array} datasets - Selected datasets
     * @param {Object} questionTypes - Question type configurations
     * @returns {Array} Array of question objects
     */
    static createQuestions(datasets, questionTypes) {
        const allQuestions = [];

        for (const [type, config] of Object.entries(questionTypes)) {
            const relevantDatasets = datasets.filter(d => d.type === type);
            if (relevantDatasets.length === 0) continue;

            const allCards = relevantDatasets.flatMap(d => 
                d.notesInfo.map(card => ({ ...card, type }))
            );

            const questions = this.generateQuestionsByType(
                type, 
                allCards, 
                config, 
                relevantDatasets[0]
            );

            allQuestions.push(...questions);
        }

        return allQuestions;
    }

    /**
     * Generate questions based on type
     */
    static generateQuestionsByType(type, cards, config, dataset) {
        switch (type) {
            case DATASET_TYPES.TRUE_FALSE_STATEMENT:
                return TrueFalseStatementQuestion.generate(
                    cards, 
                    config.count, 
                    config.points
                );

            case DATASET_TYPES.MULTIPLE_CHOICES:
                return MultipleChoiceQuestion.generate(
                    cards, 
                    config.count, 
                    config.points
                );

            case DATASET_TYPES.TRUE_FALSE:
                return TrueFalseQuestion.generate(
                    cards, 
                    config.count, 
                    config.points
                );

            case DATASET_TYPES.SHORT_ANSWER:
                return ShortAnswerQuestion.generate(
                    cards, 
                    config.count, 
                    config.points
                );

            case DATASET_TYPES.DEFINITION:
                return DefinitionQuestion.generate(
                    cards, 
                    config.count, 
                    config.points,
                    dataset
                );

            default:
                console.warn(`Unknown question type: ${type}`);
                return [];
        }
    }

    /**
     * Create question instance for rendering and checking
     */
    static createInstance(questionData) {
        const typeMap = {
            'True/False': TrueFalseQuestion,
            'Multiple Choices': MultipleChoiceQuestion,
            'Definition': DefinitionQuestion,
            'Short Answer': ShortAnswerQuestion
        };

        const QuestionClass = typeMap[questionData.type];
        if (!QuestionClass) {
            throw new Error(`Unknown question type: ${questionData.type}`);
        }

        return new QuestionClass(questionData);
    }
}