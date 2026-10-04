// Presentation aliases only: original IDs, file paths and stored records stay intact.
const countryAliases = {
  Albania: "Albanija",
  Australia: "Australija",
  Austria: "Austrija",
  Azerbaijan: "Azerbejdžan",
  Belgium: "Belgija",
  Bulgaria: "Bugarska",
  Canada: "Kanada",
  Caribbean: "Karibi",
  Chile: "Čile",
  "Costa Rica": "Kostarika",
  Croatia: "Hrvatska",
  "Czech Republic": "Češka",
  Denmark: "Danska",
  Finland: "Finska",
  France: "Francuska",
  Greece: "Grčka",
  Iceland: "Island",
  India: "Indija",
  Indonesia: "Indonezija",
  International: "Međunarodni",
  Ireland: "Irska",
  Israel: "Izrael",
  Italy: "Italija",
  Jamaica: "Jamajka",
  Kosovo: "Kosovo",
  Lebanon: "Libanon",
  Lithuania: "Litva",
  Luxembourg: "Luksemburg",
  Malaysia: "Malezija",
  Mexico: "Meksiko",
  "New Zealand": "Novi Zeland",
  Nordic: "Skandinavija",
  Norway: "Norveška",
  Philippines: "Filipini",
  Portugal: "Portugal",
  Regional: "Regionalni",
  Romania: "Rumunjska",
  Russia: "Rusija",
  Serbia: "Srbija",
  Singapore: "Singapur",
  Slovakia: "Slovačka",
  Slovenia: "Slovenija",
  "South Africa": "Južna Afrika",
  Spain: "Španjolska",
  Sweden: "Švedska",
  Switzerland: "Švicarska",
  Turkey: "Turska",
  Ukraine: "Ukrajina",
  "United Arab Emirates": "UAE",
  "United Kingdom": "Engleska",
  "Bosnia and Herzegovina": "BiH",
  Montenegro: "Crna Gora",
  Macedonia: "Makedonija",
  "North Macedonia": "Makedonija",
  "United States": "SAD",
  Other: "Ostalo",
};

export const EX_YU_COUNTRIES = [
  "Hrvatska",
  "Srbija",
  "BiH",
  "Slovenija",
  "Crna Gora",
  "Makedonija",
];
export const countryLabel = (country) => countryAliases[country] || country;
export const categoryLabel = (category) =>
  ({ General: "Opći", Adult: "Za odrasle", Lifestyle: "Životni stil" })[
    category
  ] || category;

const cleanName = (name) =>
  name
    .toLocaleLowerCase("hr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.\s]/g, "");

export function filterChannels(
  channels,
  { search = "", country = "All", category = "All", quick = "all" } = {},
) {
  const query = cleanName(search.trim());
  const words = search
    .trim()
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map(cleanName);
  const results = channels.filter((channel) => {
    const label = countryLabel(channel.country);
    if (country !== "All" && label !== country) return false;
    if (category !== "All" && channel.category !== category) return false;
    if (quick === "hr" && label !== "Hrvatska") return false;
    if (quick === "exyu" && !EX_YU_COUNTRIES.includes(label)) return false;
    if (quick === "sport" && !channel.category.startsWith("Sport"))
      return false;
    if (quick === "radio" && channel.category !== "Radio") return false;
    const name = cleanName([channel.displayName || channel.name, channel.name, channel.id, ...(channel.aliases || [])].join(" "));
    return (
      !query ||
      name.includes(query) ||
      words.every((word) => name.includes(word))
    );
  });
  if (query)
    results.sort((a, b) => {
      const rank = (channel) =>
        cleanName(channel.displayName || channel.name) === query
          ? 0
          : cleanName(channel.displayName || channel.name).startsWith(query)
            ? 1
            : 2;
      return rank(a) - rank(b);
    });
  return results;
}
