const path = require('path');
const merge = require('webpack-merge');
const parts = require('./webpack.parts');
const glob = require('glob');

const PATHS = {
  app: path.join(__dirname, 'src'),
};

const commonConfig = merge([
  {
    output: {
      // Needed for code splitting to work in nested paths
      publicPath: '/',
    },
  },
  parts.loadJavaScript({ include: PATHS.app }),
]);

const productionConfig = merge([
  {
    performance: {
      hints: 'warning', // "error" or false are valid too
      maxEntrypointSize: 150000, // in bytes, default 250k
      maxAssetSize: 450000, // in bytes
    },
  },
  {
    recordsPath: path.join(__dirname, 'records.json'),
    output: {
      chunkFilename: '[name].[chunkhash:4].js',
      filename: '[name].[chunkhash:4].js',
    },
  },
  parts.clean(),
  parts.minifyJavaScript(),
  parts.minifyCSS({
    options: {
      discardComments: {
        removeAll: true,
      },
      // Run cssnano in safe mode to avoid
      // potentially unsafe transformations.
      safe: true,
    },
  }),
  parts.extractCSS({
    use: ['css-loader', 'sass-loader', parts.autoprefix()],
  }),
  parts.purifyCSS({
    paths: glob.sync(PATHS.app + '/**/*.js', { nodir: true }),
  }),
  parts.loadImages({
    options: {
      limit: 15000,
      name: '[name].[hash:4].[ext]',
    },
  }),
  parts.generateSourceMaps({ type: 'source-map' }),
  {
    optimization: {
      splitChunks: {
        chunks: 'initial',
      },
      runtimeChunk: {
        name: 'manifest',
      },
    },
  },
]);

const developmentConfig = merge([
  parts.devServer({
    // Customize host/port here if needed
    host: process.env.HOST,
    port: process.env.PORT,
  }),
  parts.loadCSS(),
]);

module.exports = mode => {
  const pages = [
    // index page
    parts.page({
      title: 'App',
      entry: {
        app: PATHS.app,
      },
      chunks: ['manifest', 'app', 'vendors~app'],
      template: './src/index.html',
    }),
    // about page
    parts.page({
      name: 'about',
      title: 'About',
      path: 'pages',
      entry: {
        about: path.join(PATHS.app, 'pages', 'about.js'),
      },
      chunks: ['manifest', 'about', 'vendors~app'],
    }),
  ];
  const config = mode === 'production' ? productionConfig : developmentConfig;

  return merge([commonConfig, config, { mode }].concat(pages));
};
