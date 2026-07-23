const fs = require('fs');
const readline = require('readline');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');

// Pomoćna funkcija za pretvaranje imena grupe u naziv foldera (slug)
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Zamiijeni razmake s -
        .replace(/[^\w\-]+/g, '')       // Ukloni sve non-word karaktere osim -
        .replace(/\-\-+/g, '-')         // Zamijeni višestruke - s jednim -
        .replace(/^-+/, '')             // Makni - s početka
        .replace(/-+$/, '');            // Makni - s kraja
}

async function processM3U() {
    const fileStream = fs.createReadStream(path.join(__dirname, '..', '..', 'Proservers.m3u'));
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const groups = {};

    for await (const line of rl) {
        if (line.startsWith('#EXTINF:')) {
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const groupTitle = groupMatch ? groupMatch[1].trim() : 'Ostalo';

            // Zanemari VOD i serije
            if (groupTitle.toLowerCase().includes('vod') || groupTitle.toLowerCase().includes('series') || groupTitle.toLowerCase().includes('filmovi 202')) {
                continue;
            }

            const nameMatch = line.match(/,(.+)$/);
            let channelName = nameMatch ? nameMatch[1].trim() : 'Unknown';

            // Normalizacija imena kanala
            channelName = channelName.replace(/[ʰᶠᵉᵛᶜᵈ]+/gi, '').trim();
            channelName = channelName.replace(/\s+(HD|FHD|UHD|4K|HEVC|H265)$/i, '').trim();

            if (!groups[groupTitle]) {
                groups[groupTitle] = new Set();
            }
            groups[groupTitle].add(channelName);
        }
    }

    console.log('Kreiram foldere i liste kanala...');

    let ukupnoKategorija = 0;
    
    for (const [groupName, channels] of Object.entries(groups)) {
        const folderName = slugify(groupName);
        if (!folderName) continue;

        const groupPath = path.join(LOGOS_DIR, folderName);

        // Kreiraj folder ako ne postoji
        if (!fs.existsSync(groupPath)) {
            fs.mkdirSync(groupPath, { recursive: true });
            console.log(`[ NOVO ] Folder kreiran: ${folderName}`);
        }

        // Stvori popis kanala (popis.txt) u tom folderu
        const listPath = path.join(groupPath, 'popis_kanala.txt');
        const sortedChannels = Array.from(channels).sort();
        
        let content = `Popis kanala za grupu: ${groupName}\n`;
        content += `Ukupno kanala: ${sortedChannels.length}\n`;
        content += `=========================================\n\n`;
        
        sortedChannels.forEach(ch => {
            content += `- ${ch}\n`;
        });

        fs.writeFileSync(listPath, content);
        ukupnoKategorija++;
    }

    console.log(`\nGotovo! Organizirano ${ukupnoKategorija} država/kategorija unutar 'logos' foldera.`);
}

processM3U().catch(console.error);
