const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
      assetModuleFilename: 'static/media/[name].[hash][ext]',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        "util": false,
        "path": false,
        "stream": false,
        "buffer": false,
        "fs": false,
        "os": false,
        "crypto": false,
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.app.json'),
            },
          },
        },
        {
          test: /\.css$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('@tailwindcss/postcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        inject: 'body',
      }),
      new webpack.DefinePlugin({
        'process.env.VITE_AUTH_SERVICE_URL': JSON.stringify(process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:6401'),
        'process.env.VITE_IMAGE_SERVICE_URL': JSON.stringify(process.env.VITE_IMAGE_SERVICE_URL || 'http://localhost:6402'),
        'process.env.VITE_VISION_SERVICE_URL': JSON.stringify(process.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403'),
        'process.env.VITE_RESULTS_SERVICE_URL': JSON.stringify(process.env.VITE_RESULTS_SERVICE_URL || 'http://localhost:6404'),
        'process.env.VITE_LABWARE_SERVICE_URL': JSON.stringify(process.env.VITE_LABWARE_SERVICE_URL || 'http://localhost:6405'),
        'process.env.VITE_PREDICTION_SERVICE_URL': JSON.stringify(process.env.VITE_PREDICTION_SERVICE_URL || 'http://localhost:6406'),
        'process.env.VITE_VISION_CAPTURE_SERVICE_URL': JSON.stringify(process.env.VITE_VISION_CAPTURE_SERVICE_URL || 'http://localhost:6407'),
        'process.env.VITE_MINIO_BASE_URL': JSON.stringify(process.env.VITE_MINIO_BASE_URL || 'http://localhost:9000'),
        'process.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || ''),
        'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:6400'),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.browser': true,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^winston$/,
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'build'),
      },
      port: 6410,
      host: '0.0.0.0',
      hot: true,
      historyApiFallback: true,
      open: false,
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    },
  };
};

