// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-native-webrtc bundles its own copy of `event-target-shim`, whose
// package.json `exports` field doesn't list the `./index` subpath that
// react-native-webrtc imports directly. With Metro's newer strict
// "package exports" resolution (default in Expo SDK 54+), this causes a
// noisy "Attempted to import the module ... not listed in exports" warning
// on every bundle (it still falls back and works, but it's not clean).
//
// Disabling unstable_enablePackageExports makes Metro use the older,
// more permissive Node-style resolution for all packages, which resolves
// this cleanly without needing to patch node_modules.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
