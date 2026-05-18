// Expo config plugin for the on-device Gemini Nano integration.
//
// The local native module (modules/expo-gemini-nano) is autolinked by
// Expo and declares its own ML Kit dependency in its android/build.gradle.
// The only app-level thing that must be made prebuild-durable is the
// minSdk: ML Kit GenAI (Gemini Nano via AICore) requires API 26, but
// Expo's default template is API 24. Expo's android/build.gradle reads
// `android.minSdkVersion` from gradle.properties, so pinning it there
// survives every `expo prebuild`. Same durability pattern as
// plugins/withAndroidBackup.js.

const { withGradleProperties } = require('@expo/config-plugins');

const MIN_SDK = '26';

module.exports = function withGeminiNano(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find(
      (p) => p.type === 'property' && p.key === 'android.minSdkVersion',
    );
    if (existing) {
      // Never lower an already-higher minSdk set by another plugin/user.
      if (parseInt(existing.value, 10) < parseInt(MIN_SDK, 10)) {
        existing.value = MIN_SDK;
      }
    } else {
      props.push({ type: 'property', key: 'android.minSdkVersion', value: MIN_SDK });
    }
    return cfg;
  });
};
