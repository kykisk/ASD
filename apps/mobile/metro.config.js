const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.unstable_enableSymlinks = true;

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => {
      const localPath = path.resolve(projectRoot, 'node_modules', String(name));
      const rootPath = path.resolve(monorepoRoot, 'node_modules', String(name));
      const fs = require('fs');
      if (fs.existsSync(localPath)) return localPath;
      if (fs.existsSync(rootPath)) return rootPath;
      return undefined;
    },
  },
);

module.exports = config;
