// TrueFalseStatementParser.js
import { BaseParser } from './BaseParser.js';

export class TrueFalseStatementParser extends BaseParser {
    parse() {
        return this.notes
            .filter(note => note.fields?.Question && note.fields?.Answer)
            .map(note => ({
                id: note.noteId,
                question: this.fixImgSrc(note.fields.Question.value.trim()),
                answer: note.fields.Answer.value.trim(),
                extra: note.fields.Extra ? this.fixImgSrc(note.fields.Extra.value.trim()) : ''
            }));
    }
}
