// craco.config.js
const path = require("path");
require("dotenv").config();

const isDevServer = process.env.NODE_ENV !== "production";

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      if (webpackConfig.devServer) {
        delete webpackConfig.devServer.onBeforeSetupMiddleware;
        delete webpackConfig.devServer.onAfterSetupMiddleware;

        if (webpackConfig.devServer.https) {
          webpackConfig.devServer.server = {
            type: 'https',
            options: webpackConfig.devServer.https === true ? {} : webpackConfig.devServer.https
          };
          delete webpackConfig.devServer.https;
        }
      }

      return webpackConfig;
    },
  },
};

if (isDevServer) {
  webpackConfig.devServer = (devServerConfig) => {
    const fs = require('fs');
    const paths = require('react-scripts/config/paths');
    const evalSourceMapMiddleware = require('react-scripts/config/webpackDevServer.config').evalSourceMapMiddleware ||
      require('react-dev-utils/evalSourceMapMiddleware');
    const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware');
    const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');

    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;
    delete devServerConfig.https;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      if (evalSourceMapMiddleware) {
        devServer.app.use(evalSourceMapMiddleware(devServer));
      }

      if (fs.existsSync(paths.proxySetup)) {
        require(paths.proxySetup)(devServer.app);
      }

      devServer.app.use(redirectServedPath(paths.publicUrlOrPath));
      devServer.app.use(noopServiceWorkerMiddleware(paths.publicUrlOrPath));

      return middlewares;
    };

    return devServerConfig;
  };
}

module.exports = webpackConfig;
