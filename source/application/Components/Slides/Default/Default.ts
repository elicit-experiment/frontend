﻿import knockout = require("knockout");
import SlideModel = require("Models/Slide");
import QuestionModel = require("Models/Question");
import ExperimentManager = require("Managers/Portal/Experiment");
import CockpitPortal = require("Managers/Portal/Cockpit");
import NameConventionLoader = require("Components/NameConventionLoader");

class Default
{
	private _slide: SlideModel;
	private _uiLessQuestions: IQuestionViewModel[] = [];
	private _activeAnsweSets: KnockoutObservable<number> = knockout.observable(0);
	private _isWorking: KnockoutObservable<boolean> = knockout.observable(false);

	private _loadingQuestions: KnockoutObservable<boolean> = knockout.observable(true);

	public Questions: QuestionModel[] = [];
	public HaveActiveAnswersSets:KnockoutComputed<boolean>;

	constructor(slide: SlideModel)
	{
		this._slide = slide;
		this._slide.CanGoToNextSlide(false);
		this._loadingQuestions(true);
		slide.SlideCompleted = callback => this.SlideCompleted(callback);
		slide.ScrollToFirstInvalidAnswerCallback = () => this.ScrollToFirstInvalidAnswer();

		this.HaveActiveAnswersSets = knockout.computed(() => this._activeAnsweSets() !== 0);
		slide.SetIsWorking(knockout.computed(() => this._isWorking() || this.HaveActiveAnswersSets()));

		this.InitializeQuestions(slide.Questions);
	}

	private InitializeQuestions(questions: CockpitPortal.IQuestion[]):void
	{
		this._slide.SetIsWorking(knockout.computed(() => true));
		//console.log('Default.ts:InitializeQuestions');
		var numberToLoad = questions.length;
		var loaded = () => { if (--numberToLoad === 0) this.SlideLoaded(); }

		for (var i = 0; i < questions.length; i++)
		{
			var questionModel = new QuestionModel(questions[i], question => this.AnswerChanged(question), loaded);
			questionModel.HasValidAnswer.subscribe(() => this.CheckIfAllQuestionsAreAnswered());
			this.Questions.push(questionModel);

			if (!questionModel.HasUIElement)
				((m: QuestionModel) => require([NameConventionLoader.GetFilePath(questionModel.Type)],(vm: any) => this._uiLessQuestions.push(new vm(m))))(questionModel);
		}

		if (questions.length === 0) {
			this.SlideLoaded();
		}
	}

	private SlideLoaded(): void
	{
		console.log('Default.ts:SlideLoaded');

		for (var i = 0; i < this._uiLessQuestions.length; i++)
			this._uiLessQuestions[i].SlideLoaded();

		this._loadingQuestions(false);
		this.CheckIfAllQuestionsAreAnswered();
		this._slide.SetIsWorking(knockout.computed(() => false));
	}

	private SlideCompleted(completed: () => void):void
	{
		var waitForAnswerSaved = false;

		for (var i = 0; i < this._uiLessQuestions.length; i++)
		{
			waitForAnswerSaved = this._uiLessQuestions[i].SlideCompleted() || waitForAnswerSaved;
		}

		if (waitForAnswerSaved)
		{
			var sub = this.HaveActiveAnswersSets.subscribe(v =>
			{
				if (!v)
				{
					sub.dispose();
					completed();
				}
			});
		} else
			completed();
	}

	private ScrollToFirstInvalidAnswer():void
	{
		var question = this.GetFirstQuestionWithoutValidAnswer();

		if(question != null) question.ScrollTo(ExperimentManager.ScrollToInvalidAnswerDuration);
	}

	private AnswerChanged(question: QuestionModel):void
	{
		if (question.HasValidAnswer())
		{
			this._activeAnsweSets(this._activeAnsweSets() + 1);

			ExperimentManager.SaveQuestionAnswer(question.Id, question.Answer(), success =>
			{
				if (!success) question.HasValidAnswer(false);

				this._isWorking(true);
				this._activeAnsweSets(this._activeAnsweSets() - 1);
				this.CheckIfAllQuestionsAreAnswered();
				this._isWorking(false);
			});
		}

		this.CheckIfAllQuestionsAreAnswered();
	}

	private GetFirstQuestionWithoutValidAnswer(): QuestionModel
	{
		//console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer for ${this.Questions.length} questions`);

		for (var i = 0; i < this.Questions.length; i++)
		{
			//console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer ${i}: RequiresInput ${this.Questions[i].RequiresInput} Has Valid Answer ${this.Questions[i].HasValidAnswer()}`);
			// This is Question.ts:HasValidAnswer(). NOT the HasValidAnswer of the question models
			if (this.Questions[i].RequiresInput && !this.Questions[i].HasValidAnswer()) {
				//console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer Question ${i} is invalid`);
				return this.Questions[i];
			}
		}

		return null;
	}

	private CheckIfAllQuestionsAreAnswered():void
	{
		const firstQUestionWithInvalidAnswer = this.GetFirstQuestionWithoutValidAnswer();

		const allAnswered = !firstQUestionWithInvalidAnswer && !this.HaveActiveAnswersSets();

		//console.log(`Default.ts: CheckIfAllQuestionsAreAnswered loading questions? ${this._loadingQuestions()} ${firstQUestionWithInvalidAnswer} ${this.HaveActiveAnswersSets()} => ${allAnswered}`);

		if (this._loadingQuestions()) return this._slide.CanGoToNextSlide(false);

		this._slide.CanGoToNextSlide(allAnswered);
	}
}

export = Default;