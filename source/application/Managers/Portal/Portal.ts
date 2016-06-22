import knockout = require("knockout");
import PortalClient = require("PortalClient");
import Configuration = require("Managers/Configuration");

class Portal
{
	public Client: CHAOS.Portal.Client.IPortalClient;
	public IsReady = knockout.observable(false);
	public IsAuthenticated = knockout.observable(false);

	public get ServiceCaller():CHAOS.Portal.Client.IServiceCaller { return <CHAOS.Portal.Client.IServiceCaller><any>this.Client; }

	constructor()
	{
		this.Client = PortalClient.Initialize(Configuration.PortalPath, null, true);

		this.Client.SessionAuthenticated().Add(v => this.IsAuthenticated(v != null));
		this.Client.SessionAcquired().Add(() => this.IsReady(true));
	}

	public LogOut(): void
	{
		this.ServiceCaller.UpdateSession(null);
		this.IsAuthenticated(false);
		this.IsReady(false);

		PortalClient.Session.Create();
	}
}

var instance = new Portal();

export = instance;