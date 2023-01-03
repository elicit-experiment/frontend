import knockout = require('knockout');

class SlideLocked {}

import template = require('Components/SlideLocked/SlideLocked.html');
knockout.components.register('Questions/SlideLocked', {
  viewModel: SlideLocked,
  template: template.default,
});

export = SlideLocked;
