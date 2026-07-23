# Logo TV 📺

Logo TV je premium web aplikacija i baza visokokvalitetnih (transparentnih) logotipa za TV kanale, namijenjena prvenstveno za IPTV liste, portale i set-top box uređaje. Baza trenutno sadrži preko 13,000 očišćenih i optimiziranih logotipa iz cijelog svijeta.

🌐 **Demo / Web Stranica:** [https://abrnjic.github.io/logo-tv/](https://abrnjic.github.io/logo-tv/)

---

## Glavne značajke (Features) ✨

- **Preko 13,000 visokokvalitetnih logotipa:** Svi logotipi su strogo filtrirani kako bi imali prozirnu pozadinu (transparent PNG) i optimalnu rezoluciju.
- **M3U Fixer (Popravljač IPTV listi):** Učitaj svoju `.m3u` listu, a aplikacija će automatski pronaći tvoje kanale i zamijeniti stare, potrgane logotipe novim premium poveznicama s Logo TV-a.
- **Sustav Favorita (Favorites):** Klikom na ikonu "🤍" možeš spremiti željene kanale. Nakon toga možeš:
  - Preuzeti cijelu arhivu slika u `.zip` formatu!
  - Kopirati ih kao M3U kod.
  - Kopirati ih u JSON formatu.
- **Superbrza Tražilica i "Auto-suggest":** Trenutni prikaz predloženih kanala prilikom upisivanja.
- **Alati za integraciju:** Gumb za kopiranje javnog linka slike, ili direktno kopiranje binarne `.png` slike u međuspremnik (clipboard).
- **Napredni UI:**
  - Moderni Glassmorphism dizajn.
  - Tamna i svijetla tema (Dark/Light mode).
  - Klizač (slider) za prilagođavanje veličine (zooma) ikona na ekranu.
  - Beskonačno skrolanje (Infinite Scroll) bez potrebe za gumbom "Prikaži više".

---

## Kako koristiti M3U Fixer? 🛠️

1. Otvori stranicu i odaberi **M3U Fixer** tab.
2. Klikni na **"Odaberi .m3u datoteku"** ili jednostavno zalijepi kod unutar polja.
3. Klikni **"Popravi logotipe"**.
4. Algoritam će skenirati tvoju listu, prepoznati kanale prema tekstu i automatski dodati `tvg-logo` URL.
5. Klikni **"Preuzmi popravljenu listu"** kako bi dobio svoju novu `fixed_playlist.m3u`.

---

## Tehnologije 💻

Projekt je razvijen koristeći najnovije Web tehnologije:
- **React (Vite):** Frontend framework za brzi rad i renderiranje.
- **CSS / Glassmorphism:** Čisti CSS s varijablama za dinamične teme.
- **JSZip & FileSaver:** Za generiranje `.zip` arhiva direktno u pregledniku.
- **GitHub Pages:** Za hosting baze podataka slika i aplikacije.
- **Node.js Skripte:** U pozadini (u folderu `tools/`) nalaze se skripte koje smo koristili za audiciju i brisanje tisuća logotipa loše rezolucije.

---

## Struktura mapa (Korisno za Developere) 📂

- `/logos/` - Cijela baza čistih slika kanala (više od 13,000 slika).
- `/web/` - Izvorne datoteke React aplikacije.
- `/tools/` - Različite Node.js skripte za obradu slika.
- `/web/src/data/channels.json` - "Mozak" aplikacije, meta-podaci koji povezuju slike s državama i kategorijama.

---

## Licenca 📄

Ovaj projekt dostupan je pod besplatnom **MIT Licencom**.
Slobodno ga kloniraj, koristi u svojim aplikacijama, mijenjaj i dijeli! Za više detalja pročitaj [LICENSE](LICENSE) datoteku.

---

*Napravljeno s ❤️ za IPTV zajednicu.*