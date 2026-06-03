// Pin the test process to UTC so the (UTC-anchored) fixtures stay deterministic
// regardless of the machine/CI timezone. After the local-date conversion,
// local === UTC under this setting, so existing fixtures need no edits. The
// dedicated tests/localDateKeys.test.js overrides TZ to a non-UTC zone to prove
// the local-bucketing behaviour.
process.env.TZ = 'UTC';
