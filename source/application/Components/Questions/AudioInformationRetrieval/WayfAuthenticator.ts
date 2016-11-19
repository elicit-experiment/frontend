import knockout = require("knockout");
import PortalClient = require("PortalClient");
import Notification = require("Managers/Notification");
import Wayf = require("Managers/Portal/Wayf");
import Configuration = require("Managers/Configuration");
import DisposableComponent = require("Components/DisposableComponent");

export default class WayfAuthenticator extends DisposableComponent
{
	private _larmClient:CHAOS.Portal.Client.IPortalClient;

	public IsReady = knockout.observable(false);
	public IsAuthenticating = knockout.observable(false);
	public IsAuthenticated = knockout.observable(false);
	public CanLogin:KnockoutComputed<boolean>;
	public get ServiceCaller():CHAOS.Portal.Client.IServiceCaller { return <CHAOS.Portal.Client.IServiceCaller><any>this._larmClient; }

	constructor()
	{
		super();

		this._larmClient = new PortalClient.PortalClient(Configuration.LarmPortalPath);

		this._larmClient.SessionAcquired().Add(session => this.IsReady(session != null));
		this._larmClient.SessionAuthenticated().Add(session => this.IsAuthenticated(session != null));

		this.CanLogin = this.PureComputed(() => this.IsReady() && !this.IsAuthenticating() && !this.IsAuthenticated());

		PortalClient.Session.Create(this.ServiceCaller);
	}

	public Login():void
	{
		this.IsAuthenticating(true);

		Wayf.Login((success, notApproved) =>
		{
			this.IsAuthenticating(false);
			console.log(success, notApproved);
		}, this.ServiceCaller);
	}

	public GetAsset(id:string, callback:(larmObject:IAsset)=>void):void
	{
		this.ServiceCaller.CallService("EZAsset/Get", PortalClient.HttpMethod.Get, { id: id }, true).WithCallback(response => {
			if(response.Error != null)
			{
				Notification.Error("Failed to get Larm asset: " + response.Error.Message);
				return;
			}

			callback(response.Body.Results[0]);
		});
	}
}

export interface IAsset
{
	Identifier: string;
	TypeId: string;
	DoFilesRequireLogin: boolean;
	Data: IData[];
	Files: IFile[];
	Annotations: IAnnotationGroup[];
	Tags: string[];
}

export interface IAnnotationGroup
{
	DefinitionId: string;
	Name: string;
	Data: IAnnotation[];
}

export interface IData
{
	Name: string;
	Fields: { [key: string]: string };
}

export interface IFile
{
	Identifier: string;
	Type: string;
	Name: string;
	Destinations: IDestination[];
}

export interface IDestination
{
	Type: string;
	Url: string;
}

export interface IAnnotation
{
	Identifier?: string;
	[key: string]: any;
}