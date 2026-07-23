const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "manifests", "channels.json");

function fail(message) {
  console.error(`[GREŠKA] ${message}`);
  process.exitCode = 1;
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error("Nije pronađen manifests/channels.json.");
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  if (!Array.isArray(manifest.channels)) {
    throw new Error("Polje channels mora biti niz.");
  }

  const ids = new Set();
  const logos = new Set();
  let valid = 0;

  console.log("LogoTV provjera manifesta");
  console.log(`Kanala u manifestu: ${manifest.channels.length}`);
  console.log("");

  for (const channel of manifest.channels) {
    const label = channel.id || channel.name || "nepoznati-kanal";
    let channelValid = true;

    if (!channel.id || typeof channel.id !== "string") {
      fail(`${label}: nedostaje ispravan id.`);
      channelValid = false;
    } else if (ids.has(channel.id)) {
      fail(`${label}: id se ponavlja.`);
      channelValid = false;
    } else {
      ids.add(channel.id);
    }

    if (!channel.name || typeof channel.name !== "string") {
      fail(`${label}: nedostaje naziv kanala.`);
      channelValid = false;
    }

    if (!/^[A-Z]{2}$/.test(channel.country || "")) {
      fail(`${label}: država mora biti dvoslovni kod, primjerice RS.`);
      channelValid = false;
    }

    if (!channel.logo || typeof channel.logo !== "string") {
      fail(`${label}: nedostaje putanja logotipa.`);
      channelValid = false;
    } else {
      const logoPath = path.join(ROOT, channel.logo);

      if (logos.has(channel.logo)) {
        fail(`${label}: isti logo već koristi drugi zapis.`);
        channelValid = false;
      } else {
        logos.add(channel.logo);
      }

      if (!fs.existsSync(logoPath)) {
        fail(`${label}: datoteka ne postoji — ${channel.logo}`);
        channelValid = false;
      } else {
        const metadata = await sharp(logoPath).metadata();

        if (
          metadata.format !== "png" ||
          metadata.width !== 320 ||
          metadata.height !== 180 ||
          metadata.hasAlpha !== true
        ) {
          fail(
            `${label}: logo mora biti transparentni PNG veličine 320 × 180 px.`
          );
          channelValid = false;
        }
      }
    }

    if (channel.source) {
      const sourcePath = path.join(ROOT, channel.source);

      if (!fs.existsSync(sourcePath)) {
        fail(`${label}: izvorna datoteka ne postoji — ${channel.source}`);
        channelValid = false;
      }
    }

    if (channelValid) {
      valid += 1;
      console.log(`[OK] ${channel.id} — ${channel.name}`);
    }
  }

  console.log("");
  console.log("===== SAŽETAK =====");
  console.log(`Ukupno: ${manifest.channels.length}`);
  console.log(`Ispravno: ${valid}`);
  console.log(`Neispravno: ${manifest.channels.length - valid}`);

  if (valid === manifest.channels.length) {
    console.log("Manifest je ispravan.");
  }
}

main().catch((error) => {
  console.error(`[GREŠKA] ${error.message}`);
  process.exitCode = 1;
});
