import knockout from 'knockout';
import Navigation = require('Managers/Navigation/Navigation');
import NavigationPage = require('Managers/Navigation/NavigationPage');
import TextFormatter = require('Managers/TextFormatter');
import ExperimentManager = require('Managers/Portal/Experiment');

class Shell {
  public Page: knockout.Observable<NavigationPage>;
  public FooterLabel: knockout.Computed<string>;
  public IsFooterVisible: knockout.Computed<boolean>;

  constructor() {
    this.Page = Navigation.CurrentPage;
    this.FooterLabel = knockout.computed(() => TextFormatter.Format(ExperimentManager.FooterLabel()));
    this.IsFooterVisible = knockout.computed(() => this.FooterLabel() != null && this.FooterLabel() !== '');
  }
}

import template = require('Components/Shell/Shell.html');
knockout.components.register('Shell', {
  viewModel: Shell,
  template: template.default,
});

export = Shell;
