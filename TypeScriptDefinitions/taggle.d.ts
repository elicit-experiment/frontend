declare class Taggle
{
	constructor(element: HTMLElement, options: TaggleOptions);

	public add(tag:string):void;
	public remove(tag:string):void;
}

interface TaggleOptions
{
	tags:string[];

	preserveCase?:boolean;

	placeholder?:string;
	duplicateTagClass?:string;

	onTagAdd?:(event:Event, tag:string)=>void;
	onTagRemove?:(event:Event, tag:string)=>void;
}

declare module "Taggle"
{
	export = Taggle;
}