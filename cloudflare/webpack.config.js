const path = require('path');

module.exports = {
  target: 'webworker',
  entry: './index.js', // Your main script
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'worker.js',
  },
  mode: 'production',
};
