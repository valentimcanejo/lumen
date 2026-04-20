const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withSigningConfig(config) {
  return withAppBuildGradle(config, (config) => {
    let c = config.modResults.contents;

    if (c.includes("signingConfigs.release")) return config;

    // Add release signingConfig block after debug block
    c = c.replace(
      /signingConfigs \{(\s*debug \{[^}]+\})\s*\}/,
      `signingConfigs {$1
        release {
            def keystorePropsFile = rootProject.file("app/keystore.properties")
            def keystoreProps = new Properties()
            keystoreProps.load(new FileInputStream(keystorePropsFile))
            storeFile file(keystoreProps['storeFile'])
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }
    }`
    );

    // Use release signingConfig in release buildType
    c = c.replace(
      /signingConfig signingConfigs\.debug(\s*def enableShrinkResources)/,
      "signingConfig signingConfigs.release$1"
    );

    config.modResults.contents = c;
    return config;
  });
};
