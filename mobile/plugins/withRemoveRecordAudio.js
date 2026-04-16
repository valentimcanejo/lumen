const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Removes the RECORD_AUDIO permission injected by expo-av.
 * The app only uses audio playback (TTS), never recording.
 */
module.exports = function withRemoveRecordAudio(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest["uses-permission"] || [];
    manifest["uses-permission"] = permissions.filter(
      (p) =>
        p.$["android:name"] !== "android.permission.RECORD_AUDIO"
    );
    return config;
  });
};
