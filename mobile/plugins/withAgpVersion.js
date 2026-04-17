const { withProjectBuildGradle, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Pins AGP 8.3.2, Kotlin 2.1.20, and Gradle 8.10.2 for EAS production builds.
 *
 * ROOT CAUSE (confirmed by inspecting generated android/ files):
 *   The app's android/build.gradle declares AGP WITHOUT a version:
 *     classpath('com.android.tools.build:gradle')   ← no version
 *   The version 8.7.3 comes from @react-native/gradle-plugin/gradle/libs.versions.toml:
 *     agp = "8.7.3"
 *   That package is included as a composite build (includeBuild) in settings.gradle and
 *   declares AGP as `implementation` (not compileOnly), intentionally owning the AGP
 *   version. This bypasses any resolutionStrategy.force in the app's build.gradle.
 *
 *   AGP 8.7.x breaks all RN submodule builds (react-native-async-storage,
 *   react-native-gesture-handler, etc.) because it adds a required AgpVersionAttr
 *   consumer attribute that old modules don't declare → "No variants exist" error.
 *
 * FIX: patch @react-native/gradle-plugin/gradle/libs.versions.toml to use agp = "8.3.2".
 *   Also pin Kotlin to 2.1.20 and Gradle wrapper to 8.10.2 for consistency.
 */

const AGP_VERSION = "8.3.2";
const KOTLIN_VERSION = "2.1.20";
const GRADLE_VERSION = "8.10.2";

module.exports = function withAgpVersion(config) {
  // ─── 1. Patch @react-native/gradle-plugin/gradle/libs.versions.toml ────────
  // This is the authoritative source of the AGP version used at build time.
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.projectRoot;

      try {
        const rnGradlePluginPkg = require.resolve(
          "@react-native/gradle-plugin/package.json",
          { paths: [projectRoot] }
        );
        const rnGradlePluginDir = path.dirname(rnGradlePluginPkg);
        const tomlPath = path.join(rnGradlePluginDir, "gradle", "libs.versions.toml");

        if (fs.existsSync(tomlPath)) {
          let c = fs.readFileSync(tomlPath, "utf8");
          const patched = c
            .replace(/^agp\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/m, `agp = "${AGP_VERSION}"`)
            .replace(/^kotlin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/m, `kotlin = "${KOTLIN_VERSION}"`);
          if (patched !== c) {
            fs.writeFileSync(tomlPath, patched);
            console.log(`[withAgpVersion] Patched ${tomlPath}`);
          }
        } else {
          console.warn(`[withAgpVersion] libs.versions.toml not found at ${tomlPath}`);
        }
      } catch (e) {
        console.warn("[withAgpVersion] Could not patch @react-native/gradle-plugin:", e.message);
      }

      return config;
    },
  ]);

  // ─── 2. Pin Kotlin in build.gradle ──────────────────────────────────────────
  config = withProjectBuildGradle(config, (config) => {
    let c = config.modResults.contents;

    if (!c.includes("kotlinVersion")) {
      c = c.replace(
        "buildscript {",
        `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n  }`
      );
    } else {
      c = c.replace(
        /kotlinVersion\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/,
        `kotlinVersion = "${KOTLIN_VERSION}"`
      );
    }

    c = c.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/g,
      `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`
    );

    config.modResults.contents = c;
    return config;
  });

  // ─── 3. Pin Gradle wrapper ───────────────────────────────────────────────────
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle/wrapper/gradle-wrapper.properties"
      );
      if (fs.existsSync(wrapperPath)) {
        let c = fs.readFileSync(wrapperPath, "utf8");
        const patched = c.replace(
          /distributionUrl=.*gradle-[0-9]+\.[0-9]+(?:\.[0-9]+)?-bin\.zip/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
        );
        if (patched !== c) fs.writeFileSync(wrapperPath, patched);
      }
      return config;
    },
  ]);

  return config;
};
