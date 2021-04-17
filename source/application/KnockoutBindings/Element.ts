import knockout = require('knockout');

knockout.bindingHandlers['Element'] = {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: KnockoutObservable<HTMLElement> = valueAccessor();
    value(element);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
};
