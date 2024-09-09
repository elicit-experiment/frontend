import knockout from 'knockout';

class NotFound {}

import template = require('Components/NotFound/NotFound.html');
knockout.components.register('Questions/NotFound', {
  viewModel: NotFound,
  template: template.default,
});

export = NotFound;
