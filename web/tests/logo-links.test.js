import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { getLogoUrl } from '../src/lib/logoUrl.js';
import { repairPlaylist } from '../src/lib/playlist.js';
const channels = JSON.parse(readFileSync(new URL('../src/data/channels.json', import.meta.url)));

test('every catalogue link points to an existing PNG in the deployed project', () => {
  const files = new Set(readdirSync(new URL('../public/logos/', import.meta.url)));
  for (const channel of channels) {
    const url = new URL(getLogoUrl(channel.image));
    assert.equal(url.origin, 'https://abrnjic.github.io');
    assert.ok(url.pathname.startsWith('/logo-tv/logos/'), channel.id);
    assert.ok(url.pathname.endsWith('.png'), channel.id);
    assert.ok(files.has(decodeURIComponent(url.pathname.split('/').at(-1))), channel.id);
  }
});

test('relative, root-relative and old absolute links use the same canonical URL', () => {
  const expected = 'https://abrnjic.github.io/logo-tv/logos/disney-jr-nl.png';
  for (const image of ['logos/disney-jr-nl.png', '/logos/disney-jr-nl.png', '/logo-tv/logos/disney-jr-nl.png', 'https://abrnjic.github.io/logos/disney-jr-nl.png', 'http://abrnjic.github.io/logos/disney-jr-nl.png', expected]) {
    assert.equal(getLogoUrl(image), expected);
  }
  assert.equal(getLogoUrl('https://example.com/logos/logo.png'), 'https://example.com/logos/logo.png');
});

test('repair all legacy logos by exact filename, without changing streams or identifiers', () => {
  const input = '#EXTM3U\r\n' + channels.map((channel, index) => `#EXTINF:-1 tvg-id="original-${index}" tvg-logo="https://abrnjic.github.io/${channel.image}", Custom name ${index}\r\nhttps://stream.example/${index}\r`).join('\n');
  const result = repairPlaylist(input, channels, () => { throw new Error('Filename repair must not use fuzzy matching'); });
  assert.equal(result.totalChannels, channels.length);
  assert.equal(result.matchCount, channels.length);
  assert.equal(result.content, input.replaceAll('https://abrnjic.github.io/logos/', 'https://abrnjic.github.io/logo-tv/logos/'));
});

test('unknown logo links and playback URLs remain unchanged; matching adds canonical links', () => {
  const input = '#EXTM3U\n#EXTINF:-1 tvg-logo="https://abrnjic.github.io/logos/not-in-catalogue.png",Unknown\nhttps://abrnjic.github.io/logos/stream\n#EXTINF:-1 tvg-logo=\'https://example.com/old.png\',HRT\nhttps://example.com/play';
  const channel = channels.find(channel => channel.id === 'hrt1');
  const result = repairPlaylist(input, channels, name => name === 'HRT' ? channel : undefined);
  assert.ok(result.content.includes('https://abrnjic.github.io/logos/not-in-catalogue.png'));
  assert.ok(result.content.includes('\nhttps://abrnjic.github.io/logos/stream\n'));
  assert.ok(result.content.includes(`tvg-logo="${getLogoUrl(channel.image)}",HRT`));
  assert.equal(result.matchCount, 1);
});
