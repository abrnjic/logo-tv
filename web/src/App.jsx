import { useState, useMemo, useEffect } from 'react';
import channelsData from './data/channels.json';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [visibleCount, setVisibleCount] = useState(100);

  // Extract unique countries and categories
  const countries = useMemo(() => {
    const c = new Set(channelsData.map(ch => ch.country));
    return ['All', ...Array.from(c)].sort();
  }, []);

  const categories = useMemo(() => {
    const c = new Set(channelsData.map(ch => ch.category));
    return ['All', ...Array.from(c)].sort();
  }, []);

  // Reset visible count when search or filters change
  useEffect(() => {
    setVisibleCount(100);
  }, [searchTerm, selectedCountry, selectedCategory]);

  // Filter and Sort channels
  const filteredChannels = useMemo(() => {
    const isGlobalSearch = searchTerm.trim().length > 0;
    const searchString = searchTerm.toLowerCase();
    const searchJoined = searchString.replace(/[-_.\s]/g, '');
    const searchWords = searchString.replace(/[-_.]/g, ' ').split(/\s+/).filter(w => w.length > 0);

    let results = channelsData.filter(ch => {
      const matchesCountry = isGlobalSearch || selectedCountry === 'All' || ch.country === selectedCountry;
      const matchesCategory = isGlobalSearch || selectedCategory === 'All' || ch.category === selectedCategory;
      if (!matchesCountry || !matchesCategory) return false;

      if (!isGlobalSearch) return true;

      // Smart Matching
      const cleanName = ch.name.toLowerCase().replace(/[-_.]/g, ' ');
      const joinedName = ch.name.toLowerCase().replace(/[-_.\s]/g, '');

      const matchesJoined = joinedName.includes(searchJoined);
      const matchesWords = searchWords.every(word => cleanName.includes(word));

      return matchesJoined || matchesWords;
    });

    // Relevance Sorting
    if (isGlobalSearch) {
      results.sort((a, b) => {
        const nameA = a.name.toLowerCase().replace(/[-_.\s]/g, '');
        const nameB = b.name.toLowerCase().replace(/[-_.\s]/g, '');
        
        const exactA = nameA === searchJoined ? 1 : 0;
        const exactB = nameB === searchJoined ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;
        
        const startsA = nameA.startsWith(searchJoined) ? 1 : 0;
        const startsB = nameB.startsWith(searchJoined) ? 1 : 0;
        if (startsA !== startsB) return startsB - startsA;

        return 0; 
      });
    }

    return results;
  }, [searchTerm, selectedCountry, selectedCategory]);

  // Handle URL copy
  const handleCopy = () => {
    if (!selectedLogo) return;
    const url = new URL(selectedLogo.image, window.location.origin).href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Close modal on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedLogo(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      <div className="app-container">
        <header className="header">
          <h1 className="logo-title">Logo TV</h1>
          <p className="logo-subtitle">Premium kolekcija visokokvalitetnih logotipa za IPTV aplikacije, uređaje i portale.</p>
        </header>

        <div className="controls-container">
          <div className="search-box">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Pretraži kanale..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters">
            <select 
              className="filter-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'Sve države' : c}</option>
              ))}
            </select>

            <select 
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'Sve kategorije' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <h2>Nema rezultata</h2>
            <p>Pokušaj promijeniti pojam za pretragu ili filtere.</p>
          </div>
        ) : (
          <>
            <div className="logos-grid">
              {filteredChannels.slice(0, visibleCount).map(channel => (
                <div 
                  key={channel.id} 
                  className="logo-card"
                  onClick={() => setSelectedLogo(channel)}
                >
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
            
            {visibleCount < filteredChannels.length && (
              <div className="load-more-container" style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '3rem' }}>
                <button 
                  onClick={() => setVisibleCount(prev => prev + 100)}
                  style={{
                    padding: '14px 28px',
                    backgroundColor: '#1E1E1E',
                    color: 'white',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseOver={e => {
                    e.target.style.backgroundColor = '#2D2D2D';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    e.target.style.backgroundColor = '#1E1E1E';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Prikaži više ({filteredChannels.length - visibleCount} preostalo)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <div 
        className={`modal-overlay ${selectedLogo ? 'open' : ''}`}
        onClick={() => setSelectedLogo(null)}
      >
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setSelectedLogo(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          {selectedLogo && (
            <>
              <h2 className="modal-title">{selectedLogo.name}</h2>
              <div className="modal-img-container">
                <img src={selectedLogo.image} alt={selectedLogo.name} className="modal-img" />
              </div>
              
              <div className="url-box">
                <input 
                  type="text" 
                  className="url-input" 
                  readOnly 
                  value={new URL(selectedLogo.image, window.location.origin).href} 
                />
              </div>
              
              <button 
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Kopirano!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Kopiraj Javni Link
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
