const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const LOGOS_DIR = path.join(ROOT, "logos");
const SOURCES_DIR = path.join(ROOT, "sources");
const MANIFEST_PATH = path.join(ROOT, "manifests", "channels.json");

const SOURCE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".tif",
  ".tiff",
  ".avif"
];

function collectPngFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectPngFiles(fullPath));
    } else if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".png"
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => {
      if (/^\d+$/.test(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function findSource(country, basename) {
  const countryDirectory = path.join(SOURCES_DIR, country);

  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(countryDirectory, `${basename}${extension}`);

    if (fs.existsSync(candidate)) {
      return normalizePath(path.relative(ROOT, candidate));
    }
  }

  return null;
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error("Nije pronađen manifests/channels.json.");
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  if (!Array.isArray(manifest.channels)) {
    throw new Error("Manifest nema ispravno polje channels.");
  }

  const logoFiles = collectPngFiles(LOGOS_DIR);
  const existingLogos = new Set(
    manifest.channels.map((channel) => channel.logo)
  );
  const existingIds = new Set(
    manifest.channels.map((channel) => channel.id)
  );

  let added = 0;
  let skipped = 0;

  console.log("LogoTV automatsko usklađivanje manifesta");
  console.log(`Pronađeno PNG logotipa: ${logoFiles.length}`);
  console.log("");

  for (const logoFile of logoFiles) {
    const relativeLogo = normalizePath(path.relative(ROOT, logoFile));
    const relativeFromLogos = path.relative(LOGOS_DIR, logoFile);
    const parts = relativeFromLogos.split(path.sep);

    if (parts.length < 2) {
      console.log(`[PRESKOČENO] ${relativeLogo}: logo nije u mapi države.`);
      skipped += 1;
      continue;
    }

    const countryFolder = parts[0].toLowerCase();
    const country = countryFolder.toUpperCase();
    const basename = path.basename(logoFile, ".png");
    const id = `${countryFolder}-${basename}`;

    if (existingLogos.has(relativeLogo)) {
      console.log(`[POSTOJI] ${relativeLogo}`);
      skipped += 1;
      continue;
    }

    if (existingIds.has(id)) {
      console.log(`[PRESKOČENO] ${relativeLogo}: ID ${id} već postoji.`);
      skipped += 1;
      continue;
    }

    const metadata = await sharp(logoFile).metadata();

    if (
      metadata.format !== "png" ||
      metadata.width !== 320 ||
      metadata.height !== 180 ||
      metadata.hasAlpha !== true
    ) {
      console.log(
        `[PRESKOČENO] ${relativeLogo}: nije transparentni PNG 320 × 180 px.`
      );
      skipped += 1;
      continue;
    }

    const source = findSource(countryFolder, basename);
    const name = titleFromSlug(basename);

    manifest.channels.push({
      id,
      name,
      country,
      category: "general",
      aliases: [basename, name],
      tvgIds: [],
      logo: relativeLogo,
      source,
      format: "png",
      width: 320,
      height: 180,
      transparent: true,
      active: true
    });

    existingLogos.add(relativeLogo);
    existingIds.add(id);
    added += 1;

    console.log(`[DODANO] ${id} — ${name}`);
  }

  manifest.channels.sort((a, b) => {
    const countryComparison = a.country.localeCompare(b.country);

    if (countryComparison !== 0) {
      return countryComparison;
    }

    return a.name.localeCompare(b.name, "hr");
  });

  fs.writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log("");
  console.log("===== SAŽETAK =====");
  console.log(`Pronađeno logotipa: ${logoFiles.length}`);
  console.log(`Dodano u manifest: ${added}`);
  console.log(`Već postoji ili preskočeno: ${skipped}`);
  console.log(`Ukupno kanala: ${manifest.channels.length}`);

  if (added === 0) {
    console.log("Manifest je već usklađen.");
  } else {
    console.log("Manifest je uspješno ažuriran.");
  }
}

main().catch((error) => {
  console.error(`[GREŠKA] ${error.message}`);
  process.exitCode = 1;
});
