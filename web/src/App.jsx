import { useState, useMemo, useEffect, useRef } from 'react';
import channelsData from './data/channels.json';
import { useFavorites } from './hooks/useFavorites';
import Favorites from './components/Favorites';
import M3UFixer from './components/M3UFixer';
import './App.css'; // if any

function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'favorites', 'fixer'
  const [theme, setTheme] = useState(() => window.localStorage.getItem('logo-tv-theme') || 'dark');
  const [gridSize, setGridSize] = useState(() => parseInt(window.localStorage.getItem('logo-tv-grid-size')) || 160);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  
  const [visibleCount, setVisibleCount] = useState(100);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  const loaderRef = useRef(null);

  // Apply theme and save grid size
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    window.localStorage.setItem('logo-tv-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('logo-tv-grid-size', gridSize.toString());
  }, [gridSize]);

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
  }, [searchTerm, selectedCountry, selectedCategory, activeTab]);

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

  // Infinite Scroll Observer
  useEffect(() => {
    if (activeTab !== 'search') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 100);
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [filteredChannels, activeTab]);

  // Handle URL copy
  const handleCopy = () => {
    if (!selectedLogo) return;
    const url = new URL(selectedLogo.image, window.location.origin).href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Handle Image copy
  const handleCopyImage = async () => {
    if (!selectedLogo) return;
    try {
      const response = await fetch(selectedLogo.image);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
    } catch (err) {
      console.error('Failed to copy image', err);
      alert('Nije moguće kopirati sliku. Pokušaj preuzeti umjesto toga.');
    }
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
          <div className="header-top">
            <h1 className="logo-title">Logo TV</h1>
            <div className="header-actions">
              <div className="zoom-control" title="Veličina logotipa">
                <span>🔍</span>
                <input 
                  type="range" 
                  min="100" 
                  max="250" 
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="zoom-slider"
                />
              </div>
              <button 
                className="theme-toggle" 
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Prebaci na svijetlu temu' : 'Prebaci na tamnu temu'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          <p className="logo-subtitle">Premium kolekcija visokokvalitetnih logotipa za IPTV aplikacije, uređaje i portale.</p>
          
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
              Tražilica
            </button>
            <button className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>
              Favoriti ({favorites.length})
            </button>
            <button className={`tab-btn ${activeTab === 'fixer' ? 'active' : ''}`} onClick={() => setActiveTab('fixer')}>
              M3U Fixer
            </button>
          </div>
        </header>

        {activeTab === 'search' && (
          <>
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
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                {searchTerm && (
                  <button className="clear-search-btn" onClick={() => setSearchTerm('')} title="Obriši pretragu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
                
                {/* Auto-suggest */}
                {isSearchFocused && searchTerm && filteredChannels.length > 0 && (
                  <div className="auto-suggest">
                    {filteredChannels.slice(0, 5).map(ch => (
                      <div key={ch.id} className="suggest-item" onClick={() => {
                        setSelectedLogo(ch);
                        setSearchTerm(ch.name);
                      }}>
                        <img src={ch.image} alt="" className="suggest-img" />
                        <span>{ch.name}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                
                {(selectedCountry !== 'All' || selectedCategory !== 'All') && (
                  <button 
                    className="reset-filters-btn" 
                    onClick={() => {
                      setSelectedCountry('All');
                      setSelectedCategory('All');
                    }}
                    title="Poništi filtere"
                  >
                    Poništi filtere
                  </button>
                )}
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📺</div>
                <h2>Nema rezultata</h2>
                <p>Pokušaj promijeniti pojam za pretragu ili filtere.</p>
                {searchTerm && (
                  <a 
                    href={`mailto:abrnjic@gmail.com?subject=Zahtjev za novi logo: ${searchTerm}`} 
                    className="btn-primary" 
                    style={{marginTop: '1.5rem', display: 'inline-block', textDecoration: 'none'}}
                  >
                    Nisi pronašao kanal? Zatraži ga ovdje!
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="logos-grid" style={{ '--card-size': `${gridSize}px` }}>
                  {filteredChannels.slice(0, visibleCount).map(channel => (
                    <div 
                      key={channel.id} 
                      className="logo-card"
                      onClick={() => setSelectedLogo(channel)}
                    >
                      <button 
                        className={`fav-btn ${isFavorite(channel.id) ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id); }}
                        title={isFavorite(channel.id) ? "Ukloni iz favorita" : "Dodaj u favorite"}
                      >
                        {isFavorite(channel.id) ? '❤️' : '🤍'}
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
                
                {visibleCount < filteredChannels.length && (
                  <div ref={loaderRef} className="scroll-loader">
                    <div className="spinner"></div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <Favorites 
            favorites={favorites} 
            channelsData={channelsData} 
            setSelectedLogo={setSelectedLogo}
            toggleFavorite={toggleFavorite}
          />
        )}

        {activeTab === 'fixer' && (
          <M3UFixer />
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
              <button 
                className={`modal-fav-btn ${isFavorite(selectedLogo.id) ? 'active' : ''}`}
                onClick={() => toggleFavorite(selectedLogo.id)}
              >
                {isFavorite(selectedLogo.id) ? '❤️ Ukloni iz favorita' : '🤍 Dodaj u favorite'}
              </button>
              
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
              
              <div className="modal-actions-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%' }}>
                <button 
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Link!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Kopiraj Link
                    </>
                  )}
                </button>

                <button 
                  className={`copy-btn ${copiedImg ? 'copied' : ''}`}
                  onClick={handleCopyImage}
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: copiedImg ? '#10b981' : 'var(--accent-color)', color: 'white', border: 'none' }}
                >
                  {copiedImg ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Slika!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      Kopiraj Sliku
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Floating Scroll Buttons */}
      <div className="floating-actions">
        <button className="scroll-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Idi na vrh">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button className="scroll-btn" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} title="Idi na dno">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </>
  );
}

export default App;
