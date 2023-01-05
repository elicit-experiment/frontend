/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const glob = require('glob');
const CompressionPlugin = require('compression-webpack-plugin');

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
        <div data-bind="component: \'Shell\'">Loading...</div>
        ${htmlWebpackPlugin.tags.bodyTags}
      </body>
    </html>
  `,
        }),
        new CompressionPlugin({
          algorithm: 'gzip',
        }),
      ],
      entry: {
        elicit_experiment: path.resolve(__dirname, 'source/application/Main.ts'),
        style_module: path.resolve(__dirname, `${stylRoot}/default.styl`),
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
      module: {
        rules: [
          {
            test: /\.ts?(\?.+)?$/,
            use: ['ts-loader'],
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
        extensions: ['.ts', '.js'],
        alias: {
          Components: path.resolve(__dirname, 'source/application/Components/'),
          Managers: path.resolve(__dirname, 'source/application/Managers'),
          Models: path.resolve(__dirname, 'source/application/Models'),
          Utility: path.resolve(__dirname, 'source/application/Utility'),
          Images: path.resolve(__dirname, 'source/application/Images'),
          KnockoutBindings: path.resolve(__dirname, 'source/application/KnockoutBindings'),
          PortalClient: path.resolve(path.join(__dirname, 'dependencies/PortalClient/PortalClient.min.js')),
          WebGazer: path.resolve(path.join(__dirname, 'dependencies/webgazer/webgazer.commonjs2.js')),
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
        compress: true,
        port: 5504,
        // historyApiFallback: {
        //   index: 'default.html',
        // },
      },
    },
  ];
};
