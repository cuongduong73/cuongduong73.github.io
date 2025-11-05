// MultipleChoiceParser.js
import { BaseParser } from './BaseParser.js';

export class MultipleChoiceParser extends BaseParser {
    parse() {
        return this.notes.map(note => {
            const question = note.fields?.Question?.value?.trim();
            const answer = note.fields?.Answer?.value?.trim();
            const hasChoices = note.fields['Choice 1'] && note.fields['Choice 1'].value.trim() !== '';
            if (!question || !answer || !hasChoices) return null;

            const choices = [];
            for (let i = 1; i <= 5; i++) {
                const c = note.fields[`Choice ${i}`];
                if (c?.value?.trim()) choices.push(this.fixImgSrc(c.value.trim()));
            }

            return {
                id: note.noteId,
                question: this.fixImgSrc(question),
                choices,
                answer,
                extra: note.fields.Extra ? this.fixImgSrc(note.fields.Extra.value.trim()) : ''
            };
        }).filter(Boolean);
    }
}
