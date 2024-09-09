export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: KnockoutObservable<HTMLElement> = valueAccessor();
    value(element);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as KnockoutBindingHandler;
