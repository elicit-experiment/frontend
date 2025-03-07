import * as knockout from 'knockout';
import QuestionModel from 'Models/Question';
import QuestionBase from 'Components/Questions/QuestionBase';
import WayfAuthenticator from 'Components/Questions/AudioInformationRetrieval/WayfAuthenticator';
import Search from 'Components/Questions/AudioInformationRetrieval/Search';
import TimeLine from 'Components/Questions/AudioInformationRetrieval/TimeLine';
import Rating from 'Components/Questions/AudioInformationRetrieval/Rating';
import Audio from 'Utility/Audio';

type Selection = { Identifier: string };

class AudioInformationRetrieval extends QuestionBase<{ Selections: Selection[] }> {
  public SearchViewHeader: string;

  public Search: Search;
  public TimeLine: TimeLine;
  public Rating: Rating;

  public HasSelected: ko.Computed<boolean>;

  public IsLoginReady: ko.Observable<boolean>;
  public IsAuthenticated: ko.Observable<boolean>;
  public CanLogin: ko.Observable<boolean>;
  private _wayfAuthenticator: WayfAuthenticator;

  public Position: ko.Computed<number>;
  private _audio = knockout.observable<Audio>();

  constructor(question: QuestionModel) {
    super(question);

    this.InitializeWayf();

    const searchView = this.GetInstrument('SearchView');

    this.SearchViewHeader = searchView['Header']['Label'];
    this.Search = new Search(searchView['Button']['Label']);
    this.TimeLine = new TimeLine();
    this.Rating = new Rating();

    this.Position = this.PureComputed(() => (this._audio() != null ? this._audio().Position() : 0));
    this.TimeLine.Length = this.PureComputed(() => (this._audio() != null ? this._audio().Duration() : 1));
    this.TimeLine.Position = this.Position;
    this.HasSelected = this.PureComputed(() => this.Search.Selected() != null);

    this.Subscribe(this.Search.Selected, (s) => this.LoadAudio('f091ae97-3360-4a25-bc9d-ec05df6924a5'));
  }

  private InitializeWayf(): void {
    this._wayfAuthenticator = new WayfAuthenticator();

    this.IsLoginReady = this._wayfAuthenticator.IsReady;
    this.IsAuthenticated = this._wayfAuthenticator.IsAuthenticated;
    this._wayfAuthenticator.CanLogin.subscribe((canLogin) => this.CanLogin(canLogin));
  }

  public Login(): void {
    this._wayfAuthenticator.Login();
  }

  private LoadAudio(assetGuid: string): void {
    this._wayfAuthenticator.GetAsset(assetGuid, (asset) => {
      this._audio(new Audio(asset.Files[0].Destinations[0].Url));
      this._audio().Volume(10);

      this.AddAction(this._audio().IsReady, () => {
        this.TimeLine.Initialize();
        this._audio().Play();
      });
    });
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'AudioInformationRetrieval', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/AudioInformationRetrieval/AudioInformationRetrieval.html';
knockout.components.register('Questions/AudioInformationRetrieval', {
  viewModel: AudioInformationRetrieval,
  template,
});

export default AudioInformationRetrieval;
