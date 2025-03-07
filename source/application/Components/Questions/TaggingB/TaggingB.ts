﻿import * as knockout from 'knockout';
import TaggingBase from 'Components/Questions/Base/TaggingBase';
import Taggle from 'taggle';
import QuestionModel from 'Models/Question';

class TaggingB extends TaggingBase {
  public TagBoxElement = knockout.observable<HTMLElement>();
  protected readonly InstrumentTemplateName = 'TaggingB';

  constructor(question: QuestionModel) {
    super(question);

    this.SubscribeUntilChange(this.TagBoxElement, (e) => this.InitializeTagBox(e));
  }

  private InitializeTagBox(element: HTMLElement) {
    let isModifying = false;

    const taggle = new Taggle(element, {
      tags: this.AddedItems().map((t) => t.Data.Label),
      preserveCase: true,
      placeholder: this.InputPlaceholder,
      onTagAdd: (e, tag) => {
        if (isModifying) return;
        isModifying = true;
        this.AddTagByLabel(tag);
        isModifying = false;
      },
      onBeforeTagAdd: (e, tag) => !this.IsTagAdded(tag),
      onTagRemove: (e, tag) => {
        if (isModifying) return;
        isModifying = true;
        this.RemoveTagByLabel(tag);
        isModifying = false;
      },
    });

    this.SubscribeToArray(this.AddedItems, (tag, status) => {
      if (isModifying) return;
      isModifying = true;
      if (status === 'added') taggle.add(tag.Data.Label);
      else if (status === 'removed') taggle.remove(tag.Data.Label);
      isModifying = false;
    });
  }

  private RemoveTagByLabel(tagLabel: string) {
    const existingTag = this.GetTagByLabel(tagLabel);

    if (existingTag != null) this.RemoveTag(existingTag);
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'TaggingB', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/TaggingB/TaggingB.html';
knockout.components.register('Questions/TaggingB', {
  viewModel: TaggingB,
  template,
});

export default TaggingB;
