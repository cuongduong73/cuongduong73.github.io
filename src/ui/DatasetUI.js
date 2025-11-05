// ui/DatasetUI.js - Dataset table and details UI

import { datasetManager } from '../core/DatasetManager.js';
import { DATASET_TYPES } from '../types.js';
import { AlertUI } from './AlertUI.js';

export const DatasetUI = {
    async init() {
        await datasetManager.load();
        datasetManager.on('updated', (datasets) => {
            this.render(datasets);
        });
        this.render(datasetManager.getAll());
    },

    render(datasets) {
        const tbody = document.getElementById('datasetTableBody');
        
        if (datasets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> Chưa có bộ dữ liệu nào
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = datasets.map(dataset => `
            <tr>
                <td><strong>${dataset.name}</strong></td>
                <td><span class="badge bg-primary">${dataset.type}</span></td>
                <td>${dataset.cardCount} thẻ</td>
                <td>
                    <button class="btn btn-info btn-sm" data-action="detail" data-id="${dataset.id}">
                        <i class="fas fa-circle-info"></i>
                    </button>
                    <button class="btn btn-info btn-sm" data-action="view" data-id="${dataset.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${dataset.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Note: Event binding is now handled in events.js by bindDatasetTableEvents()
        // this.bindTableEvents();
    },

    showDetail(id) {
        const datasets = datasetManager.getAll();
        const dataset = datasets.find(d => d.id === parseInt(id));
        if (!dataset) return;

        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        const content = document.getElementById('detailContent');
        
        content.innerHTML = `
            <table class="table table-bordered">
                <tr><th>Tên:</th><td>${dataset.name}</td></tr>
                <tr><th>Loại:</th><td><span class="badge bg-primary">${dataset.type}</span></td></tr>
                <tr><th>Deck:</th><td>${dataset.deck}</td></tr>
                <tr><th>Note Type:</th><td>${dataset.noteType}</td></tr>
                <tr><th>Tags:</th><td>${dataset.tags.length > 0 ? dataset.tags.join(', ') : 'Tất cả'}</td></tr>
                <tr><th>Số lượng thẻ:</th><td>${dataset.cardCount}</td></tr>
                <tr><th>Ngày tạo:</th><td>${new Date(dataset.createdAt).toLocaleString('vi-VN')}</td></tr>
            </table>
        `;
        
        modal.show();
    },

    viewCards(id) {
        const datasets = datasetManager.getAll();
        const dataset = datasets.find(d => d.id === parseInt(id));
        if (!dataset) return;

        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        const content = document.getElementById('detailContent');

        let html = `
            <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-bordered table-hover">
                    <thead class="table-light sticky-top">
                        <tr><th>Question</th><th>Answer</th></tr>
                    </thead>
                    <tbody>
        `;

        dataset.notesInfo.forEach(card => {
            const answer = dataset.type === DATASET_TYPES.TRUE_FALSE_STATEMENT
                ? (card.answer === '1' ? 'Đúng' : 'Sai')
                : card.answer;
            html += `
                <tr>
                    <td class="text-truncate" style="max-width: 400px;">${card.question}</td>
                    <td>${answer}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        content.innerHTML = html;

        if (window.MathJax) {
            MathJax.typesetPromise([content]).catch(err => console.log('MathJax error:', err));
        }

        modal.show();
    },

    async deleteDataset(id) {
        AlertUI.confirm(
            '⚠️ Bạn có chắc chắn muốn xóa bộ dữ liệu này? Hành động này <u>không thể hoàn tác</u>!',
            async () => {
                try {
                    await datasetManager.delete(id);
                    setTimeout(() => {
                        AlertUI.success('Đã xóa bộ dữ liệu thành công!');
                    }, 350);
                } catch (error) {
                    setTimeout(() => {
                        AlertUI.error('Lỗi khi xóa dữ liệu: ' + error.message);
                    }, 350);
                }
            },
            () => {
                setTimeout(() => {
                    AlertUI.info('Đã hủy thao tác xóa.');
                }, 350);
            }
        );
    }
}