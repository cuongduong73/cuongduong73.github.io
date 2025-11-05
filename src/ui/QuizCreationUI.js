// ui/QuizCreationUI.js - Quiz creation screen UI

export const QuizCreationUI = {
    show(datasets) {
        document.getElementById('mainView').style.display = 'none';
        document.getElementById('quizCreationView').style.display = 'block';

        this.renderDatasetSelection(datasets);
        this.updateQuestionTypeVisibility();
        // Note: Event binding is now handled in events.js by bindQuizCreationFormEvents()
        // this.bindEvents();
    },

    hide() {
        document.getElementById('quizCreationView').style.display = 'none';
        document.getElementById('mainView').style.display = 'block';
    },

    renderDatasetSelection(datasets) {
        const container = document.getElementById('datasetSelection');
        container.innerHTML = datasets.map(dataset => `
            <div class="form-check">
                <input class="form-check-input dataset-select" 
                    type="checkbox" 
                    data-type="${dataset.type}" 
                    value="${dataset.id}" 
                    id="ds${dataset.id}">
                <label class="form-check-label" for="ds${dataset.id}">
                    ${dataset.name} 
                    <span class="badge bg-secondary">${dataset.type}</span> 
                    (${dataset.cardCount} thẻ)
                </label>
            </div>
        `).join('');
    },

    updateQuestionTypeVisibility() {
        const selectedTypes = new Set();
        document.querySelectorAll('.dataset-select:checked').forEach(checkbox => {
            selectedTypes.add(checkbox.dataset.type);
        });

        document.querySelectorAll('.question-count').forEach(input => {
            const rowType = input.dataset.type;
            const row = input.closest('tr');
            
            if (selectedTypes.has(rowType)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
                input.value = 0;
                document.querySelector(`.question-points[data-type="${rowType}"]`).value = 0;
            }
        });

        this.updateTotalPoints();
    },

    updateTotalPoints() {
        let total = 0;
        document.querySelectorAll('.question-points').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        document.getElementById('totalPoints').textContent = total.toFixed(1);

        const validation = document.getElementById('pointsValidation');
        if (Math.abs(total - 10) < 0.01) {
            validation.className = 'alert alert-success';
        } else {
            validation.className = 'alert alert-warning';
        }
    },

    getFormData() {
        const duration = parseInt(document.getElementById('quizDuration').value);
        const selectedDatasets = Array.from(document.querySelectorAll('.dataset-select:checked'))
            .map(cb => parseInt(cb.value));

        const questionTypes = {};
        document.querySelectorAll('.question-count').forEach(input => {
            const type = input.dataset.type;
            const count = parseInt(input.value) || 0;
            const points = parseFloat(
                document.querySelector(`.question-points[data-type="${type}"]`).value
            ) || 0;
            
            if (count > 0) {
                questionTypes[type] = { count, points: points / count };
            }
        });

        return {
            duration,
            selectedDatasets,
            questionTypes
        };
    },

    validateForm(formData) {
        if (formData.selectedDatasets.length === 0) {
            throw new Error('Vui lòng chọn ít nhất một bộ dữ liệu!');
        }

        const totalPoints = parseFloat(document.getElementById('totalPoints').textContent);
        if (Math.abs(totalPoints - 10) > 0.01) {
            throw new Error('Tổng điểm phải bằng 10!');
        }

        if (Object.keys(formData.questionTypes).length === 0) {
            throw new Error('Vui lòng chọn ít nhất một loại câu hỏi!');
        }
    }
}