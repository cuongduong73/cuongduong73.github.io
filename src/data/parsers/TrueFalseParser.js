// TrueFalseParser.js
import { BaseParser } from './BaseParser.js';

export class TrueFalseParser extends BaseParser {
    parse() {
        return this.notes.map(note => {
            const question = note.fields?.Question?.value?.trim();
            const answer = note.fields?.Answer?.value?.trim();
            if (!question || !answer) return null;

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
