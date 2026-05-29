const Screens = require('react-native-screens');
if (!Screens.featureFlags) {
  Screens.featureFlags = {};
}
if (!Screens.featureFlags.experiment) {
  Screens.featureFlags.experiment = {};
}

require('@expo/metro-runtime');
const { App } = require('expo-router/build/qualified-entry');
const { renderRootComponent } = require('expo-router/build/renderRootComponent');

renderRootComponent(App);
