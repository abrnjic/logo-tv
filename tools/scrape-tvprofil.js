const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGOS_DIR = path.join(__dirname, '..', 'logos');
const DATA_DIR = path.join(__dirname, '..', 'web', 'src', 'data');
const DB_PATH = path.join(DATA_DIR, 'tvprofil_db.json');
const TEMP_DIR = path.join(__dirname, 'temp_logos_tvp');

function cleanName(name) {
    return name.toString().toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function downloadImage(url, tempPath) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(tempPath, buffer);
        return true;
    } catch (e) {
        return false;
    }
}

async function run() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('Fetching groups from tvprofil...');
    const response = await fetch('https://tvprofil.com/kanali/', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const groups = [];
    $('ul.col-12.ai li a').each((i, el) => {
        const href = $(el).attr('href');
        let name = $(el).text().trim();
        name = name.replace(/\s*\(\d+\)$/, '');
        
        if (href && href.includes('kanali/grupa')) {
            groups.push({ name, href });
        }
    });

    console.log(`Found ${groups.length} groups.`);
    let allChannels = [];

    // Fetch channels for each group
    for (const group of groups) {
        console.log(`Fetching channels for: ${group.name}...`);
        try {
            const groupResp = await fetch('https://tvprofil.com' + group.href, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const groupHtml = await groupResp.text();
            const $g = cheerio.load(groupHtml);
            
            $g('ul.col-12.ai li a').each((i, el) => {
                const name = $g(el).text().trim();
                let logo = $g(el).find('img').attr('data-src') || $g(el).find('img').attr('src') || $g(el).prev('img').attr('src');
                if (logo && logo.startsWith('//')) logo = 'https:' + logo;
                if (logo && logo.startsWith('/')) logo = 'https://tvprofil.com' + logo;
                
                // Makni parametre ?1753943684 iz URL-a
                if (logo && logo.includes('?')) {
                    logo = logo.split('?')[0];
                }

                if (name && logo) {
                    allChannels.push({
                        group: group.name,
                        name: name,
                        logo: logo,
                        cleanName: cleanName(name),
                        folder: slugify(group.name)
                    });
                }
            });
            await new Promise(r => setTimeout(r, 200)); // be nice to the server
        } catch (e) {
            console.error(`Failed to fetch group ${group.name}: ${e.message}`);
        }
    }

    console.log(`Total channels scraped: ${allChannels.length}`);
    fs.writeFileSync(DB_PATH, JSON.stringify(allChannels, null, 2));

    // Sada provjeravamo i preuzimamo ono što nam fali
    console.log('\nCross-referencing and downloading missing PNGs...');
    let successCount = 0;
    
    for (const ch of allChannels) {
        // Provjeri je li logo PNG
        if (!ch.logo.toLowerCase().endsWith('.png')) {
            continue;
        }

        const targetFolder = path.join(LOGOS_DIR, ch.folder);
        const targetFile = path.join(targetFolder, `${ch.cleanName}.png`);

        // Ako nemamo folder, kreiramo ga
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const tempFile = path.join(TEMP_DIR, `${ch.cleanName}_temp.png`);
        
        const success = await downloadImage(ch.logo, tempFile);
        if (success) {
            try {
                // Provjeri dimenzije prije skaliranja
                const outW = execSync(`sips -g pixelWidth "${tempFile}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
                const outH = execSync(`sips -g pixelHeight "${tempFile}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
                const maxDim = Math.max(parseInt(outW, 10), parseInt(outH, 10));

                if (maxDim > 320) {
                    // Smanji ako je veće od 320
                    execSync(`sips -s format png -Z 320 "${tempFile}" --out "${targetFile}"`, { stdio: 'ignore' });
                } else {
                    // Samo konvertiraj u png ako je malo, nemoj rastezati!
                    execSync(`sips -s format png "${tempFile}" --out "${targetFile}"`, { stdio: 'ignore' });
                }
                
                successCount++;
                process.stdout.write('+');
            } catch (e) {
                process.stdout.write('!');
            } finally {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            }
        } else {
            process.stdout.write('x');
        }
        await new Promise(r => setTimeout(r, 50));
    }

    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`\n\nScraping i preuzimanje završeno. Novih slika preuzeto: ${successCount}`);
}

run().catch(console.error);
