/**
 * Patches native Android build files after npm install.
 * Needed because EAS CLI 18.4+ brings @react-native/gradle-plugin 0.81.5
 * which sets AGP 8.11.0 — incompatible with some modules.
 *
 * Constraints:
 *   - AGP 8.11 breaks variant resolution for all RN modules → pin to 8.7.3
 *     (Kotlin compiler is pinned to 2.1.20 via withAgpVersion config plugin)
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

// Downgrade AGP 8.11.0 → 8.7.3 (fixes "No variants exist" for all modules)
patch(rnGradleVersions, "AGP → 8.7.3", (s) =>
  s.replace(/agp = "[^"]+"/, 'agp = "8.7.3"')
);
