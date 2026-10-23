import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

test('MagicMirror uses the upstream clock with no Hailo or other interface modules', () => {
  const config = createRequire(import.meta.url)('../magicmirror/config.cjs');
  assert.deepEqual(config.modules.map(m => m.module), ['clock']);
  assert.equal(config.modules[0].position, 'top_left');
  assert.equal(config.modules[0].config.showTime, true);
  assert.equal(config.modules[0].config.showDate, true);
  assert.equal(config.modules[0].config.displaySeconds, false);
  assert.ok(config.ipWhitelist.includes('127.0.0.1'));
  assert.ok(!config.ipWhitelist.includes('0.0.0.0/0'));
});
