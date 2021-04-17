import knockout = require('knockout');
import DisposableComponent = require('Components/DisposableComponent');

type Item = { Label: string; Id: string };

export default class Rating extends DisposableComponent {
  public Name: string;
  public Items: Item[] = [];
  public Answer = knockout.observable<string>(null);
  public Selected = knockout.observable<Item>(null);
  public CanAnswer = knockout.observable(true);

  constructor() {
    super();
    this.Name = new Date().getTime().toString();

    for (let i = 1; i <= 9; i++) this.Items.push(this.CreateItem(i.toString()));
  }

  public CreateItem(label: string): Item {
    return {
      Id: this.Name + '_' + label,
      Label: label,
    };
  }
}
