export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: KnockoutObservable<CanvasRenderingContext2D> = valueAccessor();
    value(element.getContext('2d'));
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as KnockoutBindingHandler;
