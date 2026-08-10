module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 requires the worklets babel plugin for animations.
    plugins: ['react-native-worklets/plugin'],
  };
};
