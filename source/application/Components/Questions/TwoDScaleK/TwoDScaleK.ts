import knockout = require('knockout');
import jquery = require('jquery');
import Highcharts = require('Highcharts'); //Highcharts;
import QuestionWithStimulusBase = require('Components/Questions/QuestionWithStimulusBase');
import QuestionModel = require('Models/Question');
import AudioInfo = require('Components/Players/Audio/AudioInfo');
import { KoComponent } from '../../../Utility/KoDecorators';

namespace XHighcharts {
  interface SeriesOptions {
    draggableX?: boolean;
    draggableY?: boolean;
  }
}

type Item = { Id: string; Name: string; AudioInfo: AudioInfo; GraphData: Highcharts.SeriesOptions };
type AnswerItem = { Id: string; Position: string };

@KoComponent({
  template: null,
  name: 'Questions/TwoDScaleK',
})
class TwoDScaleK extends QuestionWithStimulusBase<{ Scalings: AnswerItem[] }> {
  public Title: string;
  public ChartElement: KnockoutObservable<HTMLElement> = knockout.observable<HTMLElement>();
  public Items: Item[];

  private _chart: Highcharts.ChartObject;

  constructor(question: QuestionModel) {
    super(question);

    this.InitializeItems();

    this.Subscribe(this.ChartElement, (element) => this.InitializeChart());
  }

  private InitializeItems(): void {
    const answers: { [key: string]: { x: number; y: number } } = {};

    const answer = this.GetAnswer();

    if (answer.Scalings) {
      this.GetAnswer().Scalings.forEach((scaling: AnswerItem) => {
        const coordinates = scaling.Position.split(' ');
        answers[scaling.Id] = { x: parseFloat(coordinates[0]), y: parseFloat(coordinates[1]) };
      });
    }

    this.Items = (<any[]>this.GetInstrument('Items').Item).map((i) => this.CreateItem(i, answers[i.Id]));
  }

  private InitializeChart(): void {
    jquery(this.ChartElement()).highcharts({
      chart: {
        type: 'bubble',
        animation: false,
        showAxes: true,
      },
      title: {
        text: null,
      },
      credits: {
        enabled: false,
      },
      plotOptions: {
        series: {
          point: {
            events: {
              update: () => {
                this.UpdateAnswer();
                return true;
              },
            },
          },
        },
      },
      xAxis: {
        title: { text: this.GetInstrumentFormatted('X1AxisLabel') },
        min: -1,
        max: 1,
        lineWidth: 1,
        gridLineWidth: 1,
        showEmpty: true,
        tickInterval: 0.25,
        plotLines: [
          {
            value: 0,
            width: 2,
            color: 'black',
          },
        ],
        labels: { enabled: false },
      },
      yAxis: {
        title: { text: this.GetInstrumentFormatted('Y1AxisLabel') },
        min: -1,
        max: 1,
        lineWidth: 1,
        gridLineWidth: 1,
        showEmpty: true,
        tickInterval: 0.25,
        plotLines: [
          {
            value: 0,
            width: 2,
            color: 'black',
          },
        ],
        labels: { enabled: false },
      },
      tooltip: { enabled: false },
      series: this.Items.map((item) => item.GraphData).filter((data) => data != null),
    });
    this._chart = jquery(this.ChartElement()).highcharts();
  }

  protected HasValidAnswer(answer: any): boolean {
    if (!answer.Scalings) return false;

    return answer.Scalings.length == this.Items.length;
  }

  private UpdateAnswer(): void {
    this.SetAnswer({
      Scalings: this.Items.filter((i) => i.GraphData != null).map((i) => this.CreateAnswerItem(i)),
    });
  }

  private CreateAnswerItem(item: Item): AnswerItem {
    const point = <Highcharts.DataPoint>item.GraphData.data[0];

    return { Id: item.Id, Position: point.x.toString() + ' ' + point.y.toString() };
  }

  private CreateItem(data: any, answer: { x: number; y: number }): Item {
    const audioInfo = new AudioInfo([{ Type: data.Stimulus.Type, Source: data.Stimulus.URI }]);

    const item = {
      Id: data.Id,
      Name: this.GetFormatted(data.List.Label),
      AudioInfo: audioInfo,
      GraphData: answer ? this.CreateGraphItem(data, answer) : null,
    };

    audioInfo.AddIsPlayingCallback((isPlaying) => {
      this.AddEvent(isPlaying ? 'Start' : 'Stop', data.Id);

      if (isPlaying && item.GraphData == null) {
        item.GraphData = this.CreateGraphItem(data, { x: 0, y: 0 });

        this._chart.addSeries(item.GraphData);
      }
    });

    return item;
  }

  private CreateGraphItem(data: any, answer: { x: number; y: number }): Highcharts.SeriesOptions {
    return {
      name: data.List.Label,
      // @ts-ignore:TS2322
      draggableX: true,
      draggableY: true,
      cursor: 'pointer',
      data: [answer],
    };
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'TwoDScaleK', 'Instrument', method, data);
  }
}

export = TwoDScaleK;
