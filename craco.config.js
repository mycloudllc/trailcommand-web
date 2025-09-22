const fs = require('fs');
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      "react": "preact/compat",
      "react-dom": "preact/compat"
    },
    configure: (webpackConfig) => {
      // Configure JSX for Preact
      webpackConfig.resolve.alias['react/jsx-runtime'] = 'preact/jsx-runtime';
      webpackConfig.resolve.alias['react/jsx-dev-runtime'] = 'preact/jsx-dev-runtime';

      return webpackConfig;
    }
  },
  devServer: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/server.crt'))
    },
    host: '0.0.0.0',
    port: 3000
  }
};