import knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: knockout.Observable<number> = valueAccessor();
    value(element.width);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as knockout.BindingHandler;
