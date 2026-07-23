const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const LOGOPEDIA_DIR = '/Users/abrnjic1/Documents/Logo tv/logopedia';
const DB_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'tvprofil_db.json');
const MISSING_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'missing_logos.json');

function fuzzyClean(name) {
    let n = name.toString().toLowerCase();
    n = n.replace(/\.default|\.dark|\.light/g, ''); // Logopedia specifični dodaci
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
        } else if (file.match(/\.(png|jpe?g|webp|svg)$/i)) { // Dodan SVG!
            results.push(filePath);
        }
    });
    return results;
}

console.log('Započinjem Fuzzy Spašavanje iz Logopedia mape...');

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

// Mapiraj sve originalne datoteke u logopedia/
const logoFiles = getFilesRecursively(LOGOPEDIA_DIR);
const fuzzyLogoMap = new Map();

for (const file of logoFiles) {
    const originalName = file.replace(/^.*[\\\/]/, ''); // npr. rts1.default.svg
    const cName = originalName.replace(/\.[^/.]+$/, ""); // npr. rts1.default
    // Čistimo fuzzy i spremamo (ako ima više istih, zadnji prepisuje, a favorizirat ćemo .default ili .png u logici ako treba, no prepisivanje je ok)
    fuzzyLogoMap.set(fuzzyClean(cName), file);
}

let recoveredCount = 0;
const stillMissing = [];

for (const missing of missingLogos) {
    const fuzzy = fuzzyClean(missing);
    const matchPath = fuzzyLogoMap.get(fuzzy);

    if (matchPath) {
        let folderName = folderMap.get(missing) || 'ostalo';
        const targetDir = path.join(LOGOS_DIR, folderName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        const targetFile = path.join(targetDir, `${missing}.png`);
        
        try {
            // Svi idu na 320x ili manje kako bi bili uniformirani, ali ako je SVG, sips ga može dobro konvertirati.
            const ext = matchPath.split('.').pop().toLowerCase();
            if (ext === 'svg') {
                 // Za SVG sips ponekad ignorira -Z, pa ga forsiramo ili samo pretvaramo u PNG (default veličina)
                 execSync(`sips -s format png "${matchPath}" -Z 320 --out "${targetFile}"`, { stdio: 'ignore' });
            } else {
                 const outW = execSync(`sips -g pixelWidth "${matchPath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
                 const outH = execSync(`sips -g pixelHeight "${matchPath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
                 const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

                 if (maxDim > 320) {
                     execSync(`sips -s format png -Z 320 "${matchPath}" --out "${targetFile}"`, { stdio: 'ignore' });
                 } else {
                     execSync(`sips -s format png "${matchPath}" --out "${targetFile}"`, { stdio: 'ignore' });
                 }
            }
            recoveredCount++;
            console.log(`Spašen iz logopedie: ${missing} (iz ${matchPath})`);
        } catch (e) {
            stillMissing.push(missing);
        }
    } else {
        stillMissing.push(missing);
    }
}

// Ažuriraj listu onih koji i dalje fale
fs.writeFileSync(MISSING_PATH, JSON.stringify(stillMissing, null, 2));

console.log(`\nZavršeno! Uspješno spašeno ${recoveredCount} slika iz 'logopedia' mape!`);
console.log(`Ostalo nenađeno: ${stillMissing.length}`);
