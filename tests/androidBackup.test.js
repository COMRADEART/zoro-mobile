const {
  BACKUP_RULES_XML,
  DATA_EXTRACTION_RULES_XML,
} = require('../plugins/androidBackupXml');

// The word "RKStorage" legitimately appears inside the protective <!-- -->
// comments. The invariant is about the actual rule elements, so strip
// comments before the negative assertions.
const stripComments = (xml) => xml.replace(/<!--[\s\S]*?-->/g, '');

describe('Android backup XML invariants', () => {
  const both = [
    ['backup_rules.xml', BACKUP_RULES_XML],
    ['data_extraction_rules.xml', DATA_EXTRACTION_RULES_XML],
  ];

  test.each(both)(
    '%s declares no <include> (would flip Android to allow-list mode)',
    (_name, xml) => {
      expect(stripComments(xml)).not.toMatch(/<include\b/);
    },
  );

  test.each(both)(
    '%s declares no <exclude> and never excludes RKStorage/databases',
    (_name, xml) => {
      const body = stripComments(xml);
      expect(body).not.toMatch(/<exclude\b/);
      // RKStorage must only ever live in a comment, never in a rule element.
      expect(body).not.toMatch(/RKStorage/);
    },
  );

  test('backup_rules.xml is the empty full-backup-content form', () => {
    expect(BACKUP_RULES_XML).toMatch(/<full-backup-content\s*\/>/);
  });

  test('data_extraction_rules.xml opts into cloud-backup and device-transfer', () => {
    expect(DATA_EXTRACTION_RULES_XML).toMatch(/<data-extraction-rules>/);
    expect(DATA_EXTRACTION_RULES_XML).toMatch(/<cloud-backup\s*\/>/);
    expect(DATA_EXTRACTION_RULES_XML).toMatch(/<device-transfer\s*\/>/);
  });

  test('both documents are well-formed XML declarations', () => {
    for (const [, xml] of both) {
      expect(xml.trimStart()).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    }
  });
});
