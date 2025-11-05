// quiz/questions/BaseQuestion.js - Base class for all question types

export class BaseQuestion {
    constructor(data, config) {
        this.data = data;
        this.config = config;
        this.type = data.type;
    }

    /**
     * Generate question object from card data
     * Must be implemented by subclasses
     */
    generate() {
        throw new Error('generate() must be implemented by subclass');
    }

    /**
     * Check if user answer is correct
     * @param {*} userAnswer - User's answer
     * @returns {Object} { isCorrect: boolean, points: number }
     */
    checkAnswer(userAnswer) {
        throw new Error('checkAnswer() must be implemented by subclass');
    }

    /**
     * Render question HTML
     * @param {number} index - Question index
     * @returns {string} HTML string
     */
    render(index) {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Get answer index from various formats (A/B/C or 1/2/3)
     */
    static getAnswerIndex(answer, choicesCount) {
        const normalized = answer.trim().toLowerCase();
        const letters = ['a', 'b', 'c', 'd', 'e'];
        const idx = letters.indexOf(normalized);
        if (idx !== -1 && idx < choicesCount) return idx;

        const num = parseInt(normalized);
        if (!isNaN(num) && num >= 1 && num <= choicesCount) return num - 1;

        return 0;
    }

    /**
     * Parse multiple correct answers (abc or 123)
     */
    static parseCorrectAnswers(answer, choicesCount) {
        if (!answer || answer.trim() === '') return [];

        const normalized = answer.trim().toLowerCase();
        const letters = ['a', 'b', 'c', 'd', 'e'];
        const results = [];

        for (let char of normalized) {
            const idx = letters.indexOf(char);
            if (idx !== -1 && idx < choicesCount) {
                results.push(idx);
            }
        }

        if (results.length > 0) return results;

        for (let char of normalized) {
            const num = parseInt(char);
            if (!isNaN(num) && num >= 1 && num <= choicesCount) {
                results.push(num - 1);
            }
        }

        return results;
    }
}