// src/utils/metrics.ts

interface Metrics {
  [key: string]: number;
}

class MetricsStore {
  private metrics: Metrics = {};
  private startTime = Date.now();

  increment(key: string): void {
    this.metrics[key] = (this.metrics[key] || 0) + 1;
  }

  get(key: string): number {
    return this.metrics[key] || 0;
  }

  getAll(): Metrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  reset(): void {
    this.metrics = {};
    this.startTime = Date.now();
  }
}

export const metrics = new MetricsStore();

