const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const COUNTRIES_DIR = '/Users/abrnjic1/Documents/Logo tv/countries';

// Pomoćna funkcija za slugify (čisti naziv kanala i foldera)
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function cleanChannelName(fileName) {
    // Makni ekstenziju
    let name = fileName.replace(/\.[^/.]+$/, "");
    // Makni dodatke poput -hr, -rs ako su na kraju. (U originalnoj m3u ih nema).
    // Ali radije ćemo ostaviti kako je, da ne prebrišemo npr arena-sport-1-hr i arena-sport-1-rs kao iste.
    return slugify(name);
}

// Rekurzivno pronalazi sve datoteke u folderu
function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else {
            // Samo slike
            if (file.match(/\.(png|jpe?g|webp)$/i)) {
                results.push(filePath);
            }
        }
    });
    return results;
}

async function run() {
    console.log('Faza 1: Skeniranje i čišćenje postojećih duplikata u logos/...');
    const existingLogosMap = new Map(); // cName -> path
    let deletedDuplicates = 0;

    const currentFiles = getFilesRecursively(LOGOS_DIR);
    for (const file of currentFiles) {
        const fileName = path.basename(file);
        const cName = cleanChannelName(fileName);

        if (existingLogosMap.has(cName)) {
            // Ovo je duplikat!
            console.log(`Brišem duplikat: ${file} (zadržavam ${existingLogosMap.get(cName)})`);
            fs.unlinkSync(file);
            deletedDuplicates++;
        } else {
            existingLogosMap.set(cName, file);
        }
    }
    console.log(`Obrisano duplikata u postojećoj bazi: ${deletedDuplicates}`);
    console.log(`Ukupno jedinstvenih kanala u bazi: ${existingLogosMap.size}`);

    console.log('\nFaza 2: Skeniranje nove countries mape...');
    if (!fs.existsSync(COUNTRIES_DIR)) {
        console.log('Greška: countries mapa ne postoji na navedenoj putanji.');
        return;
    }

    const countryFiles = getFilesRecursively(COUNTRIES_DIR);
    console.log(`Pronađeno ${countryFiles.length} slika u countries mapi.`);

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < countryFiles.length; i++) {
        const file = countryFiles[i];
        const fileName = path.basename(file);
        const cName = cleanChannelName(fileName);

        if (existingLogosMap.has(cName)) {
            // Već imamo ovaj kanal u logos/ (ili smo ga upravo dodali u ovoj iteraciji)
            skippedCount++;
            continue;
        }

        // Ovo je novi kanal!
        // Odredi u koji folder ide (naziv nad-foldera u countries/)
        const parentFolderName = slugify(path.basename(path.dirname(file)));
        const targetFolder = path.join(LOGOS_DIR, parentFolderName);
        const targetFile = path.join(targetFolder, `${cName}.png`);

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        try {
            // Provjeri dimenzije prije skaliranja
            const outW = execSync(`sips -g pixelWidth "${file}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
            const outH = execSync(`sips -g pixelHeight "${file}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
            const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

            if (maxDim > 320) {
                // Smanji ako je veće od 320
                execSync(`sips -s format png -Z 320 "${file}" --out "${targetFile}"`, { stdio: 'ignore' });
            } else {
                // Samo kopiraj/konvertiraj ako je malo, nemoj rastezati!
                execSync(`sips -s format png "${file}" --out "${targetFile}"`, { stdio: 'ignore' });
            }

            existingLogosMap.set(cName, targetFile);
            addedCount++;
            if (addedCount % 100 === 0) {
                console.log(`Obrađeno novih: ${addedCount}`);
            }
        } catch (e) {
            console.error(`Greška pri sips konverziji za datoteku: ${file}`);
            failedCount++;
        }
    }

    console.log('\nZavršeno!');
    console.log(`Dodano novih logotipa: ${addedCount}`);
    console.log(`Preskočeno (već imamo): ${skippedCount}`);
    console.log(`Greške pri konverziji: ${failedCount}`);
}

run().catch(console.error);
