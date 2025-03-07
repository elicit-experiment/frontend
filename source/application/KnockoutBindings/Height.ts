﻿import * as knockout from 'knockout';

export default {
  init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {
    const value: any = valueAccessor();

    if (typeof value == 'function') value(element.offsetHeight);
    else if (value.Value) {
      if (!value.Max || value.Value() < element.offsetHeight) value.Value(element.offsetHeight);
    } else throw new Error('Invalid configuration of Height binding: ' + value);
  },
  update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => {},
} as ko.BindingHandler;
