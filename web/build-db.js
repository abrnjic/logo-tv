import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.resolve(__dirname, '../logos');
const PUBLIC_LOGOS_DIR = path.resolve(__dirname, 'public/logos');
const DB_PATH = path.resolve(__dirname, 'src/data/channels.json');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_LOGOS_DIR)) {
  fs.mkdirSync(PUBLIC_LOGOS_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const prefixMap = {
  'bih': { country: 'BiH', category: 'General' },
  'ba': { country: 'BiH', category: 'General' },
  'bosna-i-hercegovina': { country: 'BiH', category: 'General' },
  'crna-gora': { country: 'Crna Gora', category: 'General' },
  'djecji': { country: 'Regional', category: 'Dječji' },
  'djeji-kanali': { country: 'Regional', category: 'Dječji' },
  'dokumentarni': { country: 'Regional', category: 'Dokumentarni' },
  'dokumentarni-kanali': { country: 'Regional', category: 'Dokumentarni' },
  'filmski': { country: 'Regional', category: 'Filmski' },
  'filmski-kanali': { country: 'Regional', category: 'Filmski' },
  'makedonija': { country: 'Makedonija', category: 'General' },
  'muzicki': { country: 'Regional', category: 'Glazbeni' },
  'muziki-kanali': { country: 'Regional', category: 'Glazbeni' },
  'pink-media': { country: 'Regional', category: 'Pink Media' },
  'slovenija': { country: 'Slovenija', category: 'General' },
  'si': { country: 'Slovenija', category: 'General' },
  'sport-ex-yu': { country: 'Regional', category: 'Sport (Ex-Yu)' },
  'sport-world': { country: 'International', category: 'Sport' },
  'srbija': { country: 'Srbija', category: 'General' },
  'rs': { country: 'Srbija', category: 'General' },
  'hr': { country: 'Hrvatska', category: 'General' },
  'hrvatska': { country: 'Hrvatska', category: 'General' },
  'international': { country: 'International', category: 'General' },
  '247-kanali': { country: 'International', category: '24/7' },
  'adult': { country: 'International', category: 'Adult' },
  'austrija': { country: 'Austrija', category: 'General' },
  'czech-slovakia': { country: 'Češka/Slovačka', category: 'General' },
  'england': { country: 'Engleska', category: 'General' },
  'francuska': { country: 'Francuska', category: 'General' },
  'germany': { country: 'Njemačka', category: 'General' },
  'hungary': { country: 'Mađarska', category: 'General' },
  'italija': { country: 'Italija', category: 'General' },
  'kosovoalbania': { country: 'Kosovo/Albanija', category: 'General' },
  'netherlands': { country: 'Nizozemska', category: 'General' },
  'news': { country: 'International', category: 'Informativni' },
  'poland': { country: 'Poljska', category: 'General' },
  'radio-stanica': { country: 'Regional', category: 'Radio' },
  'religion-channel': { country: 'International', category: 'Religijski' },
  'skandinavija': { country: 'Skandinavija', category: 'General' },
  'turska': { country: 'Turska', category: 'General' },
  'ufc': { country: 'International', category: 'Sport' },
  'usa': { country: 'SAD', category: 'General' },
  'vicarska': { country: 'Švicarska', category: 'General' }
};

function formatName(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => {
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function collectFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(collectFiles(filePath));
    } else {
      if (file.toLowerCase().endsWith('.png')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const logoFiles = collectFiles(LOGOS_DIR);
const channels = [];

logoFiles.forEach(file => {
  const fileName = path.basename(file);
  const relPath = path.relative(LOGOS_DIR, file);
  const parts = relPath.split(path.sep);
  
  let prefix = '';
  let channelSlug = '';
  
  if (fileName.includes('--')) {
    const split = fileName.replace('.png', '').split('--');
    prefix = split[0];
    channelSlug = split[1];
  } else if (parts.length > 1) {
    prefix = parts[0];
    channelSlug = path.basename(fileName, '.png');
  } else {
    prefix = 'ostalo';
    channelSlug = path.basename(fileName, '.png');
  }

  const mapped = prefixMap[prefix.toLowerCase()] || { country: 'Ostalo', category: 'General' };
  
  // Copy to public/logos
  const destPath = path.join(PUBLIC_LOGOS_DIR, fileName);
  fs.copyFileSync(file, destPath);

  channels.push({
    id: path.basename(fileName, '.png'),
    name: formatName(channelSlug),
    country: mapped.country,
    category: mapped.category,
    image: `logos/${fileName}`
  });
});

channels.sort((a, b) => a.name.localeCompare(b.name, 'hr'));

fs.writeFileSync(DB_PATH, JSON.stringify(channels, null, 2));

console.log(`Successfully processed ${channels.length} logos.`);
