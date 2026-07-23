const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const COUNTRIES_DIR = '/Users/abrnjic1/Documents/Logo tv/countries';
const DB_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'tvprofil_db.json');
const OUT_MISSING = path.join(__dirname, '..', 'web', 'src', 'data', 'missing_logos.json');

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function cleanChannelName(fileName) {
    return slugify(fileName.replace(/\.[^/.]+$/, ""));
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

const missingLogos = new Set();
let deletedCount = 0;

// 1. Tvprofil slike su 100x64 (manje od 150x150). Smatramo ih sve low-res!
console.log('Učitavam tvprofil bazu...');
if (fs.existsSync(DB_PATH)) {
    const tvData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    for (const ch of tvData) {
        missingLogos.add(ch.cleanName);
    }
}

// 2. Analiziraj originalne slike iz countries/ (jer su u logos/ već rastegnute)
console.log('Skeniram originale u countries mape...');
const countryFiles = getFilesRecursively(COUNTRIES_DIR);
const lowResFromCountries = new Set();

for (const file of countryFiles) {
    try {
        const dimensions = sizeOf(file);
        const maxDim = Math.max(dimensions.width, dimensions.height);
        if (maxDim < 150) {
            lowResFromCountries.add(cleanChannelName(path.basename(file)));
        }
    } catch (e) {
        // ako ne može pročitati
    }
}

console.log(`Pronađeno ${lowResFromCountries.size} loših logotipa u tvojim originalima.`);
for (const name of lowResFromCountries) {
    missingLogos.add(name);
}

// 3. Brisanje tih slika iz logos/
console.log('Brišem loše logotipe iz baze...');
const allLogos = getFilesRecursively(LOGOS_DIR);

for (const logoFile of allLogos) {
    const cName = cleanChannelName(path.basename(logoFile));
    if (missingLogos.has(cName)) {
        fs.unlinkSync(logoFile);
        deletedCount++;
    }
}

// Spremi listu onoga što fali
const missingArray = Array.from(missingLogos).sort();
fs.writeFileSync(OUT_MISSING, JSON.stringify(missingArray, null, 2));

console.log(`\nZavršeno!`);
console.log(`Obrisano datoteka iz logos/: ${deletedCount}`);
console.log(`Ukupno kanala bez dobre slike (zapisano u missing_logos.json): ${missingArray.length}`);
