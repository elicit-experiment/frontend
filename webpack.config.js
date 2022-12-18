var path = require('path');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const stylRoot = 'source/application/Style';
console.log(path.resolve(__dirname, `${stylRoot}/default.styl`));

module.exports = function (env) {
  return [
    // Configurations
    // This file contains 3 configurations (Node-single-js-file, Browser-single-js-file, Single-stylesheet-file).

    // [Browser-single-js-file]: Packing a library Javascript file.
    {
      plugins: [
        // new webpack.ProvidePlugin({
        //   PortalClient: path.resolve(path.join(__dirname, 'dependencies/PortalClient/PortalClient.min.js')),
        // }),
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: '[name]-[hash].css',
          chunkFilename: '[name]-[hash].css',
        }),
        new HtmlWebpackPlugin({
          filename: 'index.html',
          favicon: './dependencies/favicon.png',
          title: 'Cockpit Experiments',
          lang: 'en',
          meta: { charset: 'utf-8', viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no' },
          templateContent: '<div data-bind="component: \'Shell\'">Loading...</div>',
        }),
      ],
      entry: {
        elicit_experiment: path.resolve(__dirname, 'source/application/Main.ts'),
        style_module: path.resolve(__dirname, `${stylRoot}/default.styl`),
      },
      output: {
        library: 'ElicitExperiment',
        libraryTarget: 'var',
        filename: process.env.NODE_ENV === 'production' ? '[name]-[hash].js' : '[name].js',
        path: path.resolve(__dirname, 'dist'),
        devtoolModuleFilenameTemplate: process.env.NODE_ENV === 'production' ? '[resource-path]' : void 0,
      },
      target: 'web',
      module: {
        rules: [
          {
            test: /\.ts?(\?.+)?$/,
            use: ['ts-loader'],
          },
          {
            test: /\.html?(\?.+)?$/,
            use: ['html-loader'],
          },
          {
            test: /\.json/,
            type: 'asset/source',
          },
          {
            test: /\.(jpg|jpeg|png|ttf|otf|eot|svg|woff2?)(\?.+)?$/,
            type: 'asset/resource',
          },
          {
            test: /\.(styl)$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: {
                  sourceMap: true,
                },
              },
              {
                loader: 'stylus-loader', // compiles Styl to CSS
              },
            ],
          },

          // for bootstrap
          {
            test: /\.(scss)$/,
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
        ],
      },
      resolve: {
        fallback: { path: require.resolve('path-browserify') },
        plugins: [new TsconfigPathsPlugin()],
        extensions: ['.ts', '.js'],
        alias: {
          Components: path.resolve(__dirname, 'source/application/Components/'),
          Managers: path.resolve(__dirname, 'source/application/Managers'),
          Models: path.resolve(__dirname, 'source/application/Models'),
          Utility: path.resolve(__dirname, 'source/application/Utility'),
          Images: path.resolve(__dirname, 'source/application/Images'),
          PortalClient: path.resolve(path.join(__dirname, 'dependencies/PortalClient/PortalClient.min.js')),
        },
      },
      devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
      devServer: {
        static: {
          directory: path.resolve(__dirname, './source/'),
          publicPath: '/',
        },
        compress: true,
        port: 5504,
        // historyApiFallback: {
        //   index: 'default.html',
        // },
      },
    },
  ];
};
