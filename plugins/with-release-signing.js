/**
 * with-release-signing — Expo config plugin (survives `expo prebuild --clean`).
 *
 * Patches android/app/build.gradle so the `release` buildType is signed with a
 * REAL upload keystore instead of the template debug keystore:
 *
 *   1. Loads keystore properties from android/key.properties (RN standard).
 *   2. Adds a `release` signingConfig that reads storeFile/storePassword/
 *      keyAlias/keyPassword from those properties.
 *   3. Points buildTypes.release at signingConfigs.release.
 *
 * The keystore file itself is NEVER committed — CI decodes it from a GitHub
 * secret into android/app/ and writes android/key.properties right before
 * `./gradlew bundleRelease`. If key.properties is missing (e.g. local dev),
 * release falls back to the debug keystore so local builds don't break.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

// Injected once, right before the `android {` block in android/app/build.gradle.
const KEYSTORE_PROPS_SNIPPET = `
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

// Added as the last entry of the `signingConfigs { ... }` block.
// When key.properties is missing (local dev), falls back to the template
// debug keystore so local release builds keep working.
const RELEASE_SIGNING_CONFIG = `
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

/** Returns index of the `}` that closes the block starting at openBraceIdx. */
function findBlockEnd(contents, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < contents.length; i++) {
    if (contents[i] === '{') depth++;
    else if (contents[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Idempotency guard — never double-patch on repeated prebuilds.
    if (contents.includes('signingConfigs.release') && contents.includes('keystorePropertiesFile')) {
      return config;
    }

    // 1. Load keystore properties before the `android {` block.
    const androidBlockMatch = contents.match(/^android \{/m);
    if (!androidBlockMatch) {
      throw new Error('with-release-signing: could not locate `android {` block in build.gradle');
    }
    const androidBlockIdx = androidBlockMatch.index;
    contents =
      contents.slice(0, androidBlockIdx) +
      KEYSTORE_PROPS_SNIPPET +
      contents.slice(androidBlockIdx);

    // 2. Add `release` signingConfig inside `signingConfigs { ... }`.
    const signingConfigsIdx = contents.indexOf('signingConfigs {');
    const signingConfigsEnd = findBlockEnd(contents, signingConfigsIdx);
    if (signingConfigsIdx === -1 || signingConfigsEnd === -1) {
      throw new Error('with-release-signing: could not locate `signingConfigs {` block');
    }
    contents =
      contents.slice(0, signingConfigsEnd) + RELEASE_SIGNING_CONFIG + contents.slice(signingConfigsEnd);

    // 3. Point buildTypes.release at signingConfigs.release. Must search for
    // `release {` INSIDE the buildTypes block — the inserted signingConfigs
    // release block above also contains `release {` and would match first.
    const buildTypesIdx = contents.indexOf('buildTypes {');
    if (buildTypesIdx === -1) {
      throw new Error('with-release-signing: could not locate `buildTypes {` block');
    }
    const releaseBuildTypeIdx = contents.indexOf('release {', buildTypesIdx);
    const buildTypesEnd = findBlockEnd(contents, buildTypesIdx);
    if (releaseBuildTypeIdx === -1 || releaseBuildTypeIdx > buildTypesEnd) {
      throw new Error('with-release-signing: could not locate `release {` inside buildTypes');
    }
    const releaseBuildTypeEnd = findBlockEnd(contents, releaseBuildTypeIdx);
    if (releaseBuildTypeEnd === -1) {
      throw new Error('with-release-signing: could not find end of `release {` buildType');
    }
    const releaseBlock = contents.slice(releaseBuildTypeIdx, releaseBuildTypeEnd + 1);
    const patchedReleaseBlock = releaseBlock
      // Drop the stale "generate your own keystore" comment lines entirely.
      .replace(
        /\s*\/\/ Caution! In production, you need to generate your own keystore file\.\n(\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\n)?/,
        '\n'
      )
      .replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release');
    contents =
      contents.slice(0, releaseBuildTypeIdx) + patchedReleaseBlock + contents.slice(releaseBuildTypeEnd + 1);

    config.modResults.contents = contents;
    return config;
  });
};
