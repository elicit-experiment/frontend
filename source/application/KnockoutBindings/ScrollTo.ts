import knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: knockout.Observable<(duration: number) => void> = valueAccessor();

    const $element = jQuery(element);
    const $document = jQuery('html, body');

    value((duration) => {
      $document.animate({ scrollTop: $element.offset().top }, duration);
    });
  },
} as knockout.BindingHandler;
