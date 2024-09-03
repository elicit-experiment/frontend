import * as knockout from 'knockout';

class ExperimentNotFound {
  public Id: string;

  constructor(data: string) {
    this.Id = data;
  }
}

import template from 'Components/ExperimentNotFound/ExperimentNotFound.html';
knockout.components.register('Questions/ExperimentNotFound', {
  viewModel: ExperimentNotFound,
  template,
});

export default ExperimentNotFound;
