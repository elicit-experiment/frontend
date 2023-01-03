import knockout = require('knockout');
import Navigation = require('Managers/Navigation/Navigation');
import NavigationPage = require('Managers/Navigation/NavigationPage');
import TextFormatter = require('Managers/TextFormatter');
import ExperimentManager = require('Managers/Portal/Experiment');

class Shell {
  public Page: KnockoutObservable<NavigationPage>;
  public FooterLabel: KnockoutComputed<string>;
  public IsFooterVisible: KnockoutComputed<boolean>;

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
