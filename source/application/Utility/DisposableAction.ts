import knockout = require("knockout");

class DisposableAction
{
	private _condition:()=>boolean;
	private _action: () => void;
	private _observableCondition:KnockoutComputed<boolean>;

	constructor(condition:()=>boolean, action:()=>void)
	{
		this._condition = condition;
		this._action = action;
		this._observableCondition = knockout.computed(condition);
		this._observableCondition.subscribe(v => this.Check());

		this.Check();
	}

	public Check():void
	{
		if (this._condition == null || !this._condition()) return;

		var action = this._action;
		this.Dispose();
		action();
	}

	public Dispose():void
	{
		if (this._condition == null) return;

		this._condition = null;
		this._action = null;
		this._observableCondition.dispose();
		this._observableCondition = null;
	}
}

export = DisposableAction;