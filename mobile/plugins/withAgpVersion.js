const { withProjectBuildGradle, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Pins AGP, Kotlin and Gradle wrapper versions in the generated android/ directory.
 *
 * Why this is needed:
 *   - EAS CLI 18.4+ generates AGP 8.11.0+, which breaks variant resolution for RN modules
 *     (expo-modules-core, react-native-track-player, etc.).
 *   - AGP 8.7.x caused "No variants exist" errors on RN submodules (async-storage,
 *     reanimated, gesture-handler, etc.) due to Kotlin/variant configuration failures.
 *   - AGP 8.3.2 + Gradle 8.6 is the most stable combination for Expo SDK 54 / RN 0.81.x.
 *
 * Solution: pin AGP → 8.7.3, Kotlin → 2.1.20, Gradle wrapper → 8.10.2.
 */
module.exports = function withAgpVersion(config) {
  // 1. Pin AGP and Kotlin in build.gradle
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Pin AGP to 8.7.3
    contents = contents.replace(
      /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g,
      "com.android.tools.build:gradle:8.7.3"
    );

    // Pin Kotlin compiler to 2.1.20 via ext + explicit classpath version.
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

  // 2. Pin Gradle wrapper to 8.10.2
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle/wrapper/gradle-wrapper.properties"
      );
      if (fs.existsSync(wrapperPath)) {
        let contents = fs.readFileSync(wrapperPath, "utf8");
        contents = contents.replace(
          /distributionUrl=.*gradle-[0-9]+\.[0-9]+(?:\.[0-9]+)?-bin\.zip/,
          "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip"
        );
        fs.writeFileSync(wrapperPath, contents);
      }
      return config;
    },
  ]);

  return config;
};
