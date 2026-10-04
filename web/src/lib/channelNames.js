import { countryLabel } from "./catalog.js";
import officialLabels from "../data/channel-labels.json" with { type: "json" };

export const countryCodes = {
  hr: "Hrvatska",
  rs: "Srbija",
  ba: "BiH",
  me: "Crna Gora",
  si: "Slovenija",
  mk: "Makedonija",
  de: "Njemačka",
  fr: "Francuska",
  it: "Italija",
  nl: "Nizozemska",
  uk: "Engleska",
  gb: "Engleska",
  us: "SAD",
  ca: "Kanada",
  au: "Australija",
  at: "Austrija",
  ch: "Švicarska",
  es: "Španjolska",
  pt: "Portugal",
  pl: "Poljska",
  cz: "Češka",
  sk: "Slovačka",
  hu: "Mađarska",
  ro: "Rumunjska",
  bg: "Bugarska",
  gr: "Grčka",
  tr: "Turska",
  al: "Albanija",
  ua: "Ukrajina",
  ru: "Rusija",
  dk: "Danska",
  se: "Švedska",
  no: "Norveška",
  fi: "Finska",
  is: "Island",
  ie: "Irska",
  be: "Belgija",
  lu: "Luksemburg",
  in: "Indija",
  id: "Indonezija",
  my: "Malezija",
  sg: "Singapur",
  ph: "Filipini",
  vn: "Vijetnam",
  th: "Tajland",
  cn: "Kina",
  hk: "Hong Kong",
  kr: "Koreja",
  jp: "Japan",
  ar: "Argentina",
  br: "Brazil",
  cl: "Čile",
  pe: "Peru",
  mx: "Meksiko",
  za: "Južna Afrika",
  nz: "Novi Zeland",
  il: "Izrael",
  ae: "UAE",
  eu: "Europa",
  lam: "Latinska Amerika",
};
const compactBrands = [
  "arenasport",
  "arenapremium",
  "hrt",
  "htv",
  "rtl",
  "disneychannel",
  "disneyjunior",
  "disneyjr",
  "disneyxd",
  "nickelodeon",
  "nickjr",
  "cartoonnetwork",
  "boomerang",
  "eurosport",
  "sportklub",
  "skysport",
  "viasat",
  "nationalgeographic",
  "natgeo",
  "discovery",
  "history",
  "hbo",
  "cinemax",
  "novatv",
  "pink",
  "axn",
  "bbc",
  "cnn",
  "13thstreet",
  "totalcinema",
  "topgold",
  "topradio",
];
const regionNames = new Intl.DisplayNames(["hr"], { type: "region" });
function countryFromCode(code) {
  if (["tv", "fm", "am", "hd", "sd", "uhd"].includes(code)) return undefined;
  if (countryCodes[code]) return countryCodes[code];
  if (!/^[a-z]{2}$/i.test(code)) return undefined;
  const label = regionNames.of(code.toUpperCase());
  return label !== code.toUpperCase() ? label : undefined;
}
const brandPattern = new RegExp(`^(?:${compactBrands.join("|")})`, "i");
const technical =
  /\b(?:icon|logo|logotip|horizontal|vertical|stacked|screen bug|bug|transparent|hd|fhd|uhd|4k|8k)\b/gi;
const replacements = [
  [/arena\s*sport/gi, "Arena Sport"],
  [/arena\s*premium/gi, "Arena Premium"],
  [/disney\s*(?:junior|jr)\.?/gi, "Disney Junior"],
  [/disney\s*channel/gi, "Disney Channel"],
  [/disney\s*xd/gi, "Disney XD"],
  [/cartoon\s*network/gi, "Cartoon Network"],
  [/national\s*geographic/gi, "National Geographic"],
  [/nat\s*geo/gi, "Nat Geo"],
  [/nick\s*jr\.?/gi, "Nick Jr."],
  [/sport\s*klub/gi, "Sport Klub"],
  [/sky\s*sport/gi, "Sky Sport"],
  [/nova\s*tv/gi, "Nova TV"],
  [/total\s*cinema/gi, "Total Cinema"],
  [/top\s*gold/gi, "TOP Gold"],
  [/top\s*radio/gi, "TOP Radio"],
  [/13\s*th\s*street/gi, "13th Street"],
  [/\bhrt\s*(\d)/gi, "HRT $1"],
  [/\bhtv\s*(\d)/gi, "HRT $1"],
  [/\b(?:hrt|htv)\s*(?:int|international)\b/gi, "HRT International"],
  [/\bhrt\s*radio/gi, "HRT Radio"],
  [
    /\b(hrt|rtl|hbo|bbc|cnn|axn|tv|mtv|tnt|npo|ard|zdf|orf|n1|dw|cnbc|nhk|rts|rtr|ftv|bn|cbs|nbc|abc|espn)\b/gi,
    (word) => word.toUpperCase(),
  ],
];

