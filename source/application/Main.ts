import knockout = require("knockout");
import NameConventionLoader = require("Components/NameConventionLoader");

knockout.components.loaders.push(new NameConventionLoader());
knockout.applyBindings();