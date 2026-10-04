import { useState, useRef, useMemo } from "react";
import rawChannels from "../data/channels.json";
import metadata from "../../catalogue-overrides.json";
import { prepareCatalogue, normalizeChannel } from "../lib/channelNames";
const channelsData = prepareCatalogue(rawChannels, metadata);
const allLogoChannels = rawChannels.map(normalizeChannel);
import Fuse from "fuse.js";
import { repairPlaylist } from "../lib/playlist";
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
      const repaired = repairPlaylist(
        fileContent,
        allLogoChannels,
        (rawName) => {
          const searchJoined = rawName.toLowerCase().replace(/[-_.\s]/g, "");
          const exact = channelsData.find(
            (channel) =>
              channel.name.toLowerCase().replace(/[-_.\s]/g, "") ===
              searchJoined,
          );
          return exact || fuse.search(cleanChannelName(rawName))[0]?.item;
        },
      );
      setResult(repaired);
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
            njihove javne PNG linkove. Stare Logo TV linkove popravljamo prema
            nazivu datoteke, čak i kad je kanal drugačije nazvan.
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
