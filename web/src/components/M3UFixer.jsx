import { useState, useRef, useMemo } from "react";
import channelsData from "../data/channels.json";
import Fuse from "fuse.js";
import { getLogoUrl } from "../lib/logoUrl";
import Icon from "./Icon";

export default function M3UFixer() {
  const [fileContent, setFileContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const fuse = useMemo(
    () =>
      new Fuse(channelsData, {
        keys: ["name"],
        includeScore: true,
        threshold: 0.3,
        distance: 100,
      }),
    [],
  );

  const cleanChannelName = (name) => {
    return name
      .replace(/\[.*?\]|\(.*?\)/g, "") // uklanja sve u zagradama
      .replace(
        /(?:\b)(HD|FHD|UHD|4K|HEVC|H265|EXYU|HR|SRB|BIH|MK|SLO|CG)(?:\b)/gi,
        "",
      ) // uklanja česte IPTV tagove
      .replace(/[-_.:|]/g, " ") // specijalni znakovi u razmak
      .replace(/\s+/g, " ") // dupli razmaci u jedan
      .trim();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target.result);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const processM3U = () => {
    if (!fileContent.trim()) return;
    setIsProcessing(true);

    setTimeout(() => {
      const lines = fileContent.split("\n");
      let newLines = [];
      let matchCount = 0;
      let totalChannels = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("#EXTINF:")) {
          totalChannels++;
          const commaIndex = line.lastIndexOf(",");
          if (commaIndex !== -1) {
            const rawName = line.substring(commaIndex + 1).trim();
            const searchJoined = rawName.toLowerCase().replace(/[-_.\s]/g, "");

            // Prvo probamo naći savršeno poklapanje (stari način za brzinu i točnost)
            let match = channelsData.find(
              (ch) =>
                ch.name.toLowerCase().replace(/[-_.\s]/g, "") === searchJoined,
            );

            // Ako nema savršenog poklapanja, koristimo Fuzzy (umjetnu inteligenciju)
            if (!match) {
              const cleanedName = cleanChannelName(rawName);
              const fuzzyResults = fuse.search(cleanedName);
              if (fuzzyResults.length > 0) {
                // Uzimamo najbolji rezultat (najmanji score)
                match = fuzzyResults[0].item;
              }
            }

            if (match) {
              matchCount++;
              const githubUrl = getLogoUrl(match.image);

              // Replace or add tvg-logo
              let newLine = line;
              if (newLine.includes('tvg-logo="')) {
                newLine = newLine.replace(
                  /tvg-logo="[^"]*"/,
                  `tvg-logo="${githubUrl}"`,
                );
              } else {
                // Insert tvg-logo after #EXTINF: or after the duration
                newLine = newLine.replace(
                  /#EXTINF:([^,]+),/,
                  `#EXTINF:$1 tvg-logo="${githubUrl}",`,
                );
              }
              newLines.push(newLine);
            } else {
              newLines.push(line);
            }
          } else {
            newLines.push(line);
          }
        } else {
          newLines.push(line);
        }
      }

      setResult({
        content: newLines.join("\n"),
        matchCount,
        totalChannels,
      });
      setIsProcessing(false);
    }, 100);
  };

  const downloadM3U = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fixed_playlist.m3u";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="m3u-fixer-container">
      <div className="fixer-card">
        <div className="fixer-intro">
          <span className="eyebrow">ALAT ZA TV LISTE</span>
          <h2>Novi logotipi za tvoju M3U listu.</h2>
          <p>
            Učitaj listu ili zalijepi tekst. Pronaći ćemo kanale i dodati
            njihove javne PNG linkove.
          </p>
          <ol className="fixer-steps">
            <li>Dodaj svoju listu</li>
            <li>Popravi logotipe</li>
            <li>Preuzmi rezultat</li>
          </ol>
        </div>
        <div className="fixer-workspace">
          <div className="upload-zone">
            <input
              type="file"
              accept=".m3u,.m3u8,.txt"
              ref={fileInputRef}
              onChange={handleFileUpload}
              hidden
              aria-label="Učitaj M3U datoteku"
            />
            <button
              className="button secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="file" />
              Odaberi M3U datoteku
            </button>
            <span>M3U, M3U8 ili TXT</span>
          </div>
          <label className="field-label" htmlFor="m3u-input">
            Ili zalijepi sadržaj liste
          </label>
          <textarea
            id="m3u-input"
            className="m3u-textarea"
            value={fileContent}
            onChange={(event) => {
              setFileContent(event.target.value);
              setResult(null);
            }}
            placeholder={"#EXTM3U\n#EXTINF:-1, naziv kanala\nhttps://..."}
            spellCheck={false}
          />
          <div className="fixer-actions">
            <span>Obrada se odvija u tvom pregledniku.</span>
            <button
              className="button primary"
              onClick={processM3U}
              disabled={!fileContent.trim() || isProcessing}
            >
              <Icon name="check" />
              {isProcessing ? "Obrađujem…" : "Popravi logotipe"}
            </button>
          </div>
          {result && (
            <div className="result-card" role="status">
              <h3>
                <Icon name="check" />
                Obrada je završena
              </h3>
              <p>
                Popravljeni logotipi za <strong>{result.matchCount}</strong> od{" "}
                <strong>{result.totalChannels}</strong> kanala.
              </p>
              <button className="button primary" onClick={downloadM3U}>
                <Icon name="download" />
                Preuzmi popravljenu listu
              </button>
              <details className="result-preview">
                <summary>Pregled popravljene liste</summary>
                <textarea
                  className="m3u-textarea"
                  aria-label="Popravljena M3U lista"
                  value={result.content}
                  readOnly
                  spellCheck={false}
                />
              </details>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
