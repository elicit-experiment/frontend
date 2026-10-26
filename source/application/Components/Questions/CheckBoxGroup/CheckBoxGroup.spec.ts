import * as knockout from 'knockout';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import CheckBoxGroup from './CheckBoxGroup';
import Question from 'Models/Question';
import SlideStep from 'Models/SlideStep';
import { IQuestion } from 'Managers/Portal/Cockpit';

function createQuestion(output?: { Selections: string[]; Correct: boolean }): Question {
  const definition = {
    Id: 'study:checkbox',
    Type: 'NewComponent',
    Component: {
      Instruments: [
        {
          Instrument: {
            CheckBoxGroup: {
              QuestionsPerRow: 1,
              MinNoOfSelections: 1,
              MaxNoOfSelections: 2,
              Items: {
                Item: [
                  { Id: 'default', Label: 'Default', Selected: '1', Correct: true },
                  { Id: 'alternative', Label: 'Alternative', Selected: '0', Correct: false },
                ],
              },
            },
          },
        },
      ],
      Stimuli: [],
      Layout: { Type: 'row', ColumnWidthPercent: null },
    },
    Output: output,
  } as unknown as IQuestion;
  return new Question(definition, knockout.observable(SlideStep.ANSWERING), jest.fn(), jest.fn());
}

describe('checkbox answer initialization', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('untouched preselected choices populate the serialized answer and validation', () => {
    const question = createQuestion();
    const component = new CheckBoxGroup(question);
    jest.advanceTimersByTime(250);
    expect(component.Answer()).toEqual(['default']);
    expect(question.Answer()).toMatchObject({ Selections: ['default'], Correct: true });
    expect(question.Answer().Events.some((event) => event.Type === 'Change')).toBe(false);
    expect(question.HasValidAnswer()).toBe(true);
    component.dispose();
  });

  test('restored choices replace defaults and later deselection is preserved', () => {
    const question = createQuestion({ Selections: ['alternative'], Correct: false });
    const component = new CheckBoxGroup(question);
    jest.advanceTimersByTime(250);
    expect(component.Answer()).toEqual(['alternative']);
    expect(question.Answer()).toMatchObject({ Selections: ['alternative'], Correct: false });
    component.Answer.removeAll();
    jest.advanceTimersByTime(250);
    expect(question.Answer()).toMatchObject({ Selections: [], Correct: false });
    expect(question.HasValidAnswer()).toBe(false);
    component.dispose();
  });

  test('an explicitly restored empty selection does not reapply defaults', () => {
    const question = createQuestion({ Selections: [], Correct: false });
    const component = new CheckBoxGroup(question);
    jest.advanceTimersByTime(250);
    expect(component.Answer()).toEqual([]);
    expect(question.Answer()).toMatchObject({ Selections: [], Correct: false });
    expect(question.HasValidAnswer()).toBe(false);
    component.dispose();
  });
});
