import Shell from 'Components/Shell/Shell';

class NameConventionLoader implements KnockoutComponentTypes.Loader {
  public getConfig(componentName: string, callback: (result: KnockoutComponentTypes.ComponentConfig) => void): void {
    const filePath = NameConventionLoader.GetFilePath(componentName);

    callback({
      viewModel: { require: filePath },
      template: { require: 'text!' + filePath + '.html' },
    });
  }

  public static GetFilePath(name: string): string {
    console.log(name);
    const filePath = name + (name.lastIndexOf('/') === -1 ? `/${name}` : name.substring(name.lastIndexOf('/')));

    console.log(filePath);
    return 'Components/' + filePath;
  }
}

export = NameConventionLoader;
