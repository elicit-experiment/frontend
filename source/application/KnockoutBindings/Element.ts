import knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: knockout.Observable<HTMLElement> = valueAccessor();
    value(element);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as knockout.BindingHandler;
