const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const OUT_MISSING = path.join(__dirname, '..', 'web', 'src', 'data', 'missing_logos.json');

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else if (file.match(/\.(png|jpe?g|webp)$/i)) {
            results.push(filePath);
        }
    });
    return results;
}

async function run() {
    const allLogos = getFilesRecursively(LOGOS_DIR);
    let deletedCount = 0;
    
    // Učitaj trenutne missing (da ih ne izgubimo)
    let missing = [];
    if (fs.existsSync(OUT_MISSING)) {
        missing = JSON.parse(fs.readFileSync(OUT_MISSING, 'utf-8'));
    }
    const missingSet = new Set(missing);

    console.log(`Skreniram ${allLogos.length} slika u logos/ ...`);

    for (const file of allLogos) {
        try {
            const metadata = await sharp(file).metadata();
            const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
            
            // Također, detektiramo jako male datoteke (< 4KB) koje su obično mutni ostaci
            const stat = fs.statSync(file);
            
            if (maxDim < 150 || stat.size < 4000) {
                // Obriši i dodaj u missing
                const cName = path.basename(file).replace(/\.[^/.]+$/, "");
                missingSet.add(cName);
                fs.unlinkSync(file);
                deletedCount++;
            }
        } catch (e) {
            console.error(`Greška na ${file}:`, e.message);
        }
    }

    const missingArray = Array.from(missingSet).sort();
    fs.writeFileSync(OUT_MISSING, JSON.stringify(missingArray, null, 2));

    console.log(`Završeno! Obrisano mutnih/malih logotipa: ${deletedCount}`);
    console.log(`Ukupno kanala bez dobre slike sada: ${missingArray.length}`);
}

run();
