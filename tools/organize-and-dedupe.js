const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const DB_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'tvprofil_db.json');
const RECOVERED_DIR = path.join(LOGOS_DIR, 'recovered');

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

// 1. Vrati recovered datoteke u njihove prave foldere
if (fs.existsSync(RECOVERED_DIR)) {
    console.log('Vraćam spašene HD logotipe u originalne mape...');
    const tvData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const folderMap = new Map();
    for (const ch of tvData) {
        folderMap.set(ch.cleanName, ch.folder);
    }

    const recoveredFiles = fs.readdirSync(RECOVERED_DIR);
    for (const file of recoveredFiles) {
        if (!file.endsWith('.png')) continue;
        const cName = file.replace('.png', '');
        let folderName = folderMap.get(cName) || 'ostalo';
        
        const targetDir = path.join(LOGOS_DIR, folderName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        const oldPath = path.join(RECOVERED_DIR, file);
        const newPath = path.join(targetDir, file);
        
        fs.renameSync(oldPath, newPath);
    }
    fs.rmdirSync(RECOVERED_DIR);
}

// 2. Fuzzy deduplikacija po folderima
console.log('Tražim i brišem logičke duplikate (npr. pink1 i pink1hd)...');
let duplicateCount = 0;

const folders = fs.readdirSync(LOGOS_DIR).filter(f => fs.statSync(path.join(LOGOS_DIR, f)).isDirectory());

for (const folder of folders) {
    const folderPath = path.join(LOGOS_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
    
    // Grupiraj datoteke po fuzzy imenu
    const groups = new Map();
    for (const file of files) {
        const cName = file.replace('.png', '');
        const fuzzy = fuzzyClean(cName);
        if (!groups.has(fuzzy)) groups.set(fuzzy, []);
        groups.get(fuzzy).push(file);
    }

    // Unutar svake grupe, zadrži samo najveću datoteku (najbolja kvaliteta)
    for (const [fuzzy, groupFiles] of groups.entries()) {
        if (groupFiles.length > 1) {
            // Sortiraj po veličini (od najveće do najmanje)
            groupFiles.sort((a, b) => {
                const sizeA = fs.statSync(path.join(folderPath, a)).size;
                const sizeB = fs.statSync(path.join(folderPath, b)).size;
                return sizeB - sizeA;
            });
            
            // Ostavi prvu, obriši ostale
            const keptFile = groupFiles[0];
            for (let i = 1; i < groupFiles.length; i++) {
                const fileToDelete = groupFiles[i];
                fs.unlinkSync(path.join(folderPath, fileToDelete));
                duplicateCount++;
                console.log(`Obrisan duplikat: ${fileToDelete} (zadržan: ${keptFile})`);
            }
        }
    }
}

console.log(`Fuzzy deduplikacija završena! Obrisano ${duplicateCount} logičkih duplikata.`);
