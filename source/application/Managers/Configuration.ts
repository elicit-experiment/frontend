import * as configuration from 'Source/configuration.json';

type ConfigPaths = {
  PortalPath: string;
  ElicitLandingPath: string;
  LarmPortalPath: string;
  WayfPath: string;
};

// Handle build-time differences between Jest and Webpack environments
const configurationData = (typeof configuration.default === 'string'
  ? JSON.parse(configuration.default)
  : configuration) as unknown as ConfigPaths;

class Configuration {
  public PortalPath: string = configurationData.PortalPath;
  public LarmPortalPath: string = configurationData.LarmPortalPath;
  public WayfPath: string = configurationData.WayfPath;
}

const instance = new Configuration();

export default instance;
