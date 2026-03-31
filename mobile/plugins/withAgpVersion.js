const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Pins the Android Gradle Plugin version in build.gradle.
 * EAS CLI 18.4+ uses an environment that generates AGP 8.11.0, which breaks
 * variant resolution for several React Native modules. Expo SDK 54 was
 * designed for AGP ~8.7.x where this issue doesn't exist.
 */
module.exports = function withAgpVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g,
      "com.android.tools.build:gradle:8.7.3"
    );
    return config;
  });
};
