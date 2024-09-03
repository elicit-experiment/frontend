import * as knockout from 'knockout';

class NoMoreExperiments {}

import template from 'Components/NoMoreExperiments/NoMoreExperiments.html';
knockout.components.register('Questions/NoMoreExperiments', {
  viewModel: NoMoreExperiments,
  template,
});

export default NoMoreExperiments;
