import * as knockout from 'knockout';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';

enum TagKind {
  User = 'user',
  Common = 'common',
}
type PredefinedTag = { Label: string; Id: string; Position: number; Kind: TagKind };
type TagData = { Id: string | null; Label: string; Kind: TagKind; Selected: boolean };
type Tag = {
  Data: TagData;
  IsAdded: ko.Observable<boolean>;
  IsSelected: ko.Observable<boolean>;
  Toggle: () => void;
  Remove: (tag: Tag) => void;
  CssClass: ko.Computed<string>;
};

type ListSelectAnswer = {
  Tags: TagData[];
  Events: {
    Id: string;
    Type: string; // You can use an enum for predefined event types, e.g., "Completed", "Change", etc.
    EntityType: string; // You can use an enum for predefined entity types, e.g., "Stimulus", "Instrument", etc.
    Method: string;
    Data: string;
    DateTime: string; // ISO 8601 format for dates
  }[];
};

class ListSelect extends QuestionWithStimulusBase<ListSelectAnswer> {
  protected readonly InstrumentTemplateName = 'ListSelect';

  public SelectionTagsLabel: string;
  public UserTagsLabel: string;
  public UserTextInput: boolean = false;
  public InputPlaceholder: string;
  public MaxNoOfSelections: number | null = null;
  public MinNoOfSelections: number | null = null;
  public AnswerIsRequired = true;
  public IsOptional = false;

  public TextInput = knockout.observable('');

  public UserInputBoxInside = knockout.observable(false);
  public UserInputBoxOutside = knockout.observable(false);

  public PredefinedItems = knockout.observableArray<Tag>();
  public AddedItems = knockout.observableArray<Tag>();
  public TagInputErrorText: ko.Observable<string> = knockout.observable('');

  public HasPredefinedItems: ko.Computed<boolean>;
  public HasAddedItems: ko.Computed<boolean>;
  public HasTagInputError: ko.Computed<boolean>;
  public HasSelectionTagsLabel: ko.Computed<boolean>;

  public NumSelected: ko.Computed<number>;
  public AllowMoreSelections: ko.Computed<boolean>;
  public ListCssClass: ko.Computed<string>;

  private _clearErrorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _clearErrorTimeout = 5000;

  constructor(question: QuestionModel, requiresInput = true) {
    super(question, requiresInput);

    this.SelectionTagsLabel = this.GetInstrumentFormatted('SelectionTagBoxLabel');
    this.InputPlaceholder = this.GetInstrument('TextField');
    this.UserTextInput = this.GetBooleanInstrument('UserTextInput');
    this.IsOptional = this.GetBooleanInstrument('IsOptional');
    this.MaxNoOfSelections = this.GetNumberInstrument('MaxNoOfSelections');
    this.MinNoOfSelections = this.GetNumberInstrument('MinNoOfSelections');
    this.AnswerIsRequired = !this.IsOptional;
    this.UserInputBoxInside((this.GetInstrument('UserInputBox') || 'Inside').localeCompare('Inside') === 0);
    this.UserInputBoxOutside((this.GetInstrument('UserInputBox') || 'Outside').localeCompare('Outside') === 0);

    const selectionTags = this.GetInstrument('Items').Item.map((tag: PredefinedTag) => ({
      ...this.FormatPredefinedTag(tag),
      Kind: TagKind.Common,
    }));
    this.PredefinedItems.push(
      ...this.CreateTags(selectionTags.sort((a: PredefinedTag, b: PredefinedTag) => a.Position - b.Position)),
    );

    this.HasPredefinedItems = this.PureComputed(() => this.PredefinedItems().some((t) => !t.IsAdded()));
    this.HasAddedItems = this.PureComputed(() => this.AddedItems().length != 0);
    this.HasTagInputError = this.PureComputed(() => this.TagInputErrorText() && this.TagInputErrorText() !== '');
    this.HasSelectionTagsLabel = this.PureComputed(
      () => this.SelectionTagsLabel != null && this.SelectionTagsLabel !== '',
    );
    this.NumSelected = this.PureComputed(() => this.GetAnswer()?.Tags?.filter((t) => t.Selected).length || 0);

    this.AllowMoreSelections = knockout.computed(() => {
      if (this.MaxNoOfSelections == null) return true;

      return this.NumSelected() < this.MaxNoOfSelections;
    });

    this.ListCssClass = knockout.computed(() => (this.AllowMoreSelections() ? 'list-select' : 'list-select-disabled'));

    this.InitializeAnswer();
  }

