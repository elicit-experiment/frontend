import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import AudioInfo from 'Components/Players/Audio/AudioInfo';

type ItemInfo = {
  Id: string;
  UniqueId: string;
  Label: string;
  AudioInfo: AudioInfo;
  HasStimulus: boolean;
  IsActive: boolean;
  IsSelected: ko.Computed<boolean>;
  ButtonElement: ko.Observable<HTMLElement>;
};
type Item = { Id: string; ChoiceButton: { Label: string; Selected: string; Active?: string }; Stimulus: IStimulus };

class KAcPS extends QuestionBase<{ Id: string }> {
  public Id: string;
  public HeaderLabel: string;
  public MediaLabel: string;
  public Items: ItemInfo[];
  public Answer: ko.Observable<string> = knockout.observable<string>(null);
  public CanAnswer: ko.Observable<boolean>;
  public HasNoStimulus: boolean;
  public MaxButtonWidth: ko.Computed<number>;

  private _hasActives: boolean;

  constructor(question: QuestionModel) {
    super(question);

    this.Id = this.Model.Id;
    this.HeaderLabel = this.GetInstrumentFormatted('HeaderLabel');

    this.Items = this.GetItems<Item, ItemInfo>((v) => this.CreateItemInfo(v));

    this.MaxButtonWidth = knockout.computed(() =>
      this.Items.map((i) => (i.ButtonElement() == null ? null : i.ButtonElement().offsetWidth)).reduce(
        (p, c) => (p == null || c == null ? null : Math.max(p, c)),
        0,
      ),
    );

    this.HasNoStimulus = this.Items.every((i) => !i.HasStimulus);
    this._hasActives = this.Items.some((i) => i.IsActive);

    /*
    this.CanAnswer = this.WhenAllHavePlayed(
      this.Items.map((i) => i.AudioInfo),
      true,
    );
*/

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe((v) => {
      this.AddEvent('Change', 'Mouse/Left/Down', v);
      this.SetAnswer({ Id: v });
    });
    this.CanAnswer.subscribe((v) => {
      if (v) this.UpdateIsAnswerValid();
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    return (!this._hasActives && this.CanAnswer()) || (answer.Id != undefined && true);
  }

  private CreateItemInfo(data: Item): ItemInfo {
    if (data.ChoiceButton.Selected === '1') this.Answer(data.Id);

    const audioInfo = AudioInfo.Create(data.Stimulus);
    /*
    if (audioInfo !== null) this.TrackAudioInfo(`/Instrument/Items/Item(Id=${data.Id})/Stimulus`, audioInfo);
*/
    const info = {
      Id: data.Id,
      UniqueId: this.Id + '_' + data.Id,
      Label: this.GetFormatted(data.ChoiceButton.Label),
      AudioInfo: audioInfo,
      IsSelected: knockout.computed(() => this.Answer() === data.Id),
      IsActive: data.ChoiceButton.Active == undefined || data.ChoiceButton.Active !== '0',
      HasStimulus: data.Stimulus !== null,
      ButtonElement: knockout.observable(null),
    };

    return info;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'KAcPs', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/KAcPS/KAcPS.html';
knockout.components.register('Questions/KAcPS', {
  viewModel: KAcPS,
  template,
});

export default KAcPS;
