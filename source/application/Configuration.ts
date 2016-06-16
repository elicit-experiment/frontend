import ConfigurationFile = require("text!../configuration.json");

var configurationData = JSON.parse(ConfigurationFile);

class Configuration
{
	public PortalPath: string = configurationData.PortalPath;
}

var instance = new Configuration();

export = instance;