import * as knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: ko.Observable<number> = valueAccessor();
    value(element.width);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as ko.BindingHandler;
