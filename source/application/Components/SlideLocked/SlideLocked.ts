import * as knockout from 'knockout';

class SlideLocked {}

import template from 'Components/SlideLocked/SlideLocked.html';
knockout.components.register('Questions/SlideLocked', {
  viewModel: SlideLocked,
  template,
});

export default SlideLocked;
