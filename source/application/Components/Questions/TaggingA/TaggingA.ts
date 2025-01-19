import * as knockout from 'knockout';
import TaggingBase from 'Components/Questions/Base/TaggingBase';

class TaggingA extends TaggingBase {
  protected readonly InstrumentTemplateName = 'TaggingA';
}

import template from 'Components/Questions/TaggingA/TaggingA.html';
knockout.components.register('Questions/TaggingA', {
  viewModel: TaggingA,
  template,
});

export default TaggingA;
