import * as knockout from 'knockout';
import Navigation from 'Managers/Navigation/Navigation';
import NavigationPage from 'Managers/Navigation/NavigationPage';
import TextFormatter from 'Managers/TextFormatter';
import ExperimentManager from 'Managers/Portal/Experiment';

class Shell {
  public Page: ko.Observable<NavigationPage>;
  public FooterLabel: ko.Computed<string>;
  public IsFooterVisible: ko.Computed<boolean>;

  constructor() {
    this.Page = Navigation.CurrentPage;
    this.FooterLabel = knockout.computed(() => TextFormatter.Format(ExperimentManager.FooterLabel()));
    this.IsFooterVisible = knockout.computed(() => this.FooterLabel() != null && this.FooterLabel() !== '');
  }
}

import template from 'Components/Shell/Shell.html';
knockout.components.register('Shell', {
  viewModel: Shell,
  template,
});

export default Shell;
