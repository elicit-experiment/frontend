import { KoComponent } from '../../Utility/KoDecorators';

@KoComponent()
class ExperimentNotFound {
  public Id: string;

  constructor(data: string) {
    this.Id = data;
  }
}

export = ExperimentNotFound;
