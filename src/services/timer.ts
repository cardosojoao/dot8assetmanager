export class TimerManager {
    private timers = new Map<string, number>();

    start(label: string) {
        this.timers.set(label, performance.now());
    }

    end(label: string): number {
        const start = this.timers.get(label);
        if (!start) return -1;

        const duration = performance.now() - start;
        this.timers.delete(label);
        return duration;
    }
}