// ui/ImportModalUI.js - Import modal UI management

import { DATASET_TYPES } from "../types.js";

export const ImportModalUI = {
    show() {
        const modal = new bootstrap.Modal(document.getElementById('importModal'));
        modal.show();
    },

    hide() {
        const modalEl = document.getElementById('importModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    },

    reset() {
        document.getElementById('onlyStudiedCheck').checked = false;
        document.getElementById('datasetType').selectedIndex = 0;
    },

    showLoading() {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('importForm').style.display = 'none';
        document.getElementById('saveDatasetBtn').style.display = 'none';
    },

    showForm() {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('importForm').style.display = 'block';
        document.getElementById('saveDatasetBtn').style.display = 'block';
    },

    fillSelect(selectId, items, defaultText = null) {
        const select = document.getElementById(selectId);
        
        if (defaultText) {
            select.innerHTML = `<option value="">${defaultText}</option>`;
        } else {
            select.innerHTML = '';
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    },

    getImportFormData() {
        const tagsSelect = document.getElementById('tagsSelect');
        const selectedTags = Array.from(tagsSelect.selectedOptions).map(opt => opt.value);

        return {
            name: document.getElementById('datasetName').value.trim(),
            deck: document.getElementById('deckSelect').value,
            noteType: document.getElementById('noteTypeSelect').value,
            type: document.getElementById('datasetType').value,
            tags: selectedTags,
            onlyStudied: document.getElementById('onlyStudiedCheck').checked
        };
    },

    validateImportForm(formData) {
        if (!formData.name || !formData.deck || !formData.noteType || !formData.type) {
            throw new Error('Vui lòng điền đầy đủ thông tin!');
        }

        // Validation for Definition type
        if (formData.type === DATASET_TYPES.DEFINITION) {
            const keywordField = document.getElementById('keywordFieldSelect').value;
            const definitionField = document.getElementById('definitionFieldSelect').value;
            // const forwardQ = document.getElementById('forwardQuestionTemplate').value.trim();
            // const reverseQ = document.getElementById('reverseQuestionTemplate').value.trim();
            
            if (!keywordField || !definitionField) {
                throw new Error('Vui lòng chọn field cho Keyword và Definition!');
            }
            
            // if (!forwardQ && !reverseQ) {
            //     throw new Error('Vui lòng nhập ít nhất 1 loại câu hỏi (thuận hoặc nghịch)!');
            // }
        }
    }
}