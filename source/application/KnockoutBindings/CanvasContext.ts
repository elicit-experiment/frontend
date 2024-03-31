import knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: knockout.Observable<CanvasRenderingContext2D> = valueAccessor();
    value(element.getContext('2d'));
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as knockout.BindingHandler;
