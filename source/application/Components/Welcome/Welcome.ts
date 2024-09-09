import knockout from 'knockout';

class Welcome {}

import template = require('Components/Welcome/Welcome.html');
knockout.components.register('Questions/Welcome', {
  viewModel: Welcome,
  template: template.default,
});

export = Welcome;
