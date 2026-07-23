const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const COUNTRIES_DIR = path.join(__dirname, '..', '..', 'countries');

// Helper to clean channel names for fuzzy matching
function cleanName(name) {
    return name.toString().toLowerCase()
        .replace(/\(.*?\)/g, '') // Ukloni sve u zagradama
        .replace(/[^a-z0-9]/g, ''); // Zadrži samo slova i brojeve (nema razmaka, crtica, točkica)
}

function getM3UChannels() {
    const channelMap = {};
    const unmapped = {};
    const categories = fs.readdirSync(LOGOS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const category of categories) {
        const popisPath = path.join(LOGOS_DIR, category, 'popis_kanala.txt');
        if (fs.existsSync(popisPath)) {
            const content = fs.readFileSync(popisPath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.trim().startsWith('- ')) {
                    const originalName = line.substring(2).trim();
                    const clean = cleanName(originalName);
                    if (clean) {
                        channelMap[clean] = {
                            originalName,
                            category,
                            clean,
                            found: false
                        };
                        unmapped[clean] = originalName;
                    }
                }
            }
        }
    }
    return { channelMap, unmapped };
}

function processImages(channelMap, unmapped) {
    if (!fs.existsSync(COUNTRIES_DIR)) {
        console.error('Ne mogu pronaći folder:', COUNTRIES_DIR);
        return;
    }

    let foundCount = 0;
    const countriesFolders = fs.readdirSync(COUNTRIES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const folder of countriesFolders) {
        const folderPath = path.join(COUNTRIES_DIR, folder);
        const files = fs.readdirSync(folderPath);

        for (const file of files) {
            if (!file.match(/\.(png|jpg|jpeg)$/i)) continue;

            const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
            const cleanImageName = cleanName(nameWithoutExt);

            // Fuzzy match
            // Prvo probamo točno poklapanje na temelju čistog imena
            let matchedKey = null;
            if (channelMap[cleanImageName] && !channelMap[cleanImageName].found) {
                matchedKey = cleanImageName;
            } else {
                // Ako nema direktnog poklapanja, probajmo vidjeti sadrži li slika ime kanala ili obrnuto
                // Ovo je riskantnije, pa radimo samo ako je ime dovoljno dugo (barem 4 slova)
                if (cleanImageName.length >= 4) {
                    for (const key of Object.keys(unmapped)) {
                        if (key.length >= 4 && (cleanImageName.includes(key) || key.includes(cleanImageName))) {
                            matchedKey = key;
                            break;
                        }
                    }
                }
            }

            if (matchedKey) {
                const target = channelMap[matchedKey];
                target.found = true;
                delete unmapped[matchedKey];
                foundCount++;

                const srcPath = path.join(folderPath, file);
                const destFileName = cleanImageName + '.png'; // Uvijek spremi kao png
                const destPath = path.join(LOGOS_DIR, target.category, destFileName);

                // Optimizacija slike koristeći Mac 'sips'
                // -Z 320 znači da max širina/visina bude 320px, zadržavajući proporcije!
                try {
                    // console.log(`Optimiziram: ${file} -> ${target.category}/${destFileName}`);
                    execSync(`sips -Z 320 "${srcPath}" --out "${destPath}"`, { stdio: 'ignore' });
                } catch (err) {
                    console.error(`Greška pri obradi ${file}: ${err.message}`);
                }
            }
        }
    }
    return foundCount;
}

function run() {
    console.log('Pokrećem učitavanje kanala iz m3u foldera...');
    const { channelMap, unmapped } = getM3UChannels();
    const totalChannels = Object.keys(channelMap).length;
    console.log(`Pronađeno ukupno ${totalChannels} jedinstvenih kanala iz m3u liste.`);

    console.log('Tražim poklapanja u folderu "countries" i optimiziram (ovo može potrajati)...');
    const foundCount = processImages(channelMap, unmapped);

    console.log(`\n============================`);
    console.log(`ZAVRŠENO!`);
    console.log(`Pronađeno i optimizirano: ${foundCount} slika.`);
    console.log(`Nije pronađeno slika za: ${totalChannels - foundCount} kanala.`);
    console.log(`============================\n`);

    // Spremi izvještaj
    const missingReportPath = path.join(__dirname, 'nepronadeni_kanali.txt');
    let report = 'POPIS KANALA ZA KOJE NIJE PRONAĐEN LOGO U MAPAMA "COUNTRIES":\n\n';
    for (const [key, name] of Object.entries(unmapped)) {
        report += `- ${name} (Kategorija: ${channelMap[key].category})\n`;
    }
    fs.writeFileSync(missingReportPath, report);
    console.log(`Izvještaj o nepronađenim kanalima spremljen u: ${missingReportPath}`);
}

run();
