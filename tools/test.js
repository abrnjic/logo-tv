const cheerio = require('cheerio');

async function test() {
    try {
        const response = await fetch('https://tvprofil.com/kanali/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const groups = [];
        $('ul.col-12.ai li a').each((i, el) => {
            const href = $(el).attr('href');
            let name = $(el).text().trim();
            // Ukloni broj u zagradi npr. (54)
            name = name.replace(/\s*\(\d+\)$/, '');
            
            if (href && href.includes('kanali/grupa')) {
                groups.push({ name, href });
            }
        });
        
        console.log('Groups found:', groups.slice(0, 5));
        
        if (groups.length > 0) {
            console.log(`\nFetching channels for group: ${groups[0].name} (${groups[0].href})`);
            const groupResp = await fetch('https://tvprofil.com' + groups[0].href, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const groupHtml = await groupResp.text();
            const $g = cheerio.load(groupHtml);
            
            const channels = [];
            $g('ul.col-12.ai li a').each((i, el) => {
                const name = $g(el).text().trim();
                const logo = $g(el).find('img').attr('data-src') || $g(el).find('img').attr('src') || $g(el).prev('img').attr('src');
                
                // Ponekad je struktura drugačija
                // probajmo ispisati html oko elementa
                if (i === 0) {
                    console.log('HTML prvog:', $g(el).parent().html());
                }

                if (name) {
                    channels.push({ name, logo });
                }
            });
            console.log('Channels in first group:', channels.slice(0, 5));
        }
    } catch (e) {
        console.error(e);
    }
}
test();
