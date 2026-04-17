const { withProjectBuildGradle, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Forces AGP 8.3.2, Kotlin 2.1.20, and Gradle 8.10.2 in the generated android/ directory.
 *
 * Problem: EAS CLI now generates AGP 8.7.3+. AGP 8.7.x introduces a new consumer attribute
 * (AgpVersionAttr) that causes "No variants exist" for all RN submodules that don't
 * declare it. AGP 8.3.2 doesn't add this attribute requirement.
 *
 * Why string replacement alone is insufficient:
 *   The AGP version can be declared in multiple places depending on the Expo/RN template
 *   version (build.gradle classpath, settings.gradle pluginManagement plugins{} block,
 *   gradle/libs.versions.toml), and we can't know which format the current EAS CLI version
 *   generates without inspecting the file. So we apply both:
 *   1. String replacements across all known locations
 *   2. Gradle-level resolution strategy override (works regardless of declaration format)
 */

const AGP_VERSION = "8.3.2";
const KOTLIN_VERSION = "2.1.20";
const GRADLE_VERSION = "8.10.2";

module.exports = function withAgpVersion(config) {
  // ─── 1. build.gradle ────────────────────────────────────────────────────────
  config = withProjectBuildGradle(config, (config) => {
    let c = config.modResults.contents;

    // 1a. Classic classpath format
    c = c.replace(
      /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g,
      `com.android.tools.build:gradle:${AGP_VERSION}`
    );

    // 1b. Modern top-level plugins {} block in build.gradle
    //     id "com.android.application" version "8.7.3" apply false
    c = c.replace(
      /id\s*\(?['"]com\.android\.application['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
      `id 'com.android.application' version '${AGP_VERSION}'`
    );
    c = c.replace(
      /id\s*\(?['"]com\.android\.library['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
      `id 'com.android.library' version '${AGP_VERSION}'`
    );

    // 1c. Kotlin version in ext block
    if (!c.includes("kotlinVersion")) {
      c = c.replace(
        "buildscript {",
        `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n  }`
      );
    } else {
      c = c.replace(
        /kotlinVersion\s*=\s*["'][0-9]+\.[0-9]+(?:\.[0-9]+)?["']/,
        `kotlinVersion = "${KOTLIN_VERSION}"`
      );
    }

    // 1d. Explicit kotlin-gradle-plugin classpath version
    c = c.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/g,
      `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`
    );

    // 1e. Gradle-level force resolution — overrides whatever version is on the classpath.
    //     This is the nuclear option: even if none of the regexes above matched,
    //     Gradle will still resolve AGP to 8.3.2 at dependency resolution time.
    if (!c.includes("resolutionStrategy.force")) {
      c = c.replace(
        "buildscript {",
        `buildscript {\n  configurations.all {\n    resolutionStrategy.force "com.android.tools.build:gradle:${AGP_VERSION}"\n  }`
      );
    }

    config.modResults.contents = c;
    return config;
  });

  // ─── 2. settings.gradle + libs.versions.toml + gradle-wrapper.properties ───
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.platformProjectRoot;

      // ── settings.gradle ──────────────────────────────────────────────────────
      const settingsPath = path.join(root, "settings.gradle");
      if (fs.existsSync(settingsPath)) {
        let c = fs.readFileSync(settingsPath, "utf8");

        // String replacements for plugins{} block
        c = c
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
          .replace(
            /id\s*\(?['"]org\.jetbrains\.kotlin\.android['"]\)?\s+version\s*\(?['"][0-9]+\.[0-9]+\.[0-9]+['"]\)?/g,
            `id 'org.jetbrains.kotlin.android' version '${KOTLIN_VERSION}'`
          );

        // Inject resolutionStrategy into pluginManagement (or prepend a new block).
        // This forces AGP version at Gradle plugin-resolution level, covering any
        // format that string replacements might miss.
        if (!c.includes("eachPlugin")) {
          const resolutionBlock =
            `  resolutionStrategy {\n` +
            `    eachPlugin {\n` +
            `      if (requested.id.id.startsWith("com.android.")) {\n` +
            `        useVersion("${AGP_VERSION}")\n` +
            `      }\n` +
            `    }\n` +
            `  }`;

          if (c.includes("pluginManagement {")) {
            // Inject inside the existing block
            c = c.replace("pluginManagement {", `pluginManagement {\n${resolutionBlock}`);
          } else {
            // Prepend a new block before everything else
            c =
              `pluginManagement {\n${resolutionBlock}\n}\n` + c;
          }
        }

        fs.writeFileSync(settingsPath, c);
      }

      // ── gradle/libs.versions.toml ─────────────────────────────────────────────
      const tomlPath = path.join(root, "gradle", "libs.versions.toml");
      if (fs.existsSync(tomlPath)) {
        let c = fs.readFileSync(tomlPath, "utf8");
        c = c
          .replace(/\bagp\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g, `agp = "${AGP_VERSION}"`)
          .replace(
            /\bandroidGradlePlugin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g,
            `androidGradlePlugin = "${AGP_VERSION}"`
          )
          .replace(
            /\bkotlin\s*=\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/g,
            `kotlin = "${KOTLIN_VERSION}"`
          );
        fs.writeFileSync(tomlPath, c);
      }

      // ── gradle-wrapper.properties ──────────────────────────────────────────────
      const wrapperPath = path.join(root, "gradle/wrapper/gradle-wrapper.properties");
      if (fs.existsSync(wrapperPath)) {
        let c = fs.readFileSync(wrapperPath, "utf8");
        c = c.replace(
          /distributionUrl=.*gradle-[0-9]+\.[0-9]+(?:\.[0-9]+)?-bin\.zip/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
        );
        fs.writeFileSync(wrapperPath, c);
      }

      return config;
    },
  ]);

  return config;
};
