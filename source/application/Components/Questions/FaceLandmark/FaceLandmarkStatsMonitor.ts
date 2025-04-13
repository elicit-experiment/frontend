import * as knockout from 'knockout';
import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';

interface TimePoint {
  timestamp: number;
  increment: number;
}

class SlidingWindowRate {
  private timeWindow: number;
  private dataPoints: TimePoint[] = [];

  constructor(windowSizeMs: number = 5000) {
    this.timeWindow = windowSizeMs;
  }

  public addIncrement(increment: number): void {
    const now = performance.now();
    this.dataPoints.push({ timestamp: now, increment });
    this.pruneOldPoints(now);
  }

  private pruneOldPoints(currentTime: number): void {
    const cutoffTime = currentTime - this.timeWindow;
    const firstValidIndex = this.dataPoints.findIndex((point) => point.timestamp >= cutoffTime);

    if (firstValidIndex > 0) {
      this.dataPoints = this.dataPoints.slice(firstValidIndex);
    } else if (firstValidIndex === -1 && this.dataPoints.length > 0) {
      // All points are older than the window
      this.dataPoints = [];
    }
  }

  public getRate(): [number, number] {
    if (this.dataPoints.length === 0) return [0, 0];

    const now = performance.now();
    this.pruneOldPoints(now);

    if (this.dataPoints.length === 0) return [0, 0];

    const totalIncrements = this.dataPoints.reduce((sum, point) => sum + point.increment, 0);

    return [(totalIncrements * 1000.0) / this.timeWindow, totalIncrements];
  }
}

class FaceLandmarkStatsMonitor {
  public stats: { [statName: string]: knockout.Observable<number> };
  public rates: { [statName: string]: knockout.Observable<number> };
  public slidingValues: { [statName: string]: knockout.Observable<number> };
  private rateTrackers: { [statName: string]: SlidingWindowRate };
  private targetRate = 30;

  constructor(statNames: string[]) {
    this.stats = Object.fromEntries(statNames.map((statName) => [statName, knockout.observable(0)]));
    this.rates = Object.fromEntries(statNames.map((statName) => [statName, knockout.observable(0)]));
    this.rateTrackers = Object.fromEntries(statNames.map((statName) => [statName, new SlidingWindowRate(5000)]));
    this.slidingValues = Object.fromEntries(statNames.map((statName) => [statName, knockout.observable(0)]));

    // Update rates every second
    setInterval(() => this.updateRates(), 1000);
  }

  public incrStat(statName: string, incr: number = 1) {
    this.stats[statName](this.stats[statName]() + incr);

    // Track this increment in the rate calculator
    if (this.rateTrackers[statName]) {
      this.rateTrackers[statName].addIncrement(incr);
    }
  }

  public getLabel(statName: string): string {
    return { queued: '😐', skipped: '🚫', posted: '⬆️', acknowledged: '✅' }[statName];
  }

  public getFormattedRate(statName: string): string {
    return this.rates[statName]().toFixed(1).toString();
  }

  public getFormattedValue(statName: string): string {
    return this.slidingValues[statName]().toFixed(0).toString();
  }

  public barWidth(statName: string): string {
    return `${((100.0 * this.rates[statName]()) / this.targetRate).toFixed(1)}%`;
  }

  private updateRates(): void {
    for (const statName in this.rateTrackers) {
      const [currentRate, currentValue] = this.rateTrackers[statName].getRate();
      this.rates[statName](currentRate);
      this.slidingValues[statName](currentValue);
    }
  }
}

// knockout.components.register('face-landmark-stats-monitor', {
//   viewModel: FaceLandmarkStatsMonitor,
//   template,
// });

export { template };
export default FaceLandmarkStatsMonitor;
