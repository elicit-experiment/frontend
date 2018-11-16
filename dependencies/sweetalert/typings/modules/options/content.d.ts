export interface ContentOptions {
    element: string | Node;
    attributes?: Object;
}
export declare const getContentOpts: (contentParam: string | Object) => ContentOptions;
