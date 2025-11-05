// ui/QuizResultUI.js - Quiz results screen UI

import { QuizRenderer } from '../quiz/QuizRenderer.js';

export class QuizResultUI {
    constructor() {
        this.renderer = new QuizRenderer(
            document.getElementById('resultsContainer'),
            null
        );
    }

    show() {
        document.getElementById('quizTakingView').style.display = 'none';
        document.getElementById('quizResultView').style.display = 'block';
    }

    hide() {
        document.getElementById('quizResultView').style.display = 'none';
    }

    render(resultsData) {
        // Lưu kết quả gốc
        this.allResults = resultsData;
        this.currentFilter = 'all';
        
        // Reset active button
        document.querySelectorAll('#resultFilterButtons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        
        // Render tất cả
        this.renderer.renderResults(
            resultsData,
            document.getElementById('resultsContainer')
        );
    }

    // 🆕 Method filter kết quả
    filterResults(filter) {
        if (!this.allResults) return;
        
        this.currentFilter = filter;
        
        // Filter results dựa trên điều kiện
        let filteredData = { ...this.allResults };
        
        if (filter === 'all') {
            // Hiển thị tất cả
            filteredData.results = this.allResults.results;
            
            // Render không cần originalIndex
            this.renderer.renderResults(
                filteredData,
                document.getElementById('resultsContainer'),
                false
            );
        } else {
            // 🆕 Filter và thêm originalIndex
            if (filter === 'correct') {
                filteredData.results = this.allResults.results
                    .map((r, index) => ({ ...r, originalIndex: index }))
                    .filter(r => r.isCorrect);
            } else if (filter === 'incorrect') {
                filteredData.results = this.allResults.results
                    .map((r, index) => ({ ...r, originalIndex: index }))
                    .filter(r => 
                        !r.isCorrect && r.userAnswer !== undefined && r.userAnswer !== null
                    );
            } else if (filter === 'unanswered') {
                filteredData.results = this.allResults.results
                    .map((r, index) => ({ ...r, originalIndex: index }))
                    .filter(r => 
                        r.userAnswer === undefined || r.userAnswer === null || 
                        (Array.isArray(r.userAnswer) && r.userAnswer.length === 0)
                    );
            }
            
            // 🆕 Render với originalIndex flag = true
            this.renderer.renderResults(
                filteredData,
                document.getElementById('resultsContainer'),
                true // 🆕 sử dụng originalIndex
            );
        }
        
        // Update active button
        document.querySelectorAll('#resultFilterButtons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }
}