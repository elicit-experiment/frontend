export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: ko.Observable<HTMLElement> = valueAccessor();
    value(element);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as ko.BindingHandler;
