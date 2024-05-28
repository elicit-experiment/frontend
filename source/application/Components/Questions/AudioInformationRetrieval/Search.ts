import * as knockout from 'knockout';
import { AudioInformation } from 'Managers/Portal/Cockpit';
import Notification from 'Managers/Notification';
import DisposableComponent from 'Components/DisposableComponent';

type SearchResult = {
  Name: string;
  ChannelName: string;
  Start: string;
  IsSelected: ko.Computed<boolean>;
  Select: () => void;
};

export default class Search extends DisposableComponent {
  public ButtonLabel: string;

  public Query = knockout.observable('');
  public Results = knockout.observableArray<SearchResult>();
  public Selected = knockout.observable<SearchResult>();

  public HasSearched: ko.Computed<boolean>;

  constructor(searchButtonLabel: string) {
    super();
    this.ButtonLabel = searchButtonLabel;

    this.HasSearched = this.PureComputed(() => this.Results().length != 0);
  }

  public Search(): void {
    AudioInformation.Search().WithCallback((response) => {
      if (response.Error != null) {
        Notification.Error('Failed to search: ' + response.Error.Message);
        return;
      }
      console.log(response.Body.Results[0]);
      this.Results.push(...response.Body.Results.map((r) => this.CreateSearchResult(r)));
    });
  }

  private CreateSearchResult(result: any): SearchResult {
    const item: SearchResult = {
      Name: result.Metadata.ProgrammeName.Value,
      ChannelName: result.Metadata.ChannelHeaderLabel.Value,
      Start: result.Metadata.PublicationStartTime.Value,
      IsSelected: null,
      Select: null,
    };

    item.IsSelected = this.PureComputed(() => this.Selected() == item);
    item.Select = () => this.Selected(item);
    return item;
  }
}
