/**
 * Patches native Android build files after npm install.
 * Needed because EAS CLI 18.4+ brings @react-native/gradle-plugin 0.81.5
 * which sets AGP 8.11.0 and Kotlin 2.1.20 — incompatible with some modules.
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

// 1. Downgrade AGP from 8.11.0 → 8.7.3 (fixes "No variants exist" for all modules)
patch(
  path.join("node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml"),
  "AGP 8.11.0 → 8.7.3",
  (s) => s.replace(/agp = "[^"]+"/, 'agp = "8.7.3"')
);

// 2. Fix react-native-track-player: add Kotlin language compatibility mode
//    so it compiles with Kotlin 2.1 compiler but 1.9 language semantics
patch(
  path.join("node_modules/react-native-track-player/android/build.gradle"),
  "react-native-track-player: add Kotlin 1.9 language compat",
  (s) => {
    if (s.includes("languageVersion")) return s; // already patched
    return s.replace(
      /compileOptions\s*\{[^}]*\}/,
      (match) =>
        match +
        `\n\n    kotlinOptions {\n        languageVersion = "1.9"\n        apiVersion = "1.9"\n    }`
    );
  }
);
