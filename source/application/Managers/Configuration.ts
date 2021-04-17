import ConfigurationFile = require('text!../../configuration.json');

const configurationData = JSON.parse(ConfigurationFile);

class Configuration {
  public PortalPath: string = configurationData.PortalPath;
  public LarmPortalPath: string = configurationData.LarmPortalPath;
  public WayfPath: string = configurationData.WayfPath;
}

const instance = new Configuration();

export = instance;
