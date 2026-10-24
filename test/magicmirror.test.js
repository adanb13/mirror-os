import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

test('MagicMirror shows only the upstream clock and a single news headline', () => {
  const config = createRequire(import.meta.url)('../magicmirror/config.cjs');
  assert.deepEqual(config.modules.map(m => m.module), ['clock', 'newsfeed']);
  assert.equal(config.modules[0].position, 'top_left');
  assert.equal(config.modules[0].config.showTime, true);
  assert.equal(config.modules[0].config.showDate, true);
  assert.equal(config.modules[0].config.displaySeconds, false);
  const news = config.modules[1];
  assert.equal(news.position, 'bottom_bar');
  assert.equal(news.config.showAsList, false);
  assert.equal(news.config.showDescription, false);
  assert.equal(news.config.showSourceTitle, true);
  assert.equal(news.config.updateInterval, 15000);
  assert.equal(news.config.feeds.length, 1);
  assert.equal(new URL(news.config.feeds[0].url).protocol, 'https:');
  assert.equal(news.config.feeds[0].useCorsProxy, false);
  assert.ok(config.ipWhitelist.includes('127.0.0.1'));
  assert.ok(!config.ipWhitelist.includes('0.0.0.0/0'));
});
