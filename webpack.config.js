/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const glob = require('glob');
const CompressionPlugin = require('compression-webpack-plugin');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const stylRoot = 'source/application/Style';
templates = glob.sync('source/application/Components/**/*.html');

module.exports = function (env) {
  return [
    // Configurations
    // This file contains 3 configurations (Node-single-js-file, Browser-single-js-file, Single-stylesheet-file).

    // [Browser-single-js-file]: Packing a library Javascript file.
    {
      stats: { errorDetails: true },
      plugins: [
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
        }),
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: '[name]-[contenthash].css',
          chunkFilename: '[name]-[contenthash].css',
        }),
        new HtmlWebpackPlugin({
          filename: 'index.html',
          favicon: './dependencies/favicon.png',
          title: 'Cockpit Experiments',
          lang: 'en',
          minify: false,
          meta: { charset: 'utf-8', viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no' },
          templateContent: ({ htmlWebpackPlugin }) => `
    <!DOCTYPE html>
    <html>
      <body>
        <div data-bind="component: \'Shell\'" class="shell">Loading...</div>
        ${htmlWebpackPlugin.tags.bodyTags}
      </body>
    </html>
  `,
        }),
        new CompressionPlugin({
          algorithm: 'gzip',
        }),
        new WasmPackPlugin({
          crateDirectory: path.resolve(__dirname, 'wasm/face-landmark'),
          outDir: path.resolve(__dirname, 'wasm/face-landmark/pkg'),
          outName: 'face_landmark',
          forceMode: 'production',
        }),
        new CopyPlugin({
          patterns: [
            {
              from: 'wasm/face-landmark/src/wasm_stub.js',
              to: 'wasm/face-landmark/pkg/wasm_stub.js',
            },
          ],
        }),
      ],
      entry: {
        elicit_experiment: path.resolve(__dirname, 'source/application/Main.ts'),
        //templates: templates.map((template) => path.resolve(__dirname, template)),
      },
      output: {
        library: 'ElicitExperiment',
        libraryTarget: 'var',
        filename: '[name]-[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        devtoolModuleFilenameTemplate: process.env.NODE_ENV === 'production' ? '[resource-path]' : void 0,
      },
      target: 'web',
      experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true,
      },
      module: {
        rules: [
          {
            test: /\.ts?(\?.+)?$/,
            use: ['ts-loader'],
          },
          {
            test: /\.wasm$/,
            type: 'webassembly/async',
          },
          {
            test: /\.html?(\?.+)?$/,
            use: [
              {
                loader: 'html-loader',
                options: {
                  minimize: {
                    removeComments: false,
                    collapseWhitespace: false,
                  },
                },
              },
            ],
          },
          {
            test: /\.json/,
            type: 'asset/source',
          },
          {
            test: /\.(jpg|jpeg|png|ttf|otf|eot|svg|woff2?)(\?.+)?$/,
            type: 'asset/resource',
          },
          // for bootstrap
          {
            test: /\.(s?css)$/,
            use: [
              {
                loader: 'style-loader',
              },
              {
                loader: 'css-loader',
              },
              {
                loader: 'postcss-loader',
                options: {
                  postcssOptions: {
                    plugins: () => [require('autoprefixer')],
                  },
                },
              },
              {
                loader: 'sass-loader',
              },
            ],
          },
          {
            test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            include: path.resolve(__dirname, './node_modules/bootstrap-icons/font/fonts'),
            type: 'asset/resource',
            generator: {
              //filename: 'fonts/[name]-[hash][ext][query]'
              filename: 'fonts/[name][ext][query]',
            },
            // xuse: {
            //   loader: 'file-loader',
            //   options: {
            //     name: '[name].[ext]',
            //     outputPath: 'fonts',
            //     publicPath: '../fonts',
            //   },
            // },
          },
        ],
      },
      resolve: {
        fallback: { path: require.resolve('path-browserify') },
        plugins: [new TsconfigPathsPlugin()],
        extensions: ['.ts', '.js', '.wasm'],
        alias: {
          Source: path.resolve(__dirname, 'source/'),
          Components: path.resolve(__dirname, 'source/application/Components/'),
          Managers: path.resolve(__dirname, 'source/application/Managers'),
          Models: path.resolve(__dirname, 'source/application/Models'),
          Utility: path.resolve(__dirname, 'source/application/Utility'),
          Images: path.resolve(__dirname, 'source/application/Images'),
          KnockoutBindings: path.resolve(__dirname, 'source/application/KnockoutBindings'),
          PortalClient: path.resolve(path.join(__dirname, 'dependencies/PortalClient/PortalClient.min.js')),
          WebGazer: path.resolve(path.join(__dirname, 'dependencies/webgazer/webgazer.commonjs2.js')),
          FaceLandmarkWasm: path.resolve(__dirname, 'wasm/face-landmark/pkg'),
        },
      },
      optimization: {
        //        minimize: false,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: true,
            },
          }),
        ],
      },
      devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
      devServer: {
        static: {
          directory: path.resolve(__dirname, './source/'),
          publicPath: '/',
        },
        compress: process.env.NODE_ENV === 'production',
        port: 5504,
        // Set cross-origin isolation headers for SharedArrayBuffer support
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        // historyApiFallback: {
        //   index: 'default.html',
        // },
      },
    },
  ];
};
