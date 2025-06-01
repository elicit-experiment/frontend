declare module '*.json' {
  const content: any;
  export default content;
}

declare module '*.html' {
  const value: string;
  export default value;
}

// This enables TypeScript to understand that the Worker constructor
// can accept a URL object in the format used by Webpack 5
interface WorkerConstructor {
  new (stringUrl: string | URL, options?: WorkerOptions): Worker;
}

declare const __DEV__: boolean;
