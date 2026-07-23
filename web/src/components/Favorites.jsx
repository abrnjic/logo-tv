import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Favorites({ favorites, channelsData, setSelectedLogo, toggleFavorite }) {
  const [isZipping, setIsZipping] = useState(false);
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

  const downloadZIP = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      const fetchPromises = favoriteChannels.map(async (ch) => {
        try {
          const response = await fetch(ch.image);
          if (!response.ok) throw new Error(`Network response was not ok for ${ch.name}`);
          const blob = await response.blob();
          
          const safeName = ch.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const ext = ch.image.split('.').pop() || 'png';
          zip.file(`${safeName}.${ext}`, blob);
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
      <div className="empty-state">
        <div className="empty-icon">🤍</div>
        <h2>Nema favorita</h2>
        <p>Klikni na ikonu srca na bilo kojem kanalu kako bi ga dodao u svoju kolekciju.</p>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h2>Moji Favoriti ({favoriteChannels.length})</h2>
        <div className="favorites-actions">
          <button className="btn-secondary" onClick={downloadZIP} disabled={isZipping}>
            {isZipping ? 'Pripremam ZIP...' : 'Preuzmi ZIP'}
          </button>
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
