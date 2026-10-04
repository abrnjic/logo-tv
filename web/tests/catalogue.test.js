import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareCatalogue, normalizeChannel } from "../src/lib/channelNames.js";
const raw = JSON.parse(
  readFileSync(new URL("../src/data/channels.json", import.meta.url)),
);
const catalog = prepareCatalogue(raw);

test("HRT 1 is one Croatian channel and all old IDs remain aliases", () => {
  const matches = catalog.filter((channel) => channel.name === "HRT 1");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].country, "Hrvatska");
  for (const id of ["hrt1", "hrt1hr", "hrt-1-hr", "hrt-1-hd-hr"])
    assert.ok(matches[0].aliases.includes(id));
});
test("Arena icon variants have clean names and never merge across countries", () => {
  assert.equal(
    normalizeChannel(
      raw.find((channel) => channel.id === "arena-sport-7-icon-hr"),
    ).name,
    "Arena Sport 7",
  );
  const matches = catalog.filter((channel) => channel.name === "Arena Sport 7");
  assert.ok(matches.some((channel) => channel.country === "Hrvatska"));
  assert.ok(matches.some((channel) => channel.country === "Srbija"));
  assert.equal(
    matches.filter((channel) => channel.country === "Hrvatska").length,
    1,
  );
});
test("Disney country editions and time-shift services remain separate", () => {
  const source = ["de", "fr", "it"].map((code) => ({
    id: `disney-jr-${code}`,
    name: `Disney Jr ${code}`,
    country: "Other",
    category: "General",
    image: `logos/disney-jr-${code}.png`,
  }));
  const result = prepareCatalogue(source);
  assert.equal(result.length, 3);
  assert.deepEqual(
    new Set(result.map((channel) => channel.country)),
    new Set(["Njemačka", "Francuska", "Italija"]),
  );
  assert.equal(
    prepareCatalogue([
      { ...source[0], id: "rtl-de" },
      { ...source[0], id: "rtl-plus-1-de" },
    ]).length,
    2,
  );
});
test("normalization preserves source records, every logo and favourite identifier", () => {
  const before = JSON.stringify(raw);
  prepareCatalogue(raw);
  assert.equal(JSON.stringify(raw), before);
  const aliases = new Set(catalog.flatMap((channel) => channel.aliases));
  for (const channel of raw) assert.ok(aliases.has(channel.id), channel.id);
  assert.equal(
    new Set(catalog.map((channel) => channel.id)).size,
    catalog.length,
  );
});
test("owner changes survive normalization, hidden rows are recoverable, new logos appear", () => {
  const meta = {
    version: 1,
    channels: {
      hrt1: {
        name: "HRT 1 – uređeno",
        country: "Hrvatska",
        category: "General",
      },
      "new-logo-hrvatska": {
        added: true,
        name: "Novi kanal",
        country: "Hrvatska",
        category: "Sport",
        sourcePath: "logos/custom/new-logo-hrvatska.png",
      },
    },
  };
  let result = prepareCatalogue(raw, meta);
  assert.ok(result.some((channel) => channel.name === "HRT 1 – uređeno"));
  assert.ok(result.some((channel) => channel.id === "new-logo-hrvatska"));
  meta.channels["new-logo-hrvatska"].hidden = true;
  assert.ok(
    !prepareCatalogue(raw, meta).some(
      (channel) => channel.id === "new-logo-hrvatska",
    ),
  );
  assert.ok(
    prepareCatalogue(raw, meta, { includeHidden: true }).some(
      (channel) => channel.id === "new-logo-hrvatska",
    ),
  );
});

test("TV and FM are channel names, not inferred country codes", () => {
  const channel = normalizeChannel({
    id: "1kzn-tv-za",
    name: "1 Kzn Tv Za",
    country: "South Africa",
    category: "General",
  });
  assert.equal(channel.country, "Južna Afrika");
  assert.ok(channel.name.endsWith("TV"));
  assert.equal(
    normalizeChannel({
      id: "nova-tv",
      name: "Nova Tv",
      country: "Hrvatska",
      category: "General",
    }).country,
    "Hrvatska",
  );
});
