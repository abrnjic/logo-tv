const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const COUNTRIES_DIR = '/Users/abrnjic1/Documents/Logo tv/countries';
const DB_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'tvprofil_db.json');
const MISSING_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'missing_logos.json');

function fuzzyClean(name) {
    let n = name.toString().toLowerCase();
    n = n.replace(/hd/g, '');
    n = n.replace(/fhd/g, '');
    n = n.replace(/hevc/g, '');
    n = n.replace(/4k/g, '');
    n = n.replace(/b$/g, '');
    n = n.replace(/hr$/g, '');
    n = n.replace(/[^a-z0-9]/g, '');
    return n;
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

console.log('Započinjem Fuzzy Spašavanje iz countries mape...');

if (!fs.existsSync(MISSING_PATH)) {
    console.log('Nema missing_logos.json.');
    process.exit(0);
}

const missingLogos = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf-8'));
const tvData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// Mapiraj čista imena u foldere
const folderMap = new Map();
for (const ch of tvData) {
    folderMap.set(ch.cleanName, ch.folder);
}

// Mapiraj sve originalne datoteke u countries/
const countryFiles = getFilesRecursively(COUNTRIES_DIR);
const fuzzyCountryMap = new Map();

for (const file of countryFiles) {
    const cName = file.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, "");
    fuzzyCountryMap.set(fuzzyClean(cName), file);
}

let recoveredCount = 0;
const stillMissing = [];

for (const missing of missingLogos) {
    const fuzzy = fuzzyClean(missing);
    const matchPath = fuzzyCountryMap.get(fuzzy);

    if (matchPath) {
        // Pronašli smo ga u countries mapi pomoću fuzzy pretrage!
        let folderName = folderMap.get(missing) || 'ostalo';
        const targetDir = path.join(LOGOS_DIR, folderName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        const targetFile = path.join(targetDir, `${missing}.png`);
        
        try {
            const outW = execSync(`sips -g pixelWidth "${matchPath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
            const outH = execSync(`sips -g pixelHeight "${matchPath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
            const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

            if (maxDim > 320) {
                execSync(`sips -s format png -Z 320 "${matchPath}" --out "${targetFile}"`, { stdio: 'ignore' });
            } else {
                execSync(`sips -s format png "${matchPath}" --out "${targetFile}"`, { stdio: 'ignore' });
            }
            recoveredCount++;
            console.log(`Spašen iz countries/: ${missing}`);
        } catch (e) {
            stillMissing.push(missing);
        }
    } else {
        stillMissing.push(missing);
    }
}

// Ažuriraj listu onih koji i dalje fale (možda ćemo ih tražiti negdje drugdje kasnije)
fs.writeFileSync(MISSING_PATH, JSON.stringify(stillMissing, null, 2));

console.log(`\nZavršeno! Uspješno spašeno ${recoveredCount} slika iz 'countries' mape pomoću Fuzzy algoritma!`);
console.log(`Ostalo nenađeno: ${stillMissing.length}`);
