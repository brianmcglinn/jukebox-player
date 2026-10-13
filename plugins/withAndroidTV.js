// Makes the Player show up on the Google TV / Android TV home screen.
//
// A sideloaded app that only declares the phone-style LAUNCHER category is
// reachable from Settings > Apps, but Google TV's home-screen app row only
// lists apps that declare LEANBACK_LAUNCHER and carry a banner. This adds:
//   1. the LEANBACK_LAUNCHER category on the main activity's launcher filter
//      (the existing LAUNCHER category is kept, so the Odroid is unaffected)
//   2. an application-level android:banner pointing at @drawable/tv_banner
//   3. leanback + touchscreen <uses-feature required="false">, so the app is
//      installable on a TV (no touchscreen) without becoming TV-only
//   4. the banner image itself, copied from assets/tv-banner.png into the
//      generated Android project on every prebuild (this project is CNG — the
//      android/ folder is never committed, so it has to be re-created here)
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const LAUNCHER = 'android.intent.category.LAUNCHER';
const LEANBACK_LAUNCHER = 'android.intent.category.LEANBACK_LAUNCHER';

function setFeature(manifest, name, required) {
  manifest['uses-feature'] = manifest['uses-feature'] ?? [];
  const existing = manifest['uses-feature'].find((f) => f.$['android:name'] === name);
  if (existing) existing.$['android:required'] = String(required);
  else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': String(required) } });
}

const withTvManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    setFeature(manifest, 'android.software.leanback', false);
    setFeature(manifest, 'android.hardware.touchscreen', false);

    AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults).$['android:banner'] = '@drawable/tv_banner';

    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    const launcherFilter = (activity['intent-filter'] ?? []).find((f) =>
      (f.category ?? []).some((c) => c.$['android:name'] === LAUNCHER)
    );
    if (!launcherFilter) {
      throw new Error('[withAndroidTV] Could not find the LAUNCHER intent filter on the main activity.');
    }
    if (!launcherFilter.category.some((c) => c.$['android:name'] === LEANBACK_LAUNCHER)) {
      launcherFilter.category.push({ $: { 'android:name': LEANBACK_LAUNCHER } });
    }
    return cfg;
  });

const withTvBanner = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'assets', 'tv-banner.png');
      if (!fs.existsSync(src)) {
        throw new Error('[withAndroidTV] assets/tv-banner.png is missing — the Google TV banner has to exist.');
      }
      const destDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable-xhdpi');
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'tv_banner.png'));
      return cfg;
    },
  ]);

module.exports = (config) => withTvBanner(withTvManifest(config));
