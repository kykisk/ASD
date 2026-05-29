require('@expo/metro-runtime');
const { App } = require('expo-router/build/qualified-entry');
const { renderRootComponent } = require('expo-router/build/renderRootComponent');

renderRootComponent(App);
