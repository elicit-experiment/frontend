import knockout from 'knockout';
import jquery = require('jquery');
export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: (x: number, y: number) => void = valueAccessor();
    const $element = jquery(element);
    jquery(element).click((event) =>
      value.call(viewModel, event.pageX - $element.position().left, event.pageY - $element.position().top),
    );
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as knockout.BindingHandler;
