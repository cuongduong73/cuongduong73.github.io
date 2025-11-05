// quiz/QuizTimer.js - Quiz timer management

export class QuizTimer {
    constructor(duration, onTick, onExpire) {
        this.duration = duration;
        this.timeRemaining = duration;
        this.onTick = onTick;
        this.onExpire = onExpire;
        this.interval = null;
    }

    start() {
        this.timeRemaining = this.duration;
        this.onTick(this.timeRemaining);

        this.interval = setInterval(() => {
            this.timeRemaining--;
            this.onTick(this.timeRemaining);

            if (this.timeRemaining <= 0) {
                this.stop();
                this.onExpire();
            }
        }, 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    pause() {
        this.stop();
    }

    resume() {
        if (!this.interval && this.timeRemaining > 0) {
            this.interval = setInterval(() => {
                this.timeRemaining--;
                this.onTick(this.timeRemaining);

                if (this.timeRemaining <= 0) {
                    this.stop();
                    this.onExpire();
                }
            }, 1000);
        }
    }

    getTimeRemaining() {
        return this.timeRemaining;
    }
}