import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Favorites({ favorites, channelsData, setSelectedLogo, toggleFavorite, setFavorites }) {
  const [isZipping, setIsZipping] = useState(false);
  
  // Studio State
  const [bgColor, setBgColor] = useState('transparent');
  const [addShadow, setAddShadow] = useState(false);

  const favoriteChannels = channelsData.filter(ch => favorites.includes(ch.id));

  const copyM3U = () => {
    let m3u = "#EXTM3U\n";
    favoriteChannels.forEach(ch => {
      const url = new URL(`/logo-tv/logos/${ch.image}`, 'https://abrnjic.github.io').href;
      m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${url}" group-title="${ch.category}", ${ch.name}\n`;
      m3u += `http://stream.url\n`;
    });
    navigator.clipboard.writeText(m3u).then(() => alert('M3U lista kopirana u međuspremnik!'));
  };

  const copyJSON = () => {
    const json = JSON.stringify(favoriteChannels.map(ch => ({
      name: ch.name,
      logo: new URL(`/logo-tv/logos/${ch.image}`, 'https://abrnjic.github.io').href
    })), null, 2);
    navigator.clipboard.writeText(json).then(() => alert('JSON lista kopirana!'));
  };

  // Smart Collections
  const addCollection = (category) => {
    const collectionIds = channelsData.filter(ch => ch.category === category).map(ch => ch.id);
    setFavorites(prev => {
      const newFavs = new Set([...prev, ...collectionIds]);
      return Array.from(newFavs);
    });
  };

  const addExYu = () => {
    const exyu = ['Croatia', 'Serbia', 'Bosnia and Herzegovina', 'Slovenia', 'Montenegro', 'Macedonia'];
    const collectionIds = channelsData.filter(ch => exyu.includes(ch.country)).map(ch => ch.id);
    setFavorites(prev => {
      const newFavs = new Set([...prev, ...collectionIds]);
      return Array.from(newFavs);
    });
  };

  const processImageWithCanvas = async (blob, chName) => {
    if (bgColor === 'transparent' && !addShadow) return blob;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Add padding if shadow is enabled so it doesn't get cut off
        const padding = addShadow ? 20 : 0;
        canvas.width = img.width + (padding * 2);
        canvas.height = img.height + (padding * 2);
        const ctx = canvas.getContext('2d');
        
        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        if (addShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 5;
          ctx.shadowOffsetY = 5;
        }
        
        ctx.drawImage(img, padding, padding, img.width, img.height);
        canvas.toBlob((newBlob) => resolve(newBlob), 'image/png');
      };
      img.onerror = () => reject(new Error('Canvas error on ' + chName));
      img.src = URL.createObjectURL(blob);
    });
  };

  const downloadZIP = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      const fetchPromises = favoriteChannels.map(async (ch) => {
        try {
          const response = await fetch(ch.image);
          if (!response.ok) throw new Error(`Network response was not ok for ${ch.name}`);
          const originalBlob = await response.blob();
          
          const finalBlob = await processImageWithCanvas(originalBlob, ch.name);

          const safeName = ch.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const ext = 'png'; // Always output PNG to preserve canvas manipulation
          zip.file(`${safeName}.${ext}`, finalBlob);
        } catch (err) {
          console.error('Failed to fetch image for ZIP:', ch.name, err);
        }
      });
      
      await Promise.all(fetchPromises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'logo-tv-favorites.zip');
    } catch (err) {
      console.error('Error creating ZIP:', err);
      alert('Dogodila se greška prilikom izrade ZIP arhive.');
    } finally {
      setIsZipping(false);
    }
  };

  if (favoriteChannels.length === 0) {
    return (
      <div className="favorites-container">
        <div className="smart-collections" style={{marginBottom: '2rem'}}>
          <h3>Pametne Kolekcije</h3>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>Dodaj popularne pakete jednim klikom:</p>
          <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
            <button className="btn-secondary" onClick={() => addCollection('Sports')}>⚽ Svi Sportski Kanali</button>
            <button className="btn-secondary" onClick={() => addCollection('Movies')}>🎬 Svi Filmski Kanali</button>
            <button className="btn-secondary" onClick={() => addCollection('Documentary')}>🌍 Svi Dokumentarni Kanali</button>
            <button className="btn-secondary" onClick={addExYu}>🔥 Svi EX-YU Kanali</button>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🤍</div>
          <h2>Nema favorita</h2>
          <p>Klikni na ikonu srca na bilo kojem kanalu kako bi ga dodao u svoju kolekciju.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="favorites-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
          <h2>Moji Favoriti ({favoriteChannels.length})</h2>
          <button className="btn-secondary" onClick={() => setFavorites([])}>Isprazni sve</button>
        </div>
        
        <div className="studio-panel" style={{background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', width: '100%'}}>
          <h3 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>🎨 Mini Studio za Preuzimanje</h3>
          <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center'}}>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <label>Boja Pozadine:</label>
              <select className="select-input" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{padding: '0.5rem'}}>
                <option value="transparent">Bez (Transparentno)</option>
                <option value="#ffffff">Bijela</option>
                <option value="#000000">Crna</option>
                <option value="#222222">Siva (Dark)</option>
              </select>
            </div>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                <input type="checkbox" checked={addShadow} onChange={(e) => setAddShadow(e.target.checked)} />
                Dodaj Sjenu (Drop-shadow)
              </label>
            </div>
            <button className="btn-primary" onClick={downloadZIP} disabled={isZipping} style={{marginLeft: 'auto'}}>
              {isZipping ? 'Pripremam ZIP...' : 'Preuzmi ZIP'}
            </button>
          </div>
        </div>

        <div className="favorites-actions" style={{width: '100%', justifyContent: 'flex-start'}}>
          <button className="btn-secondary" onClick={copyM3U}>Kopiraj kao M3U</button>
          <button className="btn-secondary" onClick={copyJSON}>Kopiraj kao JSON</button>
        </div>
      </div>

      <div className="logos-grid">
        {favoriteChannels.map(channel => (
          <div 
            key={channel.id} 
            className="logo-card"
            onClick={() => setSelectedLogo(channel)}
          >
            <button 
              className="fav-btn active"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id); }}
              title="Ukloni iz favorita"
            >
              ❤️
            </button>
            <div className="image-container">
              <img src={channel.image} alt={channel.name} className="logo-img" loading="lazy" />
            </div>
            <div className="logo-info">
              <h3 className="logo-name">{channel.name}</h3>
              <div className="tags">
                <span className="tag">{channel.country}</span>
                <span className="tag">{channel.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
