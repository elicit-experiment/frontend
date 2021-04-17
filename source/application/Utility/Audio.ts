import knockout = require('knockout');
import SoundManager = require('soundmanager2');
import Notification = require('Managers/Notification');

export default class Audio {
  public static IsReady: KnockoutObservable<boolean> = knockout.observable(false);
  private static SoundManager: ISoundManager;

  public IsReady: KnockoutObservable<boolean> = knockout.observable(false);
  public IsPlaying: KnockoutObservable<boolean> = knockout.observable(false);
  public IsFinnished: KnockoutObservable<boolean> = knockout.observable(false);
  public Position: KnockoutObservable<number> = knockout.observable(0);
  public Duration: KnockoutObservable<number> = knockout.observable(0);
  public Volume: KnockoutObservable<number> = knockout.observable(100);

  private _sound: ISound;
  private _isReadySubscription: KnockoutSubscription = null;

  constructor(url: string, id?: string) {
    if (!id) id = `Player${Math.ceil(Math.random() * 100000)}`;

    if (Audio.IsReady()) this.Initialize(id, url);
    else {
      this._isReadySubscription = Audio.IsReady.subscribe(() => {
        this._isReadySubscription.dispose();
        this.Initialize(id, url);
      });
    }
  }

  public static Initialize(): void {
    if (Audio.SoundManager != null) return;

    Audio.SoundManager = SoundManager.getInstance();

    Notification.Debug('Initialize Sound');

    const timeoutHandle = setTimeout(() => {
      Notification.Debug('Rebooting sound manager');
      Audio.IsReady(false);
      Audio.SoundManager.reboot();
    }, 3000);

    let wasOk = Audio.SoundManager.ok();

    Audio.SoundManager.setup({
      url: '/lib/soundmanager2/swf/',
      preferFlash: true,
      flashVersion: 9,
      debugMode: false,
      onready: () => {
        if (wasOk) {
          wasOk = false;
          return;
        }
        clearTimeout(timeoutHandle);

        Notification.Debug('Sound is ready');
        Audio.IsReady(true);
      },
      ontimeout: () => {
        Notification.Error('SoundManager timed out');
      },
    });

    if (wasOk) Audio.SoundManager.reboot();
  }

  public TogglePlay(): void {
    if (this.IsPlaying()) this.Pause();
    else this.Play();
  }

  public Play(): void {
    if (this.IsReady()) this._sound.play();
  }

  public Pause(): void {
    if (this.IsReady()) this._sound.pause();
  }

  public Dispose(): void {
    try {
      if (this._isReadySubscription != null) this._isReadySubscription.dispose();
      if (this._sound != null) this._sound.destruct();
    } catch (e) {
      Notification.Debug('Failed to destroy sound: ' + e.message);
    }
  }

  private Initialize(id: string, url: string): void {
    const options: ISoundOptions = {
      id: id,
      url: url,
      volume: this.Volume(),
    };

    this.AddStateListenersToOptions(options);
    Audio.UpdateRTMPOptions(options);
    this.AddVolumeListener();

    this._sound = Audio.SoundManager.createSound(options);
  }

  private AddStateListenersToOptions(options: ISoundOptions): void {
    const withSound = (action: (...args: any[]) => void) => {
      const that = this;

      return function (...args: any[]) {
        if (this === that._sound) action(...args);
      };
    };

    const updatePlayState = withSound(() => {
      this.IsPlaying(this._sound.playState === 1 && !this._sound.paused);
      this.IsFinnished(false);
    });

    options.onconnect = withSound(() => this.IsReady(true));
    options.ondataerror = withSound(() => Notification.Error('Error playing audio'));

    options.whileloading = withSound(() => this.Duration(this._sound.durationEstimate));

    let isUpdatingPosition = false;
    let hasUpdateInitialPosition = false;

    const updatePosition = (position: number) => {
      if (isUpdatingPosition || !this.IsReady() || position === this._sound.position) return;

      isUpdatingPosition = true;
      this._sound.setPosition(position);
      isUpdatingPosition = false;
    };

    options.whileplaying = withSound(() => {
      if (isUpdatingPosition) return;
      isUpdatingPosition = true;

      if (!hasUpdateInitialPosition) {
        if (this.Position() === 0) hasUpdateInitialPosition = true;
        else if (this._sound.position !== 0) {
          hasUpdateInitialPosition = true;
          this._sound.setPosition(this.Position());
        }
      } else this.Position(this._sound.position);

      isUpdatingPosition = false;
    });
    this.Position.subscribe(updatePosition);

    options.onload = withSound((s: boolean) => {
      if (s) this.IsReady(true);
      else Notification.Error('Error playing audio');
    });

    options.onplay = updatePlayState;
    options.onpause = updatePlayState;
    options.onresume = updatePlayState;
    options.onfinish = () => {
      updatePlayState();
      this.IsFinnished(true);
    };
  }

  private static UpdateRTMPOptions(options: ISoundOptions): void {
    if (options.url.indexOf('rtmp://') === 0) {
      const divide = options.url.lastIndexOf('mp3:');

      options.serverURL = options.url.substring(0, divide);
      options.url = options.url.substring(divide);
    }
  }

  private AddVolumeListener(): any {
    this.Volume.subscribe((v) => {
      this._sound.setVolume(v);
    });
  }
}

Audio.Initialize();
