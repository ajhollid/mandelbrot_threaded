const path = require('path');

const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/scripts/mandelbrot.js',
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new CopyWebpackPlugin([
      {
        from: './src/index.html', to: './index.html',
      }, {
        from: './src/favicon.ico', to: './favicon.ico',
      }, {
        from: './src/css/style.css', to: './style.css',
      },
      {
        from: './src/css/normalize.css', to: './normalize.css',
      },
      {
        from: './src/css/skeleton.css', to: './skeleton.css',
      },
      {
        from: './src/scripts/jscolor.js', to: './jscolor.js',
      },
    ]),
  ],
  devtool: 'source-map',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      },
    ],
  },
};

