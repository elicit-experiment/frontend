import { IQuestion } from 'Managers/Portal/Cockpit';

class TestExperiment {
  public Slides: IQuestion[][];

  constructor() {
    //this.Slides = [[this.CreateAudioInformationRetrieval()]];
    this.Slides = [[this.CreateTaggingA()]];
  }

  public CreateTaggingA(): IQuestion {
    return this.CreateTagging('TaggingA');
  }

  public CreateTaggingB(): IQuestion {
    return this.CreateTagging('TaggingB');
  }

  private CreateTagging(componentName: string): IQuestion {
    return this.CreateStandardQuestion(
      componentName,
      {
        HeaderLabel: 'Tag that thing',
        SelectionTagBoxLabel: 'Selection Tags',
        UserTagBoxLabel: 'User Tags',
        TextField: 'Add your tags',
        SelectionTags: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => this.CreateTag(i.toString(), 'Tag ' + i, i)),
        UserTags: [1, 2, 3, 4, 5, 9].map((i) => this.CreateTag(i.toString(), 'User Tag ' + i, i)),
        Stimulus: {
          Type: 'audio/mpeg',
          URI:
            'https://s3.eu-central-1.amazonaws.com/762431201790b41bb9c979968535da52/system/140_item/resource/20151023/A4_wind10_S3.wav',
          Label: 'My stimulus',
        },
      },
      {
        Tags: [
          { Id: 1, Label: 'Test' },
          { Id: null, Label: 'Test' },
          { Id: 9, Label: 'Test' },
        ],
      },
    );
  }

  private CreateTag(id: string, label: string, position: number): { Id: string; Label: string; Position: number } {
    return {
      Id: id,
      Label: label,
      Position: position,
    };
  }

  public CreateAudioInformationRetrieval(): IQuestion {
    return this.CreateStandardQuestion('AudioInformationRetrieval', {
      SearchView: {
        Enabled: true,
        Header: {
          Label: 'Enter you custom query',
        },
        Button: {
          Label: 'Search',
        },
      },
      ItemListView: {},
      PlayerView: {},
      Data: {
        MetadataSchemas: {
          MetadataSchema: [],
        },
        Items: {
          Item: [],
        },
      },
    });
  }

  public CreateStandardQuestion(type: string, instruments: any, output: any = null): IQuestion {
    return this.CreateQuestion(
      new Date().getTime().toString(),
      type,
      [{ Events: {} }, { Instrument: instruments }],
      output,
      null,
    );
  }

  public CreateQuestion(id: string, type: string, input: any[], output: any, events: any[]): IQuestion {
    if (output == null) output = {};
    if (events == null) events = [];

    output.Events = events;

    return {
      Id: id,
      Type: type,
      Input: input,
      Component: [],
      Output: output,
    };
  }
}

export default TestExperiment;
