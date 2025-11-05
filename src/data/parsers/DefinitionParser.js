// DefinitionParser.js
import { BaseParser } from './BaseParser.js';

export class DefinitionParser extends BaseParser {
    constructor(notes, keywordField, definitionField) {
        super(notes);
        this.keywordField = keywordField;
        this.definitionField = definitionField;
    }

    parse() {
        return this.notes
            .filter(note => note.fields[this.keywordField] && note.fields[this.definitionField])
            .map(note => {
                const keyword = note.fields[this.keywordField].value.trim();
                const definition = note.fields[this.definitionField].value.trim();
                if (!keyword || !definition) return null;
                return {
                    id: note.noteId,
                    question: this.fixImgSrc(keyword),
                    answer: this.fixImgSrc(definition)
                };
            })
            .filter(Boolean);
    }
}
