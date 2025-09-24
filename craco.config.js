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
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all'
  }
};