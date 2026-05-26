const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace packages (libs/)
config.watchFolders = [
  path.resolve(monorepoRoot, 'libs'),
];

// Enable symlink resolution (required for pnpm)
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Resolution order: app node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Pin singletons to prevent "Invalid hook call" errors
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

module.exports = config;
