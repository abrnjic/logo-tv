import { useState, useRef, useMemo } from 'react';
import channelsData from '../data/channels.json';
import Fuse from 'fuse.js';

export default function M3UFixer() {
  const [fileContent, setFileContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const fuse = useMemo(() => new Fuse(channelsData, {
    keys: ['name'],
    includeScore: true,
    threshold: 0.3, 
    distance: 100,
  }), []);

  const cleanChannelName = (name) => {
    return name
      .replace(/\[.*?\]|\(.*?\)/g, '') // uklanja sve u zagradama
      .replace(/(?:\b)(HD|FHD|UHD|4K|HEVC|H265|EXYU|HR|SRB|BIH|MK|SLO|CG)(?:\b)/gi, '') // uklanja česte IPTV tagove
      .replace(/[-_.:|]/g, ' ') // specijalni znakovi u razmak
      .replace(/\s+/g, ' ') // dupli razmaci u jedan
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
      const lines = fileContent.split('\n');
      let newLines = [];
      let matchCount = 0;
      let totalChannels = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXTINF:')) {
          totalChannels++;
          const commaIndex = line.lastIndexOf(',');
          if (commaIndex !== -1) {
            const rawName = line.substring(commaIndex + 1).trim();
            const searchJoined = rawName.toLowerCase().replace(/[-_.\s]/g, '');
            
            // Prvo probamo naći savršeno poklapanje (stari način za brzinu i točnost)
            let match = channelsData.find(ch => ch.name.toLowerCase().replace(/[-_.\s]/g, '') === searchJoined);
            
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
              const githubUrl = `https://abrnjic.github.io/logo-tv/logos/${match.id}.png`;
              
              // Replace or add tvg-logo
              let newLine = line;
              if (newLine.includes('tvg-logo="')) {
                newLine = newLine.replace(/tvg-logo="[^"]*"/, `tvg-logo="${githubUrl}"`);
              } else {
                // Insert tvg-logo after #EXTINF: or after the duration
                newLine = newLine.replace(/#EXTINF:([^,]+),/, `#EXTINF:$1 tvg-logo="${githubUrl}",`);
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
        content: newLines.join('\n'),
        matchCount,
        totalChannels
      });
      setIsProcessing(false);
    }, 100);
  };

  const downloadM3U = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixed_playlist.m3u';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="m3u-fixer-container">
      <div className="fixer-card">
        <h2>Automatski M3U Popravljač</h2>
        <p>Učitaj svoju <code>.m3u</code> listu, a naš algoritam će pronaći kanale i zamijeniti njihove logotipe s premium logotipima iz naše baze.</p>
        
        <div className="upload-zone">
          <input 
            type="file" 
            accept=".m3u,.m3u8,.txt" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
            Odaberi .m3u datoteku
          </button>
          <span style={{marginLeft: '1rem', color: 'var(--text-secondary)'}}>
            ili zalijepi tekst ispod
          </span>
        </div>

        <textarea 
          className="m3u-textarea" 
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id=...&#10;http://..."
        />

        <div className="fixer-actions">
          <button 
            className="btn-success" 
            onClick={processM3U} 
            disabled={!fileContent || isProcessing}
          >
            {isProcessing ? 'Obrađujem...' : 'Popravi logotipe'}
          </button>
        </div>

        {result && (
          <div className="result-card">
            <h3>Uspješno obrađeno! 🎉</h3>
            <p>Pronađeno i popravljeno <strong>{result.matchCount}</strong> od <strong>{result.totalChannels}</strong> kanala u tvojoj listi.</p>
            <button className="btn-download" onClick={downloadM3U}>
              Preuzmi popravljenu listu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
