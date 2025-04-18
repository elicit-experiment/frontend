import * as knockout from 'knockout';
import Swal from 'sweetalert2';
import ExperimentManager from 'Managers/Portal/Experiment';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import MediaInfo from 'Components/Players/MediaInfo';

import type WebGazerManager from 'Managers/WebGazerManager';

class SoloStimulus extends QuestionBase<any> {
  public MediaLabel = '';
  public MediaInfo: MediaInfo = null;
  public HasMedia = true;
  public CanAnswer: ko.Observable<boolean> = knockout.observable(false);
  public Calibrating = false;
  public CalibrationElement: HTMLElement;
  public CalibrationPoints: Array<{ x: number; y: number }> = [];
  public Answer: ko.Observable<string> = knockout.observable<string>(null);
  public MediaComponentName = 'Players/Audio';
  public EventId = 'SoloStimulus';
  public CanStartPlaying: ko.Observable<boolean> = knockout.observable(true);
  public UsesWebGazer = false;
  private webgazerManager: WebGazerManager = null;

  protected _pointsSubscription: ko.Subscription;

  constructor(question: QuestionModel) {
    super(question, true);

    const stimulus = (this.GetComponent() as any).Stimuli[0];

    this.UsesWebGazer = stimulus.Type.indexOf('+webgazer') !== -1;

    if (this.UsesWebGazer) {
      import('Managers/WebGazerManager').then((webgazerImport) => {
        this.webgazerManager = webgazerImport.getInstance();

        if (!this.webgazerManager.Ready()) {
          this.InitWebgazer(this.webgazerManager);
        }

        this.InitWebgazerPoints(this.webgazerManager);
      });
    } else {
      this.InitNonWebgazer();
    }

    this.MediaComponentName = MediaInfo.MimeTypeToPlayerType[stimulus.Type];

    if (this.MediaComponentName == undefined) {
      console.error(`MediaComponentName unknown for ${stimulus.Type}`);
    }

    this.MediaLabel = this.GetFormatted(stimulus.Label);

    this.MediaInfo = MediaInfo.Create(stimulus, this.CanStartPlaying, this.MimeType(stimulus.Type));
    this.TrackMediaInfo(this.EventId, this.MediaInfo);

    this.HasMedia = true;

    this.CanAnswer.subscribe((v) => {
      if (!!v) {
        this.SetAnswer({ completed: v });
      }
    });

    const played = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
    if (played()) this.CanAnswer(true);
    else played.subscribe(() => this.CanAnswer(true));
  }

  private InitWebgazer(manager: WebGazerManager) {
    manager.Init().then(() => {
      //WebGazer.Restart(false);
      document.getElementsByTagName('body')[0].classList.remove('hide-webgazer-video');

      Swal.fire({
        title: 'Calibration',
        text: "Please ensure that your face is visible within the rectangle within the webcam video.  When you've positioned it correctly, the rectangle will turn green and a sketch of the detected face will appear.  Then click on each of the 4 points on the screen. You must click on each point a number times till it goes yellow. Please try to hold your head steady during the process.  This will calibrate your eye movements.",
        showCancelButton: false,
      }).then(() => {
        console.log('Starting calibration.');

        manager.StartCalibration();

        const player = document.getElementById('player');
        const playerBBox = player.getBoundingClientRect();
        const videoFeed = document.getElementById('webgazerVideoFeed');
        const videoBBox = videoFeed.getBoundingClientRect();
        const scale =
          Math.round(10.0 * Math.min(playerBBox.width / videoBBox.width, playerBBox.height / videoBBox.height)) / 10.0;
        const tx = Math.round(10.0 * (playerBBox.left + playerBBox.width / 2 - videoBBox.width / 2)) / 10.0;
        const ty = Math.round(10.0 * (playerBBox.top + playerBBox.height / 2 - videoBBox.height / 2)) / 10.0;
        const transform = `translate(${tx}px,${ty}px) scale(${scale})`;
        manager.VIDEO_ELEMENTS.map((id: string) => document.getElementById(id)).forEach(
          (el: HTMLElement) => (el.style.transform = transform),
        );
      });
      this.InitWebgazerPoints(manager);
    });
  }

  private InitWebgazerPoints(manager: WebGazerManager) {
    let pointIndex = 0;
    const points: Array<any> = [];
    this._pointsSubscription = manager.currentPoint.subscribe((v: any) => {
      pointIndex = pointIndex++ % 1000;

      let dataPoint;

      if (v.data && v.data.eyeFeatures) {
        if (this.Calibrating && !isNaN(v.data.x) && !isNaN(v.data.y)) {
          this.CalibrationPoints.push({ x: v.data.x, y: v.data.y });
          if (this.CalibrationPoints.length > 50) {
            this.CalibrationPoints.pop();
          }
        }
        const eyeFeatures = v.data.eyeFeatures;
        dataPoint = {
          x: v.data.x,
          y: v.data.y,
          clock_ms: v.clock_ms,
          timestamp: v.timestamp,
          left_image_x: eyeFeatures.left.imagex,
          left_image_y: eyeFeatures.left.imagey,
          left_width: eyeFeatures.left.width,
          left_height: eyeFeatures.left.height,
          right_image_x: eyeFeatures.right.imagex,
          right_image_y: eyeFeatures.right.imagey,
          right_width: eyeFeatures.right.width,
          right_height: eyeFeatures.right.height,
        };
      } else {
        dataPoint = {
          clock_ms: v.clock_ms,
          timestamp: v.timestamp,
        };
      }

      points.push(dataPoint);
    });
  }

