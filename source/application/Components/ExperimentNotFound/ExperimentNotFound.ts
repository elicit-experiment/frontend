import knockout from 'knockout';

class ExperimentNotFound {
  public Id: string;

  constructor(data: string) {
    this.Id = data;
  }
}

import template = require('Components/ExperimentNotFound/ExperimentNotFound.html');
knockout.components.register('Questions/ExperimentNotFound', {
  viewModel: ExperimentNotFound,
  template: template.default,
});

export = ExperimentNotFound;
