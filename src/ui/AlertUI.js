// ui/AlertUI.js - Alert/notification system

export const AlertUI = {
    container: null,

    ensureContainer(position) {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'alert-container';
            Object.assign(this.container.style, {
                position: 'fixed',
                zIndex: 1080,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxWidth: '400px',
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
            });

            // 🔹 Tùy vị trí
            switch (position) {
                case 'top-left':
                    this.container.style.top = '1rem';
                    this.container.style.left = '1.5rem';
                    this.container.style.alignItems = 'flex-start';
                    break;
                case 'bottom-left':
                    this.container.style.bottom = '1rem';
                    this.container.style.left = '1.5rem';
                    this.container.style.alignItems = 'flex-start';
                    break;
                case 'bottom-right':
                    this.container.style.bottom = '1rem';
                    this.container.style.right = '1.5rem';
                    this.container.style.alignItems = 'flex-end';
                    break;
                default: // top-right
                    this.container.style.top = '1rem';
                    this.container.style.right = '1.5rem';
                    this.container.style.alignItems = 'flex-end';
            }

            document.body.appendChild(this.container);
        }
    },

    getIcon(type) {
        const icons = {
            success: `<i class="fa-solid fa-circle-check text-success me-2"></i>`,
            danger: `<i class="fa-solid fa-circle-xmark text-danger me-2"></i>`,
            warning: `<i class="fa-solid fa-triangle-exclamation text-warning me-2"></i>`,
            info: `<i class="fa-solid fa-circle-info text-info me-2"></i>`
        };
        return icons[type] || '';
    },

    show(message, type = 'info', timeout = 4000, position = 'bottom-right') {
        this.ensureContainer(position);

        const icon = this.getIcon(type);
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} shadow border-0`;
        alert.style.position = 'relative';
        alert.style.pointerEvents = 'auto';
        alert.style.opacity = 0;
        alert.style.transform = 'translateY(20px)';
        alert.style.transition = 'all 0.35s ease';
        alert.style.width = '100%';
        alert.style.maxWidth = '380px';
        alert.innerHTML = `
            <button type="button" class="btn-close position-absolute top-0 end-0 m-2" aria-label="Close"></button>
            <div class="d-flex align-items-center pe-4">
                <span class="alert-icon me-2 d-flex align-items-center justify-content-center">
                    ${icon}
                </span>
                <div class="flex-grow-1">${message}</div>
            </div>
        `;

        this.container.appendChild(alert);

        // Hiệu ứng xuất hiện mượt
        requestAnimationFrame(() => {
            alert.style.opacity = 1;
            alert.style.transform = 'translateY(0)';
        });

        // Khi ẩn alert, giữ vị trí các alert khác mượt
        const removeAlert = () => {
            alert.style.opacity = 0;
            alert.style.transform = 'translateY(-15px)';
            alert.style.marginBottom = '-0.5rem'; // giữ stack không giật
            setTimeout(() => {
                alert.remove();
                this.reflowStack();
            }, 300);
        };

        alert.querySelector('.btn-close').addEventListener('click', removeAlert);

        if (timeout > 0) setTimeout(removeAlert, timeout);
    },

    // Khi alert cũ biến mất → dịch chuyển alert còn lại mượt
    reflowStack() {
        const alerts = this.container.querySelectorAll('.alert');
        alerts.forEach((el, i) => {
            el.style.transition = 'transform 0.3s ease';
            el.style.transform = `translateY(${i * 2}px)`; // nhẹ để tránh jump
            setTimeout(() => (el.style.transform = 'translateY(0)'), 150);
        });
    },

    // === Helper API giữ nguyên ===
    success(msg, timeout = 4000) { this.show(msg, 'success', timeout); },
    error(msg, timeout = 4000) { this.show(msg, 'danger', timeout); },
    warning(msg, timeout = 4000) { this.show(msg, 'warning', timeout); },
    info(msg, timeout = 4000) { this.show(msg, 'info', timeout); },

    // === Hộp xác nhận đẹp ===
    confirm(message, onConfirm, onCancel) {
        this.ensureContainer();

        const alert = document.createElement('div');
        alert.className = 'alert alert-warning shadow border-0';
        alert.style.pointerEvents = 'auto';
        alert.style.position = 'relative';
        alert.style.opacity = 0;
        alert.style.transform = 'translateY(10px)';
        alert.style.transition = 'all 0.35s ease';
        alert.innerHTML = `
            <button type="button" class="btn-close position-absolute top-0 end-0 m-2" aria-label="Close"></button>
            <div class="fw-bold mb-1">
                <i class="fa-solid fa-triangle-exclamation text-warning me-2"></i>Xác nhận
            </div>
            <div>${message}</div>
            <div class="mt-3 d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-secondary">Hủy</button>
                <button class="btn btn-sm btn-primary">Xác nhận</button>
            </div>
        `;

        this.container.appendChild(alert);
        requestAnimationFrame(() => {
            alert.style.opacity = 1;
            alert.style.transform = 'translateY(0)';
        });

        const [cancelBtn, confirmBtn] = alert.querySelectorAll('button.btn');
        const closeBtn = alert.querySelector('.btn-close');

        const removeAlert = () => {
            alert.style.opacity = 0;
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        };

        cancelBtn.addEventListener('click', () => {
            removeAlert();
            onCancel && onCancel();
        });
        confirmBtn.addEventListener('click', () => {
            removeAlert();
            onConfirm && onConfirm();
        });
        closeBtn.addEventListener('click', removeAlert);
    }
};
