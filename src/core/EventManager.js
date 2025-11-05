// EventManager.js
// ✅ Tối ưu: không bind trùng, clear chính xác callback, hỗ trợ selector và element

export const EventManager = {
    _groups: new Map(),

    /**
     * Gắn sự kiện vào phần tử hoặc selector
     * @param {string|Element} target - selector hoặc phần tử DOM
     * @param {string} event - tên sự kiện (click, change, ...)
     * @param {Function} handler - callback khi event được kích hoạt
     * @param {string} group - nhóm event (để clear dễ dàng)
     */
    bind(target, event, handler, group = 'default') {
        const element = (typeof target === 'string')
            ? document.querySelector(target)
            : target;

        if (!element) {
            console.warn(`⚠️ EventManager: Không tìm thấy phần tử '${target}'`);
            return;
        }

        // Tạo group nếu chưa tồn tại
        if (!this._groups.has(group)) {
            this._groups.set(group, []);
        }

        // Kiểm tra nếu event này đã tồn tại (tránh bind trùng)
        const existing = this._groups.get(group).find(
            e => e.element === element && e.event === event && e.handler === handler
        );
        if (existing) {
            // console.debug(`🔁 EventManager: event '${event}' đã tồn tại trong group '${group}', bỏ qua.`);
            return;
        }

        // Gắn event listener
        element.addEventListener(event, handler);

        // Lưu lại binding
        this._groups.get(group).push({ element, event, handler });
        // console.debug(`✅ EventManager: bind '${event}' -> [${group}]`);
    },

    /**
     * Gỡ tất cả listener trong group
     * @param {string} group - tên nhóm event
     */
    clear(group = 'default') {
        const bindings = this._groups.get(group);
        if (!bindings || bindings.length === 0) {
            // console.debug(`ℹ️ EventManager: không có listener nào trong group '${group}'`);
            return;
        }

        bindings.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (err) {
                console.warn(`⚠️ EventManager: lỗi khi gỡ '${event}' khỏi phần tử`, err);
            }
        });

        this._groups.delete(group);
        // console.log(`🧹 EventManager: đã clear ${bindings.length} listener(s) trong group '${group}'`);
    },

    /**
     * Gỡ toàn bộ listener của tất cả group
     */
    clearAll() {
        for (const group of this._groups.keys()) {
            this.clear(group);
        }
        this._groups.clear();
        // console.log('🧼 EventManager: cleared all event groups');
    },

    /**
     * Hiển thị toàn bộ event hiện tại (debug)
     */
    // debug() {
    //     console.table(
    //         Array.from(this._groups.entries()).flatMap(([group, events]) =>
    //             events.map(({ element, event }) => ({
    //                 group,
    //                 event,
    //                 element: element.id || element.className || element.tagName
    //             }))
    //         )
    //     );
    // }
};