  private InitNonWebgazer() {
    for (const pt of <HTMLElement[]>(<any>document.querySelectorAll('.video-calibration-point'))) {
      pt.style.display = 'none';
    }
    for (const instructions of <HTMLElement[]>(<any>document.querySelectorAll('.calibration-instructions'))) {
      instructions.style.display = 'none';
    }
    this.CanStartPlaying(true);
  }

  public SlideCompleted(): boolean {
    webgazer.showPredictionPoints(false);

    this._pointsSubscription && this._pointsSubscription.dispose();
    this._pointsSubscription = null;

    ExperimentManager.SlideTitle('');

    return false;
  }

  protected HasValidAnswer(answer: any): boolean {
    console.log(`HasValidAnswer: %o`, answer);
    return answer.completed;
  }

  public Calibrate(data: any, event: Event) {
    const element = event.currentTarget as HTMLElement;

    if (this.Calibrating && element != this.CalibrationElement) {
      return;
    }

    if (element.className.match(/\bpulsate\b/)) {
      const m = element.style.transform.match(/scale\(([0-9\.]+)\)/);
      const scale = parseFloat(m[1]);

      let deltaScale = -0.2;

      if (this.CalibrationPoints.length > 10) {
        console.dir(this.CalibrationPoints);
        const bounds = element.getBoundingClientRect();
        const target = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        };
        const accuracyPct = this.CalibrationPoints.map((c) => ({ dx: c.x - target.x, dy: c.y - target.y }))
          .map((e) => Math.sqrt(e.dx * e.dx + e.dy * e.dy) / window.innerHeight)
          .map((m) => 1.0 - (m > 1.0 ? 1.0 : m));
        const accuracyAvg = accuracyPct.reduce((l, r) => l + r, 0.0) / this.CalibrationPoints.length;

        console.log(`Accuracy Avg: ${accuracyAvg}`);
        deltaScale = -0.05 - 0.25 * accuracyAvg;
      }

      if (scale > 0.7) {
        element.style.transform = `scale(${scale + deltaScale})`;
        const h = 60 - 60 * ((scale - 0.7) / 1.3);
        element.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
        this.Calibrating = true;
        this.CalibrationElement = element;
      } else {
        this.Calibrating = false;
        this.CalibrationElement = null;
        this.CalibrationPoints = [];
        element.classList.add('calibrated');
        element.classList.remove('pulsate');
        element.style.transform = '';
        element.style.backgroundColor = '';

        const calibrationPoints = Array.prototype.slice.call(
          <Node[]>(<any>document.querySelectorAll('.video-calibration-point')),
        );
        const allCalibrated = calibrationPoints
          .map((element: HTMLElement) => !!element.className.match(/\bcalibrated\b/))
          .reduce((a: boolean, b: boolean) => a && b, true);
        console.log(`calibrated: ${allCalibrated}`);
        if (allCalibrated) {
          console.log('all calibrations complete');
          // TODO: refactor with calibration check in ctor
          (<HTMLElement>document.querySelector('.calibration-instructions')).style.display = 'none';

          this.webgazerManager.VIDEO_ELEMENTS.map((id: string) => document.getElementById(id)).forEach(
            (el: HTMLElement) => (el.style.display = 'none'),
          );

          this.webgazerManager.StartTracking();

          this.CanStartPlaying(true);
        }
      }
    } else if (element.className.match(/\bcalibrated\b/)) {
      return;
    } else {
      element.classList.add('pulsate');
      element.style.transform = `scale(2.0)`;
      element.style.backgroundColor = `hsl(0, 100%, 50%)`;
    }

    /*setTimeout( () =>  {
                this.SetAnswer({ Id: "foo" })
                console.log('set answer');
                WebGazer.end();
            }, 5000);
            */

    event.preventDefault();
  }

  public MimeType(type: string) {
    return type.replace('+webgazer', '');
  }

  public AddEvent(eventType: string, method = 'SoloStimulus', data = 'None'): void {
    if (!method || method !== '') {
      method = 'SoloStimulus';
    }
    super.AddRawEvent(eventType, this.MediaInfo.EventType(), 'Stimulus', method, data);
  }
}

import template from 'Components/Questions/SoloStimulus/SoloStimulus.html';

knockout.components.register('Questions/SoloStimulus', {
  viewModel: SoloStimulus,
  template,
});

export default SoloStimulus;
