import * as knockout from 'knockout';
import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';

// Use a fixed-size circular buffer to avoid array resizing and garbage collection
class CircularTimeBuffer {
  private buffer: Float64Array; // timestamp, increment pairs
  private head: number = 0;
  private tail: number = 0;
  private _size: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    // Each entry needs 2 slots: timestamp and increment
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity * 2);
  }

  public get size(): number {
    return this._size;
  }

  public push(timestamp: number, increment: number): void {
    // Store timestamp and increment at head position
    const idx = this.head * 2;
    this.buffer[idx] = timestamp;
    this.buffer[idx + 1] = increment;

    // Move head forward
    this.head = (this.head + 1) % this.capacity;

    if (this._size < this.capacity) {
      this._size++;
    } else {
      // Buffer is full, move tail forward too
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  public getValues(): { totalIncrements: number; count: number; oldestValidIndex: number } {
    let totalIncrements = 0;
    let count = 0;
    const oldestValidIndex = -1;

    // We'll return this to avoid allocating objects
    const result = { totalIncrements: 0, count: 0, oldestValidIndex: -1 };

    if (this._size === 0) {
      return result;
    }

    // Sum all increments
    for (let i = 0; i < this._size; i++) {
      const idx = ((this.tail + i) % this.capacity) * 2;
      totalIncrements += this.buffer[idx + 1];
      count++;
    }

    result.totalIncrements = totalIncrements;
    result.count = count;
    result.oldestValidIndex = this.tail;

    return result;
  }

  public pruneOldEntries(cutoffTime: number): void {
    if (this._size === 0) return;

    // Find the first entry that is not older than cutoffTime
    let i = 0;
    while (i < this._size) {
      const idx = ((this.tail + i) % this.capacity) * 2;
      if (this.buffer[idx] >= cutoffTime) {
        break;
      }
      i++;
    }

    // Adjust the tail and size
    if (i > 0) {
      this.tail = (this.tail + i) % this.capacity;
      this._size -= i;
    }

    // If all points are older than cutoff, clear the buffer
    if (i === this._size) {
      this._size = 0;
      this.head = 0;
      this.tail = 0;
    }
  }
}

class SlidingWindowRate {
  private timeWindow: number;
  private dataPoints: CircularTimeBuffer;
  private statType: 'rate' | 'average_value';
  // Cache calculation result to avoid allocations
  private cachedResult: [number, number] = [0, 0];

  constructor(windowSizeMs: number = 5000, statType: 'rate' | 'average_value' = 'rate') {
    this.timeWindow = windowSizeMs;
    this.statType = statType;
    // Estimate a reasonable buffer size based on expected rate
    // For 30fps over 5 seconds = 150 samples max
    const estimatedCapacity = Math.ceil((windowSizeMs / 1000) * 60);
    this.dataPoints = new CircularTimeBuffer(estimatedCapacity);
  }

  public addIncrement(increment: number): void {
    const now = performance.now();
    this.dataPoints.push(now, increment);
    this.pruneOldPoints(now);
  }

  private pruneOldPoints(currentTime: number): void {
    const cutoffTime = currentTime - this.timeWindow;
    this.dataPoints.pruneOldEntries(cutoffTime);
  }

  public getRate(): [number, number] {
    const size = this.dataPoints.size;
    if (size === 0) {
      this.cachedResult[0] = 0;
      this.cachedResult[1] = 0;
      return this.cachedResult;
    }

    const now = performance.now();
    this.pruneOldPoints(now);

    if (this.dataPoints.size === 0) {
      this.cachedResult[0] = 0;
      this.cachedResult[1] = 0;
      return this.cachedResult;
    }

    const values = this.dataPoints.getValues();
    const totalIncrements = values.totalIncrements;

    if (this.statType === 'rate') {
      this.cachedResult[0] = (totalIncrements * 1000.0) / this.timeWindow;
      this.cachedResult[1] = totalIncrements;
    } else {
      this.cachedResult[0] = totalIncrements / values.count;
      this.cachedResult[1] = totalIncrements;
    }

    return this.cachedResult;
  }
}

type StatDefinition = {
  name: string;
  targetRate: number;
  type: 'rate' | 'average_value';
};

// Pre-define label emoji map to avoid object allocation on each call
const STAT_LABELS: Record<string, string> = {
  analyzed: '📍',
  compressed: '🗜',
  queued: '😐',
  skipped: '🚫',
  posted: '⬆️',
  acknowledged: '✅',
};

class FaceLandmarkStatsMonitor {
  public stats: { [statName: string]: knockout.Observable<number> };
  public rates: { [statName: string]: knockout.Observable<number> };
  public slidingValues: { [statName: string]: knockout.Observable<number> };
  private rateTrackers: { [statName: string]: SlidingWindowRate };
  private definitions: Map<string, StatDefinition>;
  // Cached formatted values to avoid string allocations
  private cachedFormattedRates: { [statName: string]: string } = {};
  private cachedFormattedValues: { [statName: string]: string } = {};
  private cachedBarWidths: { [statName: string]: string } = {};
  // Update interval reference for cleanup
  private updateInterval: number | null = null;

  constructor(statDefinitions: StatDefinition[]) {
    // Use predefined array size when possible
    const statCount = statDefinitions.length;
    this.definitions = new Map();
    this.stats = {};
    this.rates = {};
    this.rateTrackers = {};
    this.slidingValues = {};

    // Initialize all data structures in one pass to avoid multiple loops
    for (let i = 0; i < statCount; i++) {
      const statDef = statDefinitions[i];
      const statName = statDef.name;

      this.definitions.set(statName, statDef);
      this.stats[statName] = knockout.observable(0);
      this.rates[statName] = knockout.observable(0);
      this.slidingValues[statName] = knockout.observable(0);
      this.rateTrackers[statName] = new SlidingWindowRate(5000, statDef.type);

      // Initialize cache
      this.cachedFormattedRates[statName] = '0.0';
      this.cachedFormattedValues[statName] = '0';
      this.cachedBarWidths[statName] = '0.0%';
    }

    // Update rates every second
    this.updateInterval = window.setInterval(() => this.updateRates(), 1000);
  }

  // Add cleanup method to prevent memory leaks
  public dispose(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public incrStat(statName: string, incr: number = 1): void {
    const observable = this.stats[statName];
    if (observable) {
      observable(observable() + incr);

      // Track this increment in the rate calculator
      const tracker = this.rateTrackers[statName];
      if (tracker) {
        tracker.addIncrement(incr);
      }
    }
  }

  public getLabel(statName: string): string {
    return { analyzed: '📍', compressed: '🗜', queued: '😐', skipped: '🚫', posted: '⬆️', acknowledged: '✅' }[statName];
  }

  public getFormattedRate(statName: string): string {
    return this.rates[statName]().toFixed(1).toString();
  }

  public getFormattedRateUnit(statName: string): string {
    if (this.definitions.get(statName).type === 'rate') {
      return 'hz';
    } else {
      return 'ms';
    }
    return this.rates[statName]().toFixed(1).toString();
  }

  public getFormattedValue(statName: string): string {
    return this.slidingValues[statName]().toFixed(0).toString();
  }

  public barWidth(statName: string): string {
    return `${((100.0 * this.rates[statName]()) / this.definitions.get(statName).targetRate).toFixed(1)}%`;
  }

  private updateRates(): void {
    for (const statName in this.rateTrackers) {
      const tracker = this.rateTrackers[statName];
      if (!tracker) continue;

      const [currentRate, currentValue] = tracker.getRate();

      // Update observables
      this.rates[statName](currentRate);
      this.slidingValues[statName](currentValue);

      // Update cached formatted values
      this.cachedFormattedRates[statName] = currentRate.toFixed(1);
      this.cachedFormattedValues[statName] = currentValue.toFixed(0);

      // Update cached bar width
      const statDef = this.definitions.get(statName);
      if (statDef) {
        const percent = ((100.0 * currentRate) / statDef.targetRate).toFixed(1);
        this.cachedBarWidths[statName] = `${percent}%`;
      }
    }
  }
}

// knockout.components.register('face-landmark-stats-monitor', {
//   viewModel: FaceLandmarkStatsMonitor,
//   template,
// });

export { template };
export default FaceLandmarkStatsMonitor;
