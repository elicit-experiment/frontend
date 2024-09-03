import * as knockout from 'knockout';

class NotFound {}

import template from 'Components/NotFound/NotFound.html';
knockout.components.register('Questions/NotFound', {
  viewModel: NotFound,
  template,
});

export default NotFound;
