import * as knockout from 'knockout';
import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';

class FaceLandmarkStatsMonitor {
  public stats: { [statName: string]: knockout.Observable<number> };

  constructor(statNames: string[]) {
    this.stats = Object.fromEntries(statNames.map((statName) => [statName, knockout.observable(0)]));
  }

  public incrStat(statName: string, incr: number = 1) {
    this.stats[statName](this.stats[statName]() + incr);
  }
}

// knockout.components.register('face-landmark-stats-monitor', {
//   viewModel: FaceLandmarkStatsMonitor,
//   template,
// });

export { template };
export default FaceLandmarkStatsMonitor;
