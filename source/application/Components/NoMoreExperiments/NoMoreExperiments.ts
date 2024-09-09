import knockout from 'knockout';

class NoMoreExperiments {}

import template = require('Components/NoMoreExperiments/NoMoreExperiments.html');
knockout.components.register('Questions/NoMoreExperiments', {
  viewModel: NoMoreExperiments,
  template: template.default,
});

export = NoMoreExperiments;
