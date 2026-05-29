const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;

config.watchFolders = [
  path.resolve(monorepoRoot, 'libs'),
];

config.resolver.unstable_enableSymlinks = true;

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const singletons = [
  'react',
  'react-native',
  'expo',
  'expo-router',
  'expo-modules-core',
];

config.resolver.extraNodeModules = singletons.reduce((acc, name) => {
  acc[name] = path.resolve(projectRoot, 'node_modules', name);
  return acc;
}, {});

const urlPrefix = '/' + path.relative(monorepoRoot, projectRoot);

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, _httpServer) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith(urlPrefix + '/')) {
        req.url = req.url.slice(urlPrefix.length);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
