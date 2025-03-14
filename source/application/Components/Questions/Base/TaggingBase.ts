import * as knockout from 'knockout';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';

enum TagKind {
  User = 'user',
  Common = 'common',
}
type PredefinedTag = { Label: string; Id: string; Position: number; Kind: TagKind };
type TagData = { Id: string; Label: string; Kind: TagKind };
type Tag = { Data: TagData; IsAdded: ko.Observable<boolean>; Toggle: () => void };

export default class TaggingBase extends QuestionWithStimulusBase<{ Tags: TagData[] }> {
  public SelectionTagsLabel: string;
  public UserTagsLabel: string;
  public InputPlaceholder: string;
  public AnswerIsRequired = true;

  public TextInput = knockout.observable('');

  public SelectionItems = knockout.observableArray<Tag>();
  public UserItems = knockout.observableArray<Tag>();
  public AddedItems = knockout.observableArray<Tag>();

  public HasSelectionItems: ko.Computed<boolean>;
  public HasUserItems: ko.Computed<boolean>;
  public HasAddedItems: ko.Computed<boolean>;

  constructor(question: QuestionModel) {
    super(question);

    this.SelectionTagsLabel = this.GetInstrumentFormatted('SelectionTagBoxLabel');
    this.UserTagsLabel = this.GetInstrumentFormatted('UserTagBoxLabel');
    this.InputPlaceholder = this.GetInstrument('TextField');
    this.AnswerIsRequired = this.GetNumberInstrument('MinNoOfScalings') !== 0;

    const selectionTags = this.GetInstrument('SelectionTags').Item.map((tag: PredefinedTag) => ({
      ...tag,
      Kind: TagKind.Common,
    }));
    const userTags = this.GetInstrument('UserTags').Item.map((tag: PredefinedTag) => ({
      ...tag,
      Kind: TagKind.User,
    }));
    this.SelectionItems.push(
      ...this.CreateTags(selectionTags.sort((a: PredefinedTag, b: PredefinedTag) => a.Position - b.Position)),
    );
    this.UserItems.push(
      ...this.CreateTags(userTags.sort((a: PredefinedTag, b: PredefinedTag) => a.Position - b.Position)),
    );

    this.HasSelectionItems = this.PureComputed(() => this.SelectionItems().some((t) => !t.IsAdded()));
    this.HasUserItems = this.PureComputed(() => this.UserItems().some((t) => !t.IsAdded()));
    this.HasAddedItems = this.PureComputed(() => this.AddedItems().length != 0);

    this.InitializeAnswer();
  }

  private InitializeAnswer(): void {
    if (!this.HasAnswer()) return;

    const answer = this.GetAnswer();

    if (!answer.Tags || answer.Tags.length == 0) return;

    for (const tag of answer.Tags) {
      if (tag.Id == null || tag.Id == '') {
        this.AddedItems.push(
          this.CreateTag({ Id: null, Label: tag.Label, Position: null, Kind: TagKind.Common }, true),
        );
      } else {
        const existingTag = this.GetTagById(tag.Id);

        if (existingTag != null) {
          existingTag.IsAdded(true);
          this.AddedItems.push(existingTag);
        }
      }
    }
  }

  protected GetTagByLabel(label: string): Tag {
    label = label.toLocaleLowerCase();

    for (const predefinedTag of this.SelectionItems()) {
      if (predefinedTag.Data.Label.toLocaleLowerCase() == label) return predefinedTag;
    }
    for (const predefinedTag of this.UserItems()) {
      if (predefinedTag.Data.Label.toLocaleLowerCase() == label) return predefinedTag;
    }
    for (const predefinedTag of this.AddedItems()) {
      if (predefinedTag.Data.Label.toLocaleLowerCase() == label) return predefinedTag;
    }

    return null;
  }

  protected IsTagAdded(label: string): boolean {
    label = label.toLocaleLowerCase();
    for (const tag of this.AddedItems()) {
      if (tag.Data.Label.toLocaleLowerCase() == label) return true;
    }
    return false;
  }

  protected GetTagById(id: string): Tag {
    for (const predefinedTag of this.SelectionItems()) {
      if (predefinedTag.Data.Id == id) return predefinedTag;
    }
    for (const predefinedTag of this.UserItems()) {
      if (predefinedTag.Data.Id == id) return predefinedTag;
    }

    return null;
  }

  public AddText(): void {
    if (this.TextInput() == '' || this.IsTagAdded(this.TextInput())) return;

    if (this.AddTagByLabel(this.TextInput())) this.TextInput('');
  }

  protected AddTagByLabel(label: string): boolean {
    let tag = this.GetTagByLabel(label);

    if (tag == null) tag = this.CreateTag({ Id: null, Label: label, Position: null, Kind: TagKind.User }, true);

    return this.AddTag(tag);
  }

  protected AddTag(tag: Tag): boolean {
    if (this.AddedItems.indexOf(tag) != -1) return false;

    tag.IsAdded(true);
    this.AddedItems.push(tag);

    this.AddEvent('Change', 'Mouse/Left/Down', tag.Data.Label);
    this.UpdateAnswer();

    return true;
  }

  protected RemoveTag(tag: Tag): void {
    if (this.AddedItems.indexOf(tag) == -1) return;

    tag.IsAdded(false);
    this.AddedItems.remove(tag);

    this.AddEvent('Change', 'Mouse/Left/Down', tag.Data.Label);
    this.UpdateAnswer();
  }

  private CreateTags(tags: PredefinedTag[]): Tag[] {
    return tags.map((t) => this.CreateTag(t));
  }

  private CreateTag(data: PredefinedTag, isAdded = false): Tag {
    const tag: Tag = {
      Data: { Id: data.Id, Label: data.Label, Kind: data.Kind },
      Toggle: null,
      IsAdded: knockout.observable(isAdded),
    };

    tag.Toggle = () => this.ToggleTag(tag);

    return tag;
  }

  private ToggleTag(tag: Tag): void {
    if (tag.IsAdded()) this.RemoveTag(tag);
    else this.AddTag(tag);
  }

  private UpdateAnswer(): void {
    this.SetAnswer({
      Tags: this.AddedItems().map((t) => ({ Id: t.Data.Id, Label: t.Data.Label, Kind: t.Data.Kind })),
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    return !this.AnswerIsRequired || (answer != undefined && answer.Tags != undefined && answer.Tags.length !== 0);
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'TaggingA', 'Instrument', method, data);
  }
}
