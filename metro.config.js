// Permite empaquetar modelos .glb como assets (modelo de demo).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');
// El backend vive en ./server como proyecto independiente: Metro no debe indexarlo.
config.resolver.blockList = [/[\/]server[\/].*/];

module.exports = config;
