import QuestionModel from 'Models/Question';
import FreetextBase from 'Components/Questions/Freetext/FreetextBase';
import CryptoJS from 'crypto-js';
import * as knockout from 'knockout';

type Answer = { Value: string; Length: number };

class FreetextHash extends FreetextBase<Answer> {
  private _forceLowerCase: boolean;

  constructor(question: QuestionModel) {
    super(question);

    this._forceLowerCase = this.GetBooleanInstrument('ForceLowerCase');

    this.Answer.subscribe((v) => {
      this.SetAnswer(this.SaveText(v));
    });
  }

  protected LoadAnswer(answer: Answer): string {
    return '';
  }

  protected SaveText(answer: string): Answer {
    return {
      Value: CryptoJS.MD5(this._forceLowerCase ? answer.toLocaleLowerCase() : answer).toString(),
      Length: answer.length,
    };
  }
}

import template from 'Components/Questions/FreetextHash/FreetextHash.html';
knockout.components.register('Questions/FreetextHash', {
  viewModel: FreetextHash,
  template,
});

export default FreetextHash;
