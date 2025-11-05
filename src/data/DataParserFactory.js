// DataParserFactory.js
import { DATASET_TYPES } from '../types.js';
import { TrueFalseStatementParser } from './parsers/TrueFalseStatementParser.js';
import { TrueFalseParser } from './parsers/TrueFalseParser.js';
import { MultipleChoiceParser } from './parsers/MultipleChoiceParser.js';
import { ShortAnswerParser } from './parsers/ShortAnswerParser.js';
import { DefinitionParser } from './parsers/DefinitionParser.js';
import { BaseParser } from './parsers/BaseParser.js';

export const DataParserFactory = {
    create(type, notes) {
        switch (type) {
            case DATASET_TYPES.TRUE_FALSE_STATEMENT:
                return new TrueFalseStatementParser(notes);
            case DATASET_TYPES.MULTIPLE_CHOICES:
                return new MultipleChoiceParser(notes);
            case DATASET_TYPES.TRUE_FALSE:
                return new TrueFalseParser(notes);
            case DATASET_TYPES.SHORT_ANSWER:
                return new ShortAnswerParser(notes);
            case DATASET_TYPES.DEFINITION: {
                const keyword = document.getElementById('keywordFieldSelect').value;
                const definition = document.getElementById('definitionFieldSelect').value;
                return new DefinitionParser(notes, keyword, definition);
            }
            default:
                console.warn(`[DataParserFactory] Unknown dataset type: ${type}`);
                return new BaseParser(notes);
        }
    }
};
