const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const M3U_PATH = '/Users/abrnjic1/Documents/Logo tv/Proservers.m3u';
const MISSING_PATH = path.join(__dirname, '..', 'web', 'src', 'data', 'missing_logos.json');
const TEMP_DIR = path.join(__dirname, 'temp_hd');

function fuzzyClean(name) {
    let n = name.toString().toLowerCase();
    n = n.replace(/hd/g, '');
    n = n.replace(/fhd/g, '');
    n = n.replace(/hevc/g, '');
    n = n.replace(/4k/g, '');
    n = n.replace(/b$/g, '');
    n = n.replace(/[^a-z0-9]/g, '');
    return n;
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
    if (!fs.existsSync(MISSING_PATH)) {
        console.log('Nema missing_logos.json. Nemam što raditi.');
        return;
    }

    const missingLogos = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf-8'));
    console.log(`Tražim HD zamjene za ${missingLogos.length} obrisanih logotipa...`);

    const fuzzyMissingMap = new Map();
    for (const name of missingLogos) {
        fuzzyMissingMap.set(fuzzyClean(name), name);
    }

    const m3uContent = fs.readFileSync(M3U_PATH, 'utf-8');
    const lines = m3uContent.split('\n');

    let recoveredCount = 0;
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    const processedFuzzy = new Set();

    for (const line of lines) {
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const nameMatch = line.match(/tvg-name="([^"]+)"/) || line.match(/,(.+)$/);
            
            if (logoMatch && nameMatch) {
                let logoUrl = logoMatch[1];
                const channelName = nameMatch[1].trim();
                const fuzzyName = fuzzyClean(channelName);

                // Preskoči ako smo ga već riješili
                if (processedFuzzy.has(fuzzyName)) continue;

                // Ako je u našoj listi obrisanih (matchamo preko fuzzy imena)
                if (fuzzyMissingMap.has(fuzzyName)) {
                    const originalCleanName = fuzzyMissingMap.get(fuzzyName);
                    
                    // Transformiraj tvprofil link da dobijemo HD verziju
                    // Original: https://cdn-0.tvprofil.com/cdn/100x64/4/img/kanali-logo/htv1-logo.png
                    // Cilj: https://tvprofil.com/img/kanali-logo/htv1-logo.png
                    if (logoUrl.includes('tvprofil.com')) {
                        logoUrl = logoUrl.replace(/https?:\/\/cdn-\d+\.tvprofil\.com\/cdn\/[^\/]+\/\d+\//, 'https://tvprofil.com/');
                        logoUrl = logoUrl.replace(/https?:\/\/tvprofil\.com\/cdn\/[^\/]+\/\d+\//, 'https://tvprofil.com/');
                    }

                    console.log(`Pronađen HD za ${originalCleanName} -> ${logoUrl}`);
                    
                    const tempPath = path.join(TEMP_DIR, `${originalCleanName}_temp.png`);
                    const success = await downloadImage(logoUrl, tempPath);
                    
                    if (success) {
                        try {
                            const outW = execSync(`sips -g pixelWidth "${tempPath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
                            const outH = execSync(`sips -g pixelHeight "${tempPath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
                            const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

                            // Stavimo u folder 'recovered' unutar logos
                            const targetFolder = path.join(LOGOS_DIR, 'recovered');
                            if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
                            
                            const targetFile = path.join(targetFolder, `${originalCleanName}.png`);

                            if (maxDim > 320) {
                                execSync(`sips -s format png -Z 320 "${tempPath}" --out "${targetFile}"`, { stdio: 'ignore' });
                            } else {
                                execSync(`sips -s format png "${tempPath}" --out "${targetFile}"`, { stdio: 'ignore' });
                            }
                            
                            recoveredCount++;
                            processedFuzzy.add(fuzzyName);
                        } catch (e) {
                            console.error(`Greška kod sips za ${originalCleanName}`);
                        } finally {
                            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                        }
                    }
                    await new Promise(r => setTimeout(r, 50));
                }
            }
        }
    }

    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`Završeno! Uspješno preuzeto i spremljeno ${recoveredCount} HD logotipa u 'logos/recovered'.`);
}

run().catch(console.error);
