const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const COUNTRIES_DIR = '/Users/abrnjic1/Documents/Logo tv/countries';
const DB_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'tvprofil_db.json');
const TEMP_DIR = path.join(__dirname, 'temp_fix');

// Pomoćna funkcija za slugify
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

async function downloadImage(url, tempPath) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return false;
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
        return true;
    } catch (e) {
        return false;
    }
}

async function run() {
    console.log('Pripremam mapu originala iz countries...');
    const countryFiles = getFilesRecursively(COUNTRIES_DIR);
    const countryMap = new Map(); // cName -> original path
    for (const f of countryFiles) {
        countryMap.set(cleanChannelName(path.basename(f)), f);
    }

    console.log('Pripremam mapu iz tvprofila...');
    const tvprofilData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const tvMap = new Map(); // cName -> url
    for (const ch of tvprofilData) {
        if (ch.logo.toLowerCase().endsWith('.png')) {
            tvMap.set(ch.cleanName, ch.logo);
        }
    }

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    const logoFiles = getFilesRecursively(LOGOS_DIR);
    console.log(`Započinjem provjeru ${logoFiles.length} logotipa u logos/...`);

    let fixedCount = 0;
    
    for (let i = 0; i < logoFiles.length; i++) {
        const file = logoFiles[i];
        const cName = cleanChannelName(path.basename(file));
        
        let originalPath = countryMap.get(cName);
        let tvUrl = tvMap.get(cName);

        if (originalPath) {
            // Imamo original na disku
            try {
                const outW = execSync(`sips -g pixelWidth "${originalPath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
                const outH = execSync(`sips -g pixelHeight "${originalPath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
                const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

                if (maxDim <= 320) {
                    // Original je manji ili jednak 320px. 
                    // Naša stara skripta ga je rastegnula. Vratimo original bez rastezanja!
                    execSync(`sips -s format png "${originalPath}" --out "${file}"`, { stdio: 'ignore' });
                    fixedCount++;
                } else {
                    // Ako je veći od 320px, već smo ga ispravno skalirali prema dolje. Nije potrebno ništa.
                }
            } catch (e) {}
        } else if (tvUrl) {
            // Nemamo na disku, ali je s tvprofila
            const tempFile = path.join(TEMP_DIR, `${cName}_temp.png`);
            const success = await downloadImage(tvUrl, tempFile);
            if (success) {
                try {
                    const outW = execSync(`sips -g pixelWidth "${tempFile}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
                    const outH = execSync(`sips -g pixelHeight "${tempFile}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
                    const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

                    if (maxDim <= 320) {
                        // Original je mali. Prepuni ga bez rastezanja.
                        execSync(`sips -s format png "${tempFile}" --out "${file}"`, { stdio: 'ignore' });
                        fixedCount++;
                    }
                } catch (e) {
                } finally {
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                }
            }
            await new Promise(r => setTimeout(r, 20));
        }

        if (i > 0 && i % 500 === 0) {
            console.log(`Provjereno ${i}/${logoFiles.length}... Popravljeno: ${fixedCount}`);
        }
    }

    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`Završeno! Uspješno popravljeno rastezanje na ${fixedCount} logotipa.`);
}

run().catch(console.error);
