interface ISoundManager
{
	setup(config: any): void;
	reset(): void;
	reboot(): void;
	ok(): boolean;
	createSound(options: ISoundOptions): ISound;
}

interface ISound
{
	loaded:boolean;
	playState:number;
	paused:boolean;
	durationEstimate:number;
	position:number;
	play():void;
	pause():void;
	destruct(): void;
	setPosition(msecOffset: number): ISound;
	setVolume(volume: number): ISound;
}

interface ISoundOptions
{
	id: string;
	url:string;
	serverURL?: string;
	volume?:number;
	whileloading?:()=>void;
	whileplaying?:()=>void;
	onload?:(success:boolean)=>void;
	onconnect?:()=>void;
	ondataerror?:()=>void;
	onplay?:()=>void;
	onpause?:()=>void;
	onresume?:()=>void;
	onfinish?:()=>void;
}

interface ISoundManagerModule
{
	getInstance():ISoundManager;
}

declare var soundManager: ISoundManagerModule;
declare module "soundmanger2" { export = soundManager }