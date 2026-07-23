const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');

const MERGE_MAP = {
    'albanska-televizija': 'albania',
    'kosovoalbania': 'albania',
    'austrija': 'austria',
    'austrijska-televizija': 'austria',
    'francuska': 'france',
    'francuska-televizija': 'france',
    'hrvatska-televizija': 'hrvatska',
    'hr': 'hrvatska',
    'italija': 'italy',
    'talijanska-televizija': 'italy',
    'njemaka-televizija': 'germany',
    'maarska-televizija': 'hungary',
    'makedonska-televizija': 'makedonija',
    'poljska-televizija': 'poland',
    'rumunjska-televizija': 'romania',
    'srbijanska-televizija': 'srbija',
    'rs': 'srbija',
    'slovenska-televizija': 'slovenija',
    'si': 'slovenija',
    'turska': 'turkey',
    'turska-televizija': 'turkey',
    'united-states': 'usa',
    'usatelevision': 'usa',
    'vicarska': 'switzerland',
    'vicarska-televizija': 'switzerland',
    'indiantelevision': 'india',
    'finnishtelevision': 'finland',
    'greektelevision': 'greece',
    'indonesiantelevision': 'indonesia',
    'koreantelevision': 'korea',
    'malaysiatelevision': 'malaysia',
    'moldovantelevision': 'moldova',
    'norwegiantelevision': 'norway',
    'perutelevision': 'peru',
    'philippinestelevision': 'philippines',
    'portugaltelevision': 'portugal',
    'russiantelevision': 'russia',
    'slovakiantelevision': 'slovakia',
    'southafricantelevision': 'south-africa',
    'thailandtelevision': 'thailand',
    'uaetelevision': 'united-arab-emirates',
    'ukrainetelevision': 'ukraine',
    'vietnamtelevision': 'vietnam',
    'azerbaijantelevision': 'azerbaijan'
};

function moveFile(oldPath, newPath) {
    const targetDir = path.dirname(newPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    // Provjeri postoji li već (overwrite)
    fs.renameSync(oldPath, newPath);
}

console.log('Spajam mape...');

// 1. Premjesti datoteke iz mapa koje treba spojiti
const folders = fs.readdirSync(LOGOS_DIR).filter(f => fs.statSync(path.join(LOGOS_DIR, f)).isDirectory());

for (const folder of folders) {
    if (MERGE_MAP[folder]) {
        const targetFolder = MERGE_MAP[folder];
        console.log(`Praznim mapu '${folder}' u '${targetFolder}'...`);
        const files = fs.readdirSync(path.join(LOGOS_DIR, folder));
        for (const file of files) {
            if (file.endsWith('.png')) {
                moveFile(path.join(LOGOS_DIR, folder, file), path.join(LOGOS_DIR, targetFolder, file));
            }
        }
    }
}

// 2. Riješi datoteke koje vise izvan mapa (npr. bih--amari-tv.png)
console.log('Rješavam datoteke izvan mapa...');
const rootFiles = fs.readdirSync(LOGOS_DIR).filter(f => fs.statSync(path.join(LOGOS_DIR, f)).isFile() && f.endsWith('.png'));

for (const file of rootFiles) {
    if (file.includes('--')) {
        const parts = file.split('--');
        const folderName = parts[0];
        const newFileName = parts[1]; // amari-tv.png
        
        console.log(`Pomičem '${file}' u mapu '${folderName}' pod imenom '${newFileName}'`);
        moveFile(path.join(LOGOS_DIR, file), path.join(LOGOS_DIR, folderName, newFileName));
    }
}

// 3. Obriši prazne mape
console.log('Brišem prazne mape...');
const allFolders = fs.readdirSync(LOGOS_DIR).filter(f => fs.statSync(path.join(LOGOS_DIR, f)).isDirectory());
let deletedFoldersCount = 0;

for (const folder of allFolders) {
    const fPath = path.join(LOGOS_DIR, folder);
    const files = fs.readdirSync(fPath);
    if (files.length === 0) {
        fs.rmdirSync(fPath);
        console.log(`Obrisana prazna mapa: ${folder}`);
        deletedFoldersCount++;
    } else {
        // provjeri ima li ijednu png sliku, jer ako su tu samo druge mape ili .DS_Store, onda je logički prazna
        const hasPng = files.some(f => f.endsWith('.png'));
        if (!hasPng) {
            fs.rmSync(fPath, { recursive: true, force: true });
            console.log(`Obrisana mapa bez slika: ${folder}`);
            deletedFoldersCount++;
        }
    }
}

console.log(`Završeno! Obrisano ${deletedFoldersCount} praznih mapa.`);
