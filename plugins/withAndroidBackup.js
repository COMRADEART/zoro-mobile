// Expo config plugin: makes Android Auto Backup of the progress store
// durable across `expo prebuild`.
//
// `app.json` android.allowBackup survives prebuild on its own, but the
// backup-rule XMLs live in the gitignored android/ prebuild dir and would
// otherwise be whatever Expo's default template emits. This plugin pins
// both the manifest attributes and the XML contents to the reviewed,
// no-<include> form (see plugins/androidBackupXml.js) on every prebuild.

const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { BACKUP_RULES_XML, DATA_EXTRACTION_RULES_XML } = require('./androidBackupXml');

function withBackupManifestAttributes(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application || !application.$) {
      throw new Error(
        'withAndroidBackup: <application> not found in AndroidManifest.xml',
      );
    }
    application.$['android:allowBackup'] = 'true';
    application.$['android:fullBackupContent'] = '@xml/backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    return cfg;
  });
}

function withBackupXmlFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'backup_rules.xml'), BACKUP_RULES_XML);
      fs.writeFileSync(
        path.join(xmlDir, 'data_extraction_rules.xml'),
        DATA_EXTRACTION_RULES_XML,
      );
      return cfg;
    },
  ]);
}

module.exports = function withAndroidBackup(config) {
  config = withBackupManifestAttributes(config);
  config = withBackupXmlFiles(config);
  return config;
};
