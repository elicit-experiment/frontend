import * as knockout from 'knockout';

export interface IKoComponentOptions extends knockout.components.Config {
  synchronous?: boolean | undefined;
  name?: string;
}


export interface IKoComponentStatic {
  new (...param: any[]): IKoComponentInstance;
}

export interface IKoComponentInstance {}

export function KoComponent(options: IKoComponentOptions| undefined = undefined) {
  return (clazz: IKoComponentStatic): any => {
    if (!options) {
      options = {
        template: require(`Components/${clazz.name}/${clazz.name}.html`),
      };
    }
    console.log(`options.name ${options.name} clazz.name ${clazz.name}`);
    knockout.components.register(options.name || clazz.name, { viewModel: clazz, ...options });
    return clazz;
  };
}

export function KoComponent2(template: any, options: IKoComponentOptions | undefined = undefined) {
  return (clazz: IKoComponentStatic): any => {
    if (!options) {
      options = {
        template: template,
      };
    }
    knockout.components.register(options.name || clazz.name, { viewModel: clazz, ...options });
    return clazz;
  };
}
export interface IKoModuleOptions {
  /** Array of Components and/or Directives */
  declarations?: any[];
}

export interface IKoModuleStatic {
  new (): IKoModuleInstance;
}

export interface IKoModuleInstance {}

export function KoModule(name: string, options: IKoModuleOptions) {
  return (clazz: IKoModuleStatic): any => {
    // if (options.declarations) {
    //     for (const d of options.declarations) {
    //     }
    // }
    return clazz;
  };
}
