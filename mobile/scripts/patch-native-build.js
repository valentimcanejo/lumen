/**
 * Patches native Android build files after npm install.
 * Needed because EAS CLI 18.4+ brings @react-native/gradle-plugin 0.81.5
 * which sets AGP 8.11.0 — incompatible with some modules.
 *
 * Constraints discovered during builds:
 *   - AGP 8.11 breaks variant resolution for all RN modules → pin to 8.7.3
 *   - react-native-track-player fails with Kotlin 2.1 K2 strict mode
 *     → Kotlin compiler is pinned to 2.1.20 in android/build.gradle (explicit)
 *     → RNTP gets languageVersion 1.9 override so it compiles under the 2.1 compiler
 */
const fs = require("fs");
const path = require("path");

function patch(filePath, description, fn) {
  try {
    const original = fs.readFileSync(filePath, "utf8");
    const patched = fn(original);
    if (patched !== original) {
      fs.writeFileSync(filePath, patched);
      console.log(`✓ ${description}`);
    } else {
      console.log(`- ${description} (no change needed)`);
    }
  } catch (e) {
    console.warn(`⚠ Could not patch ${description}: ${e.message}`);
  }
}

const rnGradleVersions = path.join(
  "node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml"
);

// 1. Downgrade AGP 8.11.0 → 8.7.3 (fixes "No variants exist" for all modules)
patch(rnGradleVersions, "AGP → 8.7.3", (s) =>
  s.replace(/agp = "[^"]+"/, 'agp = "8.7.3"')
);

// 2. react-native-track-player: force languageVersion 1.9 via afterEvaluate
//    (kotlinOptions inside android{} is ignored in Kotlin 2.x Gradle plugin)
patch(
  path.join("node_modules/react-native-track-player/android/build.gradle"),
  "react-native-track-player: force Kotlin languageVersion 1.9",
  (s) => {
    if (s.includes("afterEvaluate") && s.includes("languageVersion")) return s;
    return (
      s +
      `\nafterEvaluate {\n` +
      `    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {\n` +
      `        compilerOptions {\n` +
      `            languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9)\n` +
      `            apiVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9)\n` +
      `        }\n` +
      `    }\n` +
      `}\n`
    );
  }
);
