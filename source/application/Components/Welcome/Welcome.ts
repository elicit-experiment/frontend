import * as knockout from 'knockout';

class Welcome {}

import template from 'Components/Welcome/Welcome.html';
knockout.components.register('Questions/Welcome', {
  viewModel: Welcome,
  template,
});

export default Welcome;
