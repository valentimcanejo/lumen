const { withProjectBuildGradle, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Pins AGP, Kotlin and Gradle wrapper versions in the generated android/ directory.
 *
 * Why this is needed:
 *   - EAS CLI 18.4+ generates AGP 8.7.3+, which breaks variant resolution for RN modules.
 *   - AGP 8.7.x causes "No variants exist" errors on all RN submodules due to
 *     AgpVersionAttr variant matching changes introduced in 8.7.
 *   - Gradle 8.6/8.7 cause "Unresolved reference extensions/extra" in
 *     expo-autolinking-settings-plugin (bundled Kotlin version mismatch).
 *
 * Solution: pin AGP → 8.3.2, Kotlin → 2.1.20, Gradle wrapper → 8.10.2.
 *
 * The AGP version can live in multiple places depending on the Expo/RN template:
 *   1. android/build.gradle        — classic classpath format
 *   2. android/settings.gradle     — modern pluginManagement plugins {} block
 *   3. android/gradle/libs.versions.toml — version catalog (RN 0.74+)
 * This plugin patches all three locations so whichever is in use gets updated.
 */

const AGP_VERSION = "8.3.2";
const KOTLIN_VERSION = "2.1.20";
const GRADLE_VERSION = "8.10.2";

module.exports = function withAgpVersion(config) {
  // 1. Pin AGP + Kotlin in build.gradle (classic classpath format)
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Classic: classpath("com.android.tools.build:gradle:X.X.X")
    if (contents.includes("com.android.tools.build:gradle:")) {
      contents = contents.replace(
        /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g,
        `com.android.tools.build:gradle:${AGP_VERSION}`
      );
    }

    // Pin Kotlin via ext block
    if (!contents.includes("kotlinVersion")) {
      contents = contents.replace(
        "buildscript {",
        `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n  }`
      );
    } else {
      contents = contents.replace(
        /kotlinVersion\s*=\s*["'][0-9]+\.[0-9]+(?:\.[0-9]+)?["']/,
        `kotlinVersion = "${KOTLIN_VERSION}"`
      );
    }

    // Pin explicit kotlin-gradle-plugin classpath version
    contents = contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/g,
      `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`
    );

    config.modResults.contents = contents;
    return config;
  });

  // 2. Patch settings.gradle, libs.versions.toml, and gradle-wrapper.properties
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.platformProjectRoot;

      // --- settings.gradle (modern pluginManagement plugins {} block) ---
      const settingsPath = path.join(root, "settings.gradle");
      if (fs.existsSync(settingsPath)) {
        let contents = fs.readFileSync(settingsPath, "utf8");
        let changed = false;

        // id "com.android.application" version "X.X.X" apply false
        const newContents = contents
          .replace(
            /id\s*\(?['"]com\.android\.application['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
            `id 'com.android.application' version '${AGP_VERSION}'`
          )
          .replace(
            /id\s*\(?['"]com\.android\.library['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
            `id 'com.android.library' version '${AGP_VERSION}'`
          )
          .replace(
            /id\s*\(?['"]com\.android\.test['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
            `id 'com.android.test' version '${AGP_VERSION}'`
          )
          // Kotlin plugin version in settings.gradle pluginManagement
          .replace(
            /id\s*\(?['"]org\.jetbrains\.kotlin\.android['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
            `id 'org.jetbrains.kotlin.android' version '${KOTLIN_VERSION}'`
          );

        if (newContents !== contents) {
          fs.writeFileSync(settingsPath, newContents);
        }
      }

      // --- gradle/libs.versions.toml (version catalog, RN 0.74+) ---
      const tomlPath = path.join(root, "gradle", "libs.versions.toml");
      if (fs.existsSync(tomlPath)) {
        let contents = fs.readFileSync(tomlPath, "utf8");
        const newContents = contents
          // Common keys for AGP in version catalogs
          .replace(/\bagp\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g, `agp = "${AGP_VERSION}"`)
          .replace(
            /\bandroidGradlePlugin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g,
            `androidGradlePlugin = "${AGP_VERSION}"`
          )
          .replace(
            /\bandroid_gradle_plugin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g,
            `android_gradle_plugin = "${AGP_VERSION}"`
          )
          // Kotlin version in toml
          .replace(
            /\bkotlin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g,
            `kotlin = "${KOTLIN_VERSION}"`
          );
        if (newContents !== contents) {
          fs.writeFileSync(tomlPath, newContents);
        }
      }

      // --- gradle-wrapper.properties ---
      const wrapperPath = path.join(root, "gradle/wrapper/gradle-wrapper.properties");
      if (fs.existsSync(wrapperPath)) {
        let contents = fs.readFileSync(wrapperPath, "utf8");
        const newContents = contents.replace(
          /distributionUrl=.*gradle-[0-9]+\.[0-9]+(?:\.[0-9]+)?-bin\.zip/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
        );
        if (newContents !== contents) {
          fs.writeFileSync(wrapperPath, newContents);
        }
      }

      return config;
    },
  ]);

  return config;
};
