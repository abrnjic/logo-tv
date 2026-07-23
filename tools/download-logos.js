const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const M3U_PATH = path.join(__dirname, '..', '..', 'Proservers.m3u');
const TEMP_DIR = path.join(__dirname, 'temp_logos');

// Očisti ime kanala na isti način kao i u prijašnjim skriptama
function cleanName(name) {
    return name.toString().toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// Sluggify za foldere
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// Funkcija za preuzimanje slike
async function downloadImage(url, tempPath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(tempPath, buffer);
        return true;
    } catch (e) {
        return false;
    }
}

async function processM3U() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const fileStream = fs.createReadStream(M3U_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    // Set for keeping track of what we already processed to avoid duplicates
    const processedChannels = new Set();

    console.log('Započinjem parsiranje M3U liste i preuzimanje slika...');

    for await (const line of rl) {
        if (line.startsWith('#EXTINF:')) {
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const groupTitle = groupMatch ? groupMatch[1].trim() : 'Ostalo';
            
            if (groupTitle.toLowerCase().includes('vod') || groupTitle.toLowerCase().includes('series') || groupTitle.toLowerCase().includes('filmovi 202')) {
                continue;
            }
            
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const logoUrl = logoMatch ? logoMatch[1] : null;

            const nameMatch = line.match(/,(.+)$/);
            let channelName = nameMatch ? nameMatch[1].trim() : 'Unknown';
            channelName = channelName.replace(/[ʰᶠᵉᵛᶜᵈ]+/gi, '').trim();
            channelName = channelName.replace(/\s+(HD|FHD|UHD|4K|HEVC|H265)$/i, '').trim();

            const cName = cleanName(channelName);
            const folderName = slugify(groupTitle);
            
            if (!cName || !folderName || !logoUrl || !logoUrl.startsWith('http') || !logoUrl.toLowerCase().includes('.png')) {
                continue;
            }

            const targetFolder = path.join(LOGOS_DIR, folderName);
            const targetFile = path.join(targetFolder, `${cName}.png`);
            
            // Provjeri postoji li već slika (da ne skidamo ponovno)
            if (fs.existsSync(targetFile)) {
                skippedCount++;
                continue;
            }

            if (processedChannels.has(cName)) {
                continue;
            }
            processedChannels.add(cName);

            // Preuzmi sliku u temp folder
            const tempFile = path.join(TEMP_DIR, `${cName}_temp`);
            // console.log(`Skidam: ${channelName} iz ${logoUrl}...`);
            
            const success = await downloadImage(logoUrl, tempFile);
            if (success) {
                try {
                    // Konverzija u PNG i optimizacija na max 320px
                    execSync(`sips -s format png -Z 320 "${tempFile}" --out "${targetFile}"`, { stdio: 'ignore' });
                    successCount++;
                } catch (e) {
                    console.error(`Greška pri obradi slike (sips) za ${channelName}`);
                    failedCount++;
                } finally {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                }
            } else {
                failedCount++;
            }
            
            // Mali delay da ne spamamo servere (tvprofil itd) s previše zahtjeva istovremeno
            await new Promise(r => setTimeout(r, 50)); 
        }
    }

    console.log(`\nZavršeno!`);
    console.log(`Uspješno preuzeto i konvertirano u PNG: ${successCount}`);
    console.log(`Preskočeno (već postoje): ${skippedCount}`);
    console.log(`Nije uspjelo preuzimanje: ${failedCount}`);

    // Očisti temp
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
}

processM3U().catch(console.error);
