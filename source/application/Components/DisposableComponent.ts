import * as knockout from 'knockout';
import DisposableAction from 'Utility/DisposableAction';

abstract class DisposableComponent {
  private _actions: DisposableAction[] = [];
  private _subscriptions: ko.Subscription[] = [];
  private _computed: ko.Computed<any>[] = [];

  protected Computed<T>(value: () => T): ko.Computed<T> {
    const computed = knockout.computed(value);
    this._computed.push(computed);

    return computed;
  }

  protected PureComputed<T>(read: () => T, write?: (value: T) => void): ko.PureComputed<T> {
    const computed = write == null ? knockout.pureComputed(read) : knockout.pureComputed({ read: read, write: write });
    this._computed.push(computed);

    return computed;
  }

  protected Subscribe<T>(subscribable: ko.Subscribable<T>, callback: (value: T) => void): () => void {
    const subscription = subscribable.subscribe(callback);
    this._subscriptions.push(subscription);

    return () => subscription.dispose();
  }

  protected SubscribeToArray<T>(
    subscribable: ko.ObservableArray<T>,
    callback: (value: T, status: string) => void,
  ): () => void {
    const subscription = subscribable.subscribe(
      (e: { value: T; status: string }[]) => {
        e.forEach((v) => callback(v.value, v.status));
      },
      null,
      'arrayChange',
    );
    this._subscriptions.push(subscription);

    return () => subscription.dispose();
  }

  protected SubscribeUntilChange<T>(subscribable: ko.Subscribable<T>, callback: (value: T) => void): () => void {
    const unsubscriber = this.Subscribe(subscribable, (v) => {
      unsubscriber();
      callback(v);
    });

    return unsubscriber;
  }

  protected AddAction(condition: () => boolean, action: () => void): void {
    this._actions.push(new DisposableAction(condition, action));
  }

  public dispose(): void {
    this._actions.forEach((a) => a.Dispose());
    this._subscriptions.forEach((s) => s.dispose());
    this._computed.forEach((c) => c.dispose());
  }
}

export default DisposableComponent;
