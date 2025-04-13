declare module '*.json' {
  const content: any;
  export default content;
}

// This enables TypeScript to understand that the Worker constructor
// can accept a URL object in the format used by Webpack 5
interface WorkerConstructor {
  new(stringUrl: string | URL, options?: WorkerOptions): Worker;
}