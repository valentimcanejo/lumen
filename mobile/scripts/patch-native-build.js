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

const rnGradleVersions = path.join(
  "node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml"
);

// 1. Downgrade AGP 8.11.0 → 8.7.3 (fixes "No variants exist" for all modules)
patch(rnGradleVersions, "AGP 8.11.0 → 8.7.3", (s) =>
  s.replace(/agp = "[^"]+"/, 'agp = "8.7.3"')
);

// 2. Downgrade Kotlin 2.1.20 → 1.9.24
//    Kotlin 2.1 K2 compiler breaks react-native-track-player 4.1.2 and
//    potentially other modules. The @react-native/gradle-plugin has
//    pre-built JARs so it won't be recompiled with the downgraded version.
patch(rnGradleVersions, "Kotlin 2.1.20 → 1.9.24", (s) =>
  s.replace(/kotlin = "[^"]+"/, 'kotlin = "1.9.24"')
);