export function normalizeChannel(channel) {
  let country = countryLabel(channel.country);
  let slug = channel.id;
  const suffix = slug.match(/-(\w{2,3})$/i);
  if (suffix && countryFromCode(suffix[1].toLowerCase())) {
    country = countryFromCode(suffix[1].toLowerCase());
    slug = slug.slice(0, -suffix[0].length);
  } else if (!slug.includes("-")) {
    const prefix = slug.slice(0, 2).toLowerCase();
    if (countryCodes[prefix] && brandPattern.test(slug.slice(2))) {
      country = countryCodes[prefix];
      slug = slug.slice(2);
    }
    const end = slug.slice(-2).toLowerCase();
    if (countryCodes[end] && brandPattern.test(slug.slice(0, -2))) {
      country = countryCodes[end];
      slug = slug.slice(0, -2);
    }
  }
  if (
    [
      "Hd",
      "Horizontal",
      "Stacked",
      "Obsolete",
      "Old",
      "Screen Bug",
      "Custom",
    ].includes(country)
  )
    country = "Međunarodni";
  // HRT domestic services are Croatian even if an older folder was Regional.
  if (/^(?:hrt|htv)[1-4]$/i.test(slug.replace(/[-_\s]/g, "")))
    country = "Hrvatska";
  let name = slug
    .replace(/[-_]+/g, " ")
    .replace(technical, " ")
    .replace(/([a-z])(?=\d)/gi, "$1 ")
    .replace(/(\d)(?=[a-z])/gi, "$1 ");
  // Remove attached resolution flags only from recognized brands.
  if (brandPattern.test(slug)) name = name.replace(/hd$/i, "");
  name = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  for (const [pattern, value] of replacements)
    name = name.replace(pattern, value);
  name = name.replace(/\s+/g, " ").trim() || channel.name;
  const labelKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  name = officialLabels[labelKey] || name;
  const labelSuffix = name.match(/\s+([A-Z]{2})$/);
  if (labelSuffix && countryFromCode(labelSuffix[1].toLowerCase())) {
    country = countryFromCode(labelSuffix[1].toLowerCase());
    name = name.slice(0, -labelSuffix[0].length);
  }
  const category = /^(Arena|Sport Klub|Eurosport|Sky Sport)\b/.test(name)
    ? "Sport"
    : /^Disney\b|^Cartoon Network\b|^Nick(?:elodeon| Jr)/.test(name)
      ? "Dječji"
      : channel.category;
  return { ...channel, name, country, category };
}

const identity = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]/g, "");
export function prepareCatalogue(
  records,
  metadata = { version: 1, channels: {} },
  { includeHidden = false } = {},
) {
  const groups = new Map();
  const allRecords = [...records];
  for (const [id, override] of Object.entries(metadata.channels || {})) {
    if (override.added && !records.some((channel) => channel.id === id))
      allRecords.push({
        id,
        name: override.name,
        country: override.country,
        category: override.category,
        image: `logos/${id}.png`,
        sourcePath: override.sourcePath,
      });
  }
  for (const original of new Map(
    allRecords.map((channel) => [channel.id, channel]),
  ).values()) {
    const override = metadata.channels?.[original.id] || {};
    if (override.hidden && !includeHidden) continue;
    const channel = {
      ...normalizeChannel(original),
      ...override,
      id: original.id,
      image: original.image,
      sourcePath: original.sourcePath,
    };
    const key = `${identity(channel.country)}:${identity(channel.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(channel);
  }
  const score = (channel) =>
    (channel.preferred ? 1000 : 0) +
    (channel.id.replace(/[-_]/g, "") === identity(channel.name) ? 50 : 0) -
    (/\b(icon|bug|old|logo|hd)\b/i.test(channel.id.replace(/-/g, " "))
      ? 20
      : 0);
  return [...groups.values()]
    .map((variants) => {
      variants.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
      return {
        ...variants[0],
        aliases: variants.map((channel) => channel.id),
        variants,
      };
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "hr") ||
        a.country.localeCompare(b.country, "hr"),
    );
}