  private InitializeAnswer(): void {
    if (!this.HasAnswer()) return;

    const answer = this.GetAnswer();

    if (!answer.Tags || answer.Tags.length == 0) return;

    for (const tag of answer.Tags) {
      if (tag.Id == null || tag.Id == '') {
        this.AddedItems.push(
          this.CreateTag({ Id: null, Label: tag.Label, Position: null, Kind: TagKind.Common }, true, false),
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

  private FormatPredefinedTag(tag: PredefinedTag): PredefinedTag {
    return {
      ...tag,
      Label: this.GetFormatted(tag.Label),
    };
  }

  protected GetTagByLabel(label: string): Tag {
    label = label.toLocaleLowerCase();

    for (const predefinedTag of this.PredefinedItems()) {
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
    for (const predefinedTag of this.PredefinedItems()) {
      if (predefinedTag.Data.Id == id) return predefinedTag;
    }

    return null;
  }

  public AddText(element): void {
    if (this.TextInput() == '' || this.IsTagAdded(this.TextInput())) {
      this.TagInputErrorText('Tag already added');
      this.clearErrorText(element); // Avoid identifying/finding DOM element like we would if this were handled in an observer of TagInputErrorText
      return;
    }

    if (this.AddTagByLabel(this.TextInput())) this.TextInput('');
  }

  protected AddTagByLabel(label: string): boolean {
    let tag = this.GetTagByLabel(label);

    if (tag == null) tag = this.CreateTag({ Id: null, Label: label, Position: null, Kind: TagKind.User }, true, true);

    return this.AddTag(tag);
  }

  protected AddTag(tag: Tag): boolean {
    if (this.AddedItems.indexOf(tag) != -1) return false;

    tag.IsAdded(true);
    this.AddedItems.push(tag);

    this.AddRawEvent('Change', 'Mouse/Left/Down', tag.Data.Label, 'None', 'None', false);
    this.UpdateAnswer();

    return true;
  }

  protected RemoveTag(tag: Tag): void {
    if (this.AddedItems.indexOf(tag) == -1) return;

    tag.IsAdded(false);
    this.AddedItems.remove(tag);

    this.AddRawEvent('Change', 'Mouse/Left/Down', tag.Data.Label, 'None', 'None', false);
    this.UpdateAnswer();
  }

  private CreateTags(tags: PredefinedTag[]): Tag[] {
    return tags.map((t) => this.CreateTag(t, false, false));
  }

  private CreateTag(data: PredefinedTag, isAdded = false, isSelected = false): Tag {
    const IsSelected = knockout.observable(isSelected);
    const Data = { Id: data.Id, Label: data.Label, Kind: data.Kind, Selected: isSelected };
    const tag: Tag = {
      Data,
      Toggle: null,
      Remove: (tag: Tag) => this.RemoveTag(tag),
      IsAdded: knockout.observable(isAdded),
      CssClass: knockout.computed(() => `Tag ${Data.Kind} ${IsSelected() ? 'selected' : 'not-selected'}`),
      IsSelected,
    };

    tag.Toggle = () => this.ToggleTag(tag);

    return tag;
  }

  private ToggleTag(tag: Tag): void {
    console.dir(tag.IsSelected());
    if (!tag.IsSelected() && !this.AllowMoreSelections()) return;

    tag.Data.Selected = !tag.Data.Selected;
    tag.IsSelected(tag.Data.Selected);
    this.AddRawEvent('Change', 'Mouse/Left/Down', tag.Data.Label, 'None', 'None', false);
    this.UpdateAnswer();
    return;
  }

  private UpdateAnswer(): void {
    const Tags = [
      ...this.PredefinedItems().map((t) => ({
        Id: t.Data.Id,
        Label: t.Data.Label,
        Kind: t.Data.Kind,
        Selected: t.Data.Selected,
      })),
      ...this.AddedItems().map((t) => ({
        Id: t.Data.Id,
        Label: t.Data.Label,
        Kind: t.Data.Kind,
        Selected: t.Data.Selected,
      })),
    ];
    this.SetAnswer({
      Events: [],
      Tags,
    });
  }

  protected HasValidAnswer(answer: ListSelectAnswer): boolean {
    if (!this.AnswerIsRequired) return true;

    if (answer == undefined || answer.Tags == undefined) return false;

    const selectedCount = answer.Tags.reduce((sum, tag) => sum + (tag.Selected ? 1 : 0), 0);

    if (this.MinNoOfSelections != null && selectedCount < this.MinNoOfSelections) return false;
    if (this.MaxNoOfSelections != null && selectedCount > this.MaxNoOfSelections) return false;

    return true;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'ListSelect', 'Instrument', method, data);
  }

  private clearErrorText(element) {
    if (this._clearErrorTimeoutId) {
      clearTimeout(this._clearErrorTimeoutId); // Clear any existing timeout
    }

    this._clearErrorTimeoutId = setTimeout(() => {
      this.TagInputErrorText('');
      this._clearErrorTimeoutId = null; // Clear the stored ID
    }, this._clearErrorTimeout);

    // Add the dispose callback
    knockout.utils.domNodeDisposal.addDisposeCallback(element, function () {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null; // Important: Clear the ID to prevent memory leaks
      }
    });
  }
}

import template from 'Components/Questions/ListSelect/ListSelect.html';
knockout.components.register('Questions/ListSelect', {
  viewModel: ListSelect,
  template,
});

export default ListSelect;
