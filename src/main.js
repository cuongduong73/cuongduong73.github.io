// main.js - Application entry point

import { setupEventHandlers } from './events.js';
import { DatasetUI } from './ui/index.js';
import { checkAnkiConnection } from './core/api.js';
import { storageManager } from './core/storage.js';

async function initApp() {
    try {
        // Initialize IndexedDB
        await storageManager.init();
        
        // Initialize Dataset UI
        await DatasetUI.init();
        
        // Setup all event handlers
        setupEventHandlers();
        
        // Check Anki connection
        await checkAnkiConnectionStatus();
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
}

async function checkAnkiConnectionStatus() {
    const statusDiv = document.getElementById('connectionStatus');
    const importBtn = document.getElementById('importBtn');

    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra kết nối...';
    statusDiv.className = 'alert alert-info';
    importBtn.disabled = true;

    try {
        const connected = await checkAnkiConnection();
        
        if (connected) {
            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Kết nối Anki thành công!';
            statusDiv.className = 'alert alert-success';
            importBtn.disabled = false;
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        statusDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            <strong>Không thể kết nối với Anki!</strong><br>
            <small>Đảm bảo Anki đang chạy và AnkiConnect đã được cài đặt</small>
            <br><br>
            <button class="btn btn-warning btn-sm mt-2" id="retryConnectionBtn">
                <i class="fas fa-redo"></i> Thử lại
            </button>
        `;
        statusDiv.className = 'alert alert-danger';
        importBtn.disabled = true;
        
        // Add retry button handler
        document.getElementById('retryConnectionBtn').addEventListener('click', checkAnkiConnectionStatus);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}