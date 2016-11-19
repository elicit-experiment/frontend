import ConfigurationFile = require("text!../../configuration.json");

var configurationData = JSON.parse(ConfigurationFile);

class Configuration
{
	public PortalPath: string = configurationData.PortalPath;
	public LarmPortalPath: string = configurationData.LarmPortalPath;
	public WayfPath: string = configurationData.WayfPath;
}

var instance = new Configuration();

export = instance;