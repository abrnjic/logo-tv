const fs = require('fs');
const path = require('path');

const dbJsPath = path.resolve(__dirname, '../web/build-db.js');
let dbJs = fs.readFileSync(dbJsPath, 'utf-8');

const newPrefixes = {
  'albanska-televizija': { country: 'Albanija', category: 'General' },
  'austrijska-televizija': { country: 'Austrija', category: 'General' },
  'azerbaijantelevision': { country: 'Azerbejdžan', category: 'General' },
  'britanska-televizija': { country: 'Engleska', category: 'General' },
  'bugarska-televizija': { country: 'Bugarska', category: 'General' },
  'canadiantelevision': { country: 'Kanada', category: 'General' },
  'chinesetelevision': { country: 'Kina', category: 'General' },
  'crnogorska-televizija': { country: 'Crna Gora', category: 'General' },
  'czechtelevision': { country: 'Češka', category: 'General' },
  'danska-televizija': { country: 'Danska', category: 'General' },
  'dutchtelevision': { country: 'Nizozemska', category: 'General' },
  'finnishtelevision': { country: 'Finska', category: 'General' },
  'francuska-televizija': { country: 'Francuska', category: 'General' },
  'greektelevision': { country: 'Grčka', category: 'General' },
  'hrvatska-televizija': { country: 'Hrvatska', category: 'General' },
  'indiantelevision': { country: 'Indija', category: 'General' },
  'indonesiantelevision': { country: 'Indonezija', category: 'General' },
  'irska-televizija': { country: 'Irska', category: 'General' },
  'koreantelevision': { country: 'Koreja', category: 'General' },
  'maarska-televizija': { country: 'Mađarska', category: 'General' },
  'makedonska-televizija': { country: 'Makedonija', category: 'General' },
  'malaysiatelevision': { country: 'Malezija', category: 'General' },
  'moldovantelevision': { country: 'Moldavija', category: 'General' },
  'njemaka-televizija': { country: 'Njemačka', category: 'General' },
  'norwegiantelevision': { country: 'Norveška', category: 'General' },
  'panjolska-televizija': { country: 'Španjolska', category: 'General' },
  'perutelevision': { country: 'Peru', category: 'General' },
  'philippinestelevision': { country: 'Filipini', category: 'General' },
  'poljska-televizija': { country: 'Poljska', category: 'General' },
  'portugaltelevision': { country: 'Portugal', category: 'General' },
  'rumunjska-televizija': { country: 'Rumunjska', category: 'General' },
  'russiantelevision': { country: 'Rusija', category: 'General' },
  'singaporetelevision': { country: 'Singapur', category: 'General' },
  'slovakiantelevision': { country: 'Slovačka', category: 'General' },
  'slovenska-televizija': { country: 'Slovenija', category: 'General' },
  'southafricantelevision': { country: 'Južna Afrika', category: 'General' },
  'srbijanska-televizija': { country: 'Srbija', category: 'General' },
  'talijanska-televizija': { country: 'Italija', category: 'General' },
  'televizija-bih': { country: 'BiH', category: 'General' },
  'televizija-kosovo': { country: 'Kosovo', category: 'General' },
  'thailandtelevision': { country: 'Tajland', category: 'General' },
  'turska-televizija': { country: 'Turska', category: 'General' },
  'uaetelevision': { country: 'UAE', category: 'General' },
  'ukrainetelevision': { country: 'Ukrajina', category: 'General' },
  'usatelevision': { country: 'SAD', category: 'General' },
  'vicarska-televizija': { country: 'Švicarska', category: 'General' },
  'vietnamtelevision': { country: 'Vijetnam', category: 'General' },
  'djeji': { country: 'Regional', category: 'Dječji' },
  'dokumentarni': { country: 'Regional', category: 'Dokumentarni' },
  'erotski': { country: 'International', category: 'Adult' },
  'filmski': { country: 'Regional', category: 'Filmski' },
  'glazbeni': { country: 'Regional', category: 'Glazbeni' },
  'informativni': { country: 'Regional', category: 'Informativni' },
  'lifestyle': { country: 'Regional', category: 'Lifestyle' },
  'lokalni': { country: 'Regional', category: 'Lokalni' },
  'radiochannels': { country: 'International', category: 'Radio' },
  'regionalni': { country: 'Regional', category: 'Regionalni' },
  'satelitski-program': { country: 'Regional', category: 'Satelitski' },
  'sportski': { country: 'Regional', category: 'Sport' },
  'teleshop': { country: 'Regional', category: 'Teleshop' },
  'foreign': { country: 'International', category: 'General' }
};

let prefixMapStr = "const prefixMap = {\n";
for (const [key, val] of Object.entries(newPrefixes)) {
  prefixMapStr += `  '${key}': { country: '${val.country}', category: '${val.category}' },\n`;
}
prefixMapStr += `  // Originalni unosi\n`;

const parts = dbJs.split('const prefixMap = {');
const secondPart = parts[1].split(/};\n/)[1];
const oldMapLines = parts[1].split(/};\n/)[0].trim();

const newContent = parts[0] + prefixMapStr + "  " + oldMapLines + "\n};\n" + secondPart;
fs.writeFileSync(dbJsPath, newContent);
console.log('build-db.js updated with new prefixes');
