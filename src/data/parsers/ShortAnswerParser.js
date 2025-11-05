// ShortAnswerParser.js
import { BaseParser } from './BaseParser.js';

export class ShortAnswerParser extends BaseParser {
    parse() {
        return this.notes.map(note => {
            const question = note.fields?.Question?.value?.trim();
            const answer = note.fields?.Answer?.value?.trim();
            const hasChoices = note.fields['Choice 1'] && note.fields['Choice 1'].value.trim() !== '';
            if (!question || !answer || hasChoices) return null;

            return {
                id: note.noteId,
                question: this.fixImgSrc(question),
                answer,
                extra: note.fields.Extra ? this.fixImgSrc(note.fields.Extra.value.trim()) : ''
            };
        }).filter(Boolean);
    }
}
