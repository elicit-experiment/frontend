import knockout = require("knockout");
import DisposableAction = require("Utility/DisposableAction");

abstract class DisposableComponent
{
	private _actions: DisposableAction[] = [];
	private _subscriptions: KnockoutSubscription[] = [];
	private _computed:KnockoutComputed<any>[] = [];

	protected Computed<T>(value:() => T):KnockoutComputed<T>
	{
		var computed = knockout.computed(value);
		this._computed.push(computed);

		return computed;
	}

	protected PureComputed<T>(read: () => T, write?:(value:T)=>void): KnockoutComputed<T>
	{
		var computed = write == null ? knockout.pureComputed(read) : knockout.pureComputed({read: read, write:write});
		this._computed.push(computed);

		return computed;
	}

	protected Subscribe<T>(subscribable:KnockoutSubscribable<T>, callback:(value:T)=>void):() => void
	{
		var subscription = subscribable.subscribe(callback);
		this._subscriptions.push(subscription);

		return () => subscription.dispose();
	}

	protected SubscribeToArray<T>(subscribable: KnockoutObservableArray<T>, callback: (value:T, status:string) => void): () => void
	{
		var subscription = subscribable.subscribe((e:{value:T, status:string}[]) =>
		{
			e.forEach(v => callback(v.value, v.status));
		}, null, "arrayChange");
		this._subscriptions.push(subscription);

		return () => subscription.dispose();
	}

	protected SubscribeUntilChange<T>(subscribable:KnockoutSubscribable<T>, callback:(value:T) => void):() => void
	{
		var unsubscriber = this.Subscribe(subscribable, v =>
		{
			unsubscriber();
			callback(v);
		});

		return unsubscriber;
	}

	protected AddAction(condition:() => boolean, action:() => void):void
	{
		this._actions.push(new DisposableAction(condition, action));
	}

	public dispose():void
	{
		this._actions.forEach(a => a.Dispose());
		this._subscriptions.forEach(s => s.dispose());
		this._computed.forEach(c => c.dispose());
	}
}

export = DisposableComponent;