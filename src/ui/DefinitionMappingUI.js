// ui/DefinitionMappingUI.js - Definition field mapping UI

import { AnkiAPI } from '../core/api.js';

export const DefinitionMappingUI = {
    bindEvents() {
        // Show/hide definition mapping section
        document.getElementById('datasetType').addEventListener('change', async (e) => this.display(e.target.value));

        // Load fields when note type changes
        document.getElementById('noteTypeSelect').addEventListener('change', async (e) => {
            const datasetType = document.getElementById('datasetType').value;
            if (datasetType === 'Definition' && e.target.value) {
                await this.loadFieldsForNoteType(e.target.value);
            }
        });
        
        // Enable/disable forward question input
        document.getElementById('forwardQuestionCheck').addEventListener('change', (e) => {
            document.getElementById('forwardQuestionTemplate').disabled = !e.target.checked;
            if (!e.target.checked) {
                document.getElementById('forwardQuestionTemplate').value = '';
            }
        });
        
        // Enable/disable reverse question input
        document.getElementById('reverseQuestionCheck').addEventListener('change', (e) => {
            document.getElementById('reverseQuestionTemplate').disabled = !e.target.checked;
            if (!e.target.checked) {
                document.getElementById('reverseQuestionTemplate').value = '';
            }
        });
    },

    async display(value) {
        const definitionSection = document.getElementById('definitionMappingSection');
        const noteTypeSelect = document.getElementById('noteTypeSelect');
        
        if (value === 'Definition') {
            definitionSection.style.display = 'block';
            
            if (noteTypeSelect.value) {
                await this.loadFieldsForNoteType(noteTypeSelect.value);
            }
        } else {
            definitionSection.style.display = 'none';
        }
    },

    async loadFieldsForNoteType(noteType) {
        try {
            const fieldNames = await AnkiAPI.getFields(noteType);
            const keywordSelect = document.getElementById('keywordFieldSelect');
            const definitionSelect = document.getElementById('definitionFieldSelect');
            
            keywordSelect.innerHTML = '<option value="">-- Chọn field --</option>';
            definitionSelect.innerHTML = '<option value="">-- Chọn field --</option>';
            
            fieldNames.forEach(field => {
                keywordSelect.innerHTML += `<option value="${field}">${field}</option>`;
                definitionSelect.innerHTML += `<option value="${field}">${field}</option>`;
            });
        } catch (error) {
            console.error('Lỗi khi load fields:', error);
        }
    },
    reset() {
        document.getElementById('forwardQuestionCheck').checked = false;
        document.getElementById('reverseQuestionCheck').checked = false;
        document.getElementById('forwardQuestionTemplate').disabled = true;
        document.getElementById('reverseQuestionTemplate').disabled = true;
        document.getElementById('forwardQuestionTemplate').value = '';
        document.getElementById('reverseQuestionTemplate').value = '';
    },
}