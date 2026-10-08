const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Expo SDK 51 uses @expo/metro-config under the hood; ensure exports resolver handles uuid commonjs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Let default resolver handle it
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
