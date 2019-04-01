import knockout = require("knockout");
import PortalClient = require("PortalClient");
import Configuration = require("Managers/Configuration");
import { currentPoint } from "Components/WebGazer/WebGazerCalibration";

class MyCallHandler<T> implements CHAOS.Portal.Client.ICallHandler {
	public ProcessResponse<T>(response: CHAOS.Portal.Client.IPortalResponse<T>, recaller:(resetSession:boolean)=>void):boolean {
		if (response.Error) {
			console.log(response.Error);
			location.href = Configuration.PortalPath  +"/participant";
			return false;
		}
		return true;
	}
}

class Portal
{
	public Client: CHAOS.Portal.Client.IPortalClient;
	public IsReady = knockout.observable(false);
	public IsAuthenticated = knockout.observable(false);

	public get ServiceCaller():CHAOS.Portal.Client.IServiceCaller { return <CHAOS.Portal.Client.IServiceCaller><any>this.Client; }

	constructor()
	{
		function getCookie(key: string) {
            const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
            return keyValue ? keyValue[2] : null;
		}
		
		let session_guid_regex = new RegExp('[\\?&]' + 'session_guid' + '=([^&#]*)');
		let results = session_guid_regex.exec(location.search);
		let session_guid = results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
		let d = new Date();
		d.setTime(d.getTime() + (1*24*60*60*1000));
		var expires = "expires=" + d.toUTCString();

		const currentSessionGuid = getCookie('session_guid');

		document.cookie = "session_guid=" + session_guid + ";" + expires + ";path=/";
		
		var client = PortalClient.Initialize(Configuration.PortalPath, null, false);
		this.Client = client;
		client.SetCallHandler(new MyCallHandler<CHAOS.Portal.Client.IPagedPortalResult<CHAOS.Portal.Client.ISession>>());

		this.Client.SessionAuthenticated().Add(v => {
			client.SetCallHandler(undefined);
			console.log("IsAuthenticated");
			this.IsAuthenticated(v != null)
		});
		this.Client.SessionAcquired().Add(() => {
			client.SetCallHandler(undefined);
			console.log("SessionAcquired");
			this.IsReady(true)
		});

		CHAOS.Portal.Client.Session.Create(this.ServiceCaller);

		if (currentSessionGuid === session_guid) {
			// wait till the experiment manager starts up, then kill it
			setTimeout(() => {
				console.error('RELOADING CURRENT SESSION. TERMINATING EXPERIMENT.');
				require("Managers/Portal/Experiment").Close();	
			}, 2000);
		}
	}

	public LogOut(): void
	{
		this.ServiceCaller.UpdateSession(null);
		this.IsAuthenticated(false);
		this.IsReady(false);

		PortalClient.Session.Create();
	}

	public getToken(tok : string) {
		if (sessionStorage[tok]) {
		  try {
			  let token = JSON.parse(sessionStorage[tok]);
			  let expire_time = token.created_at + token.expires_in;
			  if (expire_time < (new Date()).getTime()) {
				console.log('EXPIRED!');
			  } else {
				return token				
			  }
		  } catch (e) {
		   console.warn("Bad stuff in localstorage for usertoken.")
		   sessionStorage.removeItem(tok)
		  }
		}
		return  {
			access_token: undefined
		  }
	  }
}

var instance = new Portal();

export = instance;