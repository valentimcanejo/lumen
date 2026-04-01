const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Pins AGP and Kotlin versions in the generated android/build.gradle.
 *
 * Why this is needed:
 *   - EAS CLI 18.4+ generates AGP 8.11.0, which breaks variant resolution for RN modules
 *     (expo-modules-core, react-native-track-player, etc.). SDK 54 targets AGP ~8.7.x.
 *   - The generated build.gradle has an unversioned kotlin-gradle-plugin classpath.
 *     On EAS the resolved version ends up as 1.9.0, but react-android and kotlin-stdlib
 *     are compiled with Kotlin 2.1 metadata — causing a "incompatible version" compile error.
 *
 * Solution: pin AGP → 8.7.3, Kotlin compiler → 2.1.20 explicitly.
 */
module.exports = function withAgpVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Pin AGP to 8.7.3
    contents = contents.replace(
      /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g,
      "com.android.tools.build:gradle:8.7.3"
    );

    // Pin Kotlin compiler to 2.1.20 via ext + explicit classpath version.
    // Adds ext { kotlinVersion = "2.1.20" } before the buildscript block if not present,
    // then replaces the unversioned kotlin-gradle-plugin classpath entry.
    if (!contents.includes("kotlinVersion")) {
      contents = contents.replace(
        "buildscript {",
        'buildscript {\n  ext {\n    kotlinVersion = "2.1.20"\n  }'
      );
    }
    contents = contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/g,
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
    );

    config.modResults.contents = contents;
    return config;
  });
};
