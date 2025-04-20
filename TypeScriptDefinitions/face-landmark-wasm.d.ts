declare module 'FaceLandmarkWasm' {
  //export function default(): Promise<typeof import('FaceLandmarkWasm')>;
  export function compress_datapoint(config: any, dataPoint: any, timestamp: number, toJson: boolean): any;
  export function memory_info(): any;
  export function get_performance_now(): number;
  export function add_timestamp(obj: any, name: string): any;
}

declare module 'FaceLandmarkWasm/face_landmark' {
  //export function default(): Promise<typeof import('FaceLandmarkWasm')>;
  export function compress_datapoint(config: any, dataPoint: any, timestamp: number): any;
  export function memory_info(): any;
  export function get_performance_now(): number;
  export function add_timestamp(obj: any, name: string): any;
}

declare module 'FaceLandmarkWasm/wasm_stub' {
  //export function default(): Promise<typeof import('FaceLandmarkWasm')>;
  export function compress_datapoint(config: any, dataPoint: any, timestamp: number): any;
  export function memory_info(): any;
  export function get_performance_now(): number;
  export function add_timestamp(obj: any, name: string): any;
}
