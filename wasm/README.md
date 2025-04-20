# WebAssembly Modules for Experiment Frontend

This directory contains WebAssembly (WASM) modules used in the experiment frontend application.

## Face Landmark WASM Module

The `face-landmark` directory contains a Rust implementation of the face landmark data compression algorithm. This replaces the TypeScript implementation for better performance.

### Building

The module is automatically built during the webpack build process using the `@wasm-tool/wasm-pack-plugin`. However, you can also build it manually:

1. Make sure you have Rust and wasm-pack installed:
   ```
   curl https://sh.rustup.rs -sSf | sh
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

2. Navigate to the face-landmark directory and build:
   ```
   cd wasm/face-landmark
   wasm-pack build --target web
   ```

3. The output will be in the `pkg` directory

### Rebuilding After Changes

After making changes to the Rust code, you need to rebuild the WASM module:

```
wasm-pack build --target web
```

Then rebuild the JavaScript application:

```
npm run build
```

### How It Works

The WASM module exposes a `compress_datapoint` function that takes:
- A component configuration object
- A FaceLandmarkerResult object from MediaPipe
- A timestamp

It returns a compressed version of the data, significantly reducing the size of the data while maintaining precision.

The compression algorithm:
1. Quantizes floating point values to integers
2. Removes unnecessary data based on configuration
3. Optimizes the structure for size

Using WASM improves performance by:
- Moving computationally intensive work to compiled code
- Reducing JavaScript garbage collection pressure
- Allowing for parallel processing in a Web Worker
