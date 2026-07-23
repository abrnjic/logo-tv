const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SOURCES_DIR = path.join(ROOT, "sources");
const OUTPUT_DIR = path.join(ROOT, "logos");
const REPORTS_DIR = path.join(ROOT, "reports");

const WIDTH = 320;
const HEIGHT = 180;
const PADDING = 16;
const MAX_WIDTH = WIDTH - PADDING * 2;
const MAX_HEIGHT = HEIGHT - PADDING * 2;

const CHECK_ONLY = process.argv.includes("--check");
const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".tif",
  ".tiff",
  ".avif"
]);

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();

      if (SUPPORTED_EXTENSIONS.has(extension)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function createOutputPath(sourcePath) {
  const relativePath = path.relative(SOURCES_DIR, sourcePath);
  const parsed = path.parse(relativePath);

  return path.join(OUTPUT_DIR, parsed.dir, `${parsed.name}.png`);
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function createHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function processLogo(sourcePath) {
  const outputPath = createOutputPath(sourcePath);
  const relativeSource = path.relative(ROOT, sourcePath);
  const relativeOutput = path.relative(ROOT, outputPath);

  const sourceBuffer = fs.readFileSync(sourcePath);
  const inputHash = createHash(sourceBuffer);
  const metadata = await sharp(sourceBuffer, {
    failOn: "error",
    density: 300
  }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Nije moguće utvrditi dimenzije slike.");
  }

  if (CHECK_ONLY) {
    return {
      source: relativeSource,
      output: relativeOutput,
      status: fs.existsSync(outputPath) ? "exists" : "missing",
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      inputHash
    };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const outputBuffer = await sharp(sourceBuffer, {
    failOn: "error",
    density: 300
  })
    .rotate()
    .trim({
      threshold: 10
    })
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "contain",
      position: "centre",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .extend({
      top: PADDING,
      bottom: PADDING,
      left: PADDING,
      right: PADDING,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: 90,
      effort: 10
    })
    .toBuffer();

  fs.writeFileSync(outputPath, outputBuffer);

  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    source: relativeSource,
    output: relativeOutput,
    status: "optimized",
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    outputWidth: outputMetadata.width,
    outputHeight: outputMetadata.height,
    inputBytes: sourceBuffer.length,
    outputBytes: outputBuffer.length,
    inputHash,
    outputHash: createHash(outputBuffer),
    warning:
      metadata.width < 160 || metadata.height < 90
        ? "Izvorna slika možda je premale rezolucije."
        : null
  };
}

async function main() {
  const files = collectFiles(SOURCES_DIR);
  const results = [];
  const errors = [];

  console.log("LogoTV alat za optimizaciju");
  console.log(`Način rada: ${CHECK_ONLY ? "provjera" : "optimizacija"}`);
  console.log(`Standard: ${WIDTH} × ${HEIGHT} px, transparentni PNG`);
  console.log(`Pronađeno slika: ${files.length}`);
  console.log("");

  for (const sourcePath of files) {
    const relativeSource = path.relative(ROOT, sourcePath);

    try {
      const result = await processLogo(sourcePath);
      results.push(result);

      if (CHECK_ONLY) {
        const marker = result.status === "exists" ? "OK" : "NEDOSTAJE";
        console.log(`[${marker}] ${relativeSource}`);
      } else {
        console.log(
          `[OK] ${relativeSource} → ${result.output} (${formatBytes(
            result.outputBytes
          )})`
        );

        if (result.warning) {
          console.log(`     UPOZORENJE: ${result.warning}`);
        }
      }
    } catch (error) {
      errors.push({
        source: relativeSource,
        error: error.message
      });

      console.error(`[GREŠKA] ${relativeSource}: ${error.message}`);
    }
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: CHECK_ONLY ? "check" : "optimize",
    standard: {
      format: "PNG",
      width: WIDTH,
      height: HEIGHT,
      transparentCanvas: true,
      padding: PADDING
    },
    summary: {
      discovered: files.length,
      successful: results.length,
      failed: errors.length
    },
    results,
    errors
  };

  const reportPath = path.join(
    REPORTS_DIR,
    CHECK_ONLY ? "check-report.json" : "optimization-report.json"
  );

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("");
  console.log("===== SAŽETAK =====");
  console.log(`Pronađeno: ${files.length}`);
  console.log(`Uspješno: ${results.length}`);
  console.log(`Greške: ${errors.length}`);
  console.log(`Izvještaj: ${path.relative(ROOT, reportPath)}`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Neočekivana greška: ${error.message}`);
  process.exitCode = 1;
});
