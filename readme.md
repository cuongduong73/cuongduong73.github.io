# Anki Quiz App - Refactored Structure

## 📁 Project Structure

```
src/
├── core/                      # Core business logic
│   ├── api.js                 # AnkiConnect API wrapper
│   ├── storage.js             # IndexedDB storage manager
│   ├── DatasetManager.js      # Dataset CRUD operations
│   └── QuizManager.js         # Quiz state & logic management
│
├── data/                      # Data parsing
│   └── parsers/
│       ├── BaseParser.js
│       ├── TrueFalseStatementParser.js
│       ├── TrueFalseParser.js
│       ├── MultipleChoiceParser.js
│       ├── ShortAnswerParser.js
│       ├── DefinitionParser.js
│       └── DataParserFactory.js
│
├── quiz/                      # Quiz-related modules
│   ├── questions/             # Question type implementations
│   │   ├── BaseQuestion.js
│   │   ├── TrueFalseQuestion.js
│   │   ├── MultipleChoiceQuestion.js
│   │   ├── DefinitionQuestion.js
│   │   └── ShortAnswerQuestion.js
│   ├── QuestionFactory.js     # Factory for creating questions
│   ├── QuizRenderer.js        # Quiz rendering logic
│   └── QuizTimer.js           # Timer management
│
├── ui/                        # UI components
│   ├── AlertUI.js             # Alert/notification system
│   ├── ImportModalUI.js       # Import modal management
│   ├── DatasetUI.js           # Dataset table UI
│   ├── QuizCreationUI.js      # Quiz creation screen
│   ├── QuizTakingUI.js        # Quiz taking screen
│   ├── QuizResultUI.js        # Quiz results screen
│   ├── DefinitionMappingUI.js # Definition field mapping
│   └── index.js               # UI exports
│
├── utils/                     # Utility functions
│   └── shuffle.js             # Array shuffling utilities
│
├── types.js                   # Type constants
├── events.js                  # Event handlers
└── main.js                    # Application entry point
```

## 🎯 Key Design Patterns

### 1. Factory Pattern
- **QuestionFactory**: Creates question instances based on type
- **DataParserFactory**: Creates parser instances for different dataset types

### 2. Strategy Pattern
- **BaseQuestion**: Base class with common interface
- Specific question types implement their own `generate()`, `checkAnswer()`, and `render()` methods

### 3. Observer Pattern
- **DatasetManager**: Emits events when datasets are updated
- **QuizManager**: Emits events for quiz state changes
- UI components listen and react to these events

### 4. Separation of Concerns
- **Core**: Business logic only, no UI code
- **UI**: Presentation only, delegates actions to core modules
- **Events**: Mediates between UI and core logic

## 🔄 Data Flow

```
User Action → Events → Core Logic → State Update → UI Update
     ↓                     ↓
  UI Component    →    Manager/API
```

### Example: Creating a Quiz

1. User clicks "Create Quiz" button
2. `events.js` → `QuizCreationUI.show()`
3. User fills form and submits
4. `events.js` → validates and calls `quizManager.createQuiz()`
5. `QuizManager` → uses `QuestionFactory` to generate questions
6. `QuizManager` → emits `quizCreated` event
7. `events.js` → calls `QuizTakingUI` to render quiz

## 📦 Module Responsibilities

### Core Modules
- **api.js**: All AnkiConnect communication
- **storage.js**: IndexedDB operations
- **DatasetManager.js**: Dataset CRUD with event emission
- **QuizManager.js**: Quiz state, navigation, scoring

### Quiz Modules
- **QuestionFactory.js**: Question creation logic
- **QuizRenderer.js**: HTML generation for questions
- **QuizTimer.js**: Countdown timer management
- **questions/*.js**: Type-specific question logic

### UI Modules
- Each UI file handles ONE screen/component
- No business logic in UI files
- UI only renders and captures user input
- Delegates all actions to event handlers

### Events
- **events.js**: Central event dispatcher
- Connects UI interactions to core logic
- Manages application flow

## 🚀 Usage

### In HTML file:
```html
<script type="module" src="main.js"></script>
```

### Extending with new question type:

1. Create `quiz/questions/NewQuestion.js`:
```javascript
import { BaseQuestion } from './BaseQuestion.js';

export class NewQuestion extends BaseQuestion {
    static generate(cards, count, points) { /* ... */ }
    checkAnswer(userAnswer) { /* ... */ }
    render(index) { /* ... */ }
}
```

2. Update `quiz/QuestionFactory.js`:
```javascript
import { NewQuestion } from './questions/NewQuestion.js';
// Add case in generateQuestionsByType()
```

3. Update `types.js` if needed

## ✅ Benefits of This Structure

1. **Maintainability**: Each module has single responsibility
2. **Testability**: Core logic separated from UI
3. **Scalability**: Easy to add new question types
4. **Reusability**: Modules can be reused in different contexts
5. **Debuggability**: Clear separation makes debugging easier

## 🔧 Migration from Old Code

Old monolithic `anki_api.js` has been split into:

- Quiz creation → `QuizManager.js` + `QuestionFactory.js`
- Rendering → `QuizRenderer.js` + `quiz/questions/*.js`
- UI handling → `ui/*.js`
- Events → `events.js`
- State management → `QuizManager.js` + `DatasetManager.js`