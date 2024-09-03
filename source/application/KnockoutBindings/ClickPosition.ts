import * as jQuery from 'jquery';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: (x: number, y: number) => void = valueAccessor();
    const $element = jQuery(element);
    jQuery(element).click((event) =>
      value.call(viewModel, event.pageX - $element.position().left, event.pageY - $element.position().top),
    );
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as ko.BindingHandler;
