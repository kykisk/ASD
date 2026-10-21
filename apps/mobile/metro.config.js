const path = require('path');
const fs = require('fs');
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
      if (fs.existsSync(localPath)) return localPath;
      if (fs.existsSync(rootPath)) return rootPath;
      return undefined;
    },
  },
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const tsName = moduleName.slice(0, -3) + '.ts';
    const tsxName = moduleName.slice(0, -3) + '.tsx';
    const originDir = path.dirname(context.originModulePath);
    const tsPath = path.resolve(originDir, tsName);
    const tsxPath = path.resolve(originDir, tsxName);
    // 플랫폼별 파일(foo.web.ts 등)이 있으면 우선 사용
    if (platform) {
      for (const ext of ['.ts', '.tsx']) {
        const platformName = `${moduleName.slice(0, -3)}.${platform}${ext}`;
        if (fs.existsSync(path.resolve(originDir, platformName))) {
          return context.resolveRequest(context, platformName, platform);
        }
      }
    }

    if (fs.existsSync(tsPath)) {
      return context.resolveRequest(context, tsName, platform);
    }
    if (fs.existsSync(tsxPath)) {
      return context.resolveRequest(context, tsxName, platform);
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
