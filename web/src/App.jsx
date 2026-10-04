import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import rawChannels from "./data/channels.json";
import metadata from "../catalogue-overrides.json";
import { useLiveCatalogue } from "./hooks/useLiveCatalogue";
import Admin from "./components/Admin";
import LogoAvailability from "./components/LogoAvailability";
import { loadCommits, recentChannels } from "./lib/logoHistory";

import { useFavorites } from "./hooks/useFavorites";
import Favorites from "./components/Favorites";
import M3UFixer from "./components/M3UFixer";
import Icon from "./components/Icon";
import LogoCard from "./components/LogoCard";
import LogoDialog from "./components/LogoDialog";
import PreviewControls from "./components/PreviewControls";
import { getLogoUrl } from "./lib/logoUrl";
import { countryLabel, categoryLabel, filterChannels } from "./lib/catalog";

const formatCount = (value) => value.toLocaleString("hr");
const quickFilters = [
  ["all", "Svi kanali"],
  ["hr", "Hrvatska"],
  ["exyu", "EX-YU"],
  ["sport", "Sport"],
  ["radio", "Radio"],
];

export default function App() {
  const { channels: channelsData, updateCatalogue, revision } = useLiveCatalogue(rawChannels, metadata);
  const adminRef = useRef(null);
  const [ownerAccess, setOwnerAccess] = useState(false);
  const [recentEdits, setRecentEdits] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("logo-tv-recent-edits-v1") || "[]");
      return Array.isArray(saved) ? saved.filter(x => typeof x.id === "string" && Number.isFinite(x.at)).slice(0, 50) : [];
    } catch { return []; }
  });
  const editLogo = channel => { setSelectedLogo(null); adminRef.current?.edit(channel); };
  const [activeTab, setActiveTab] = useState("search");
  const [sharedCommits, setSharedCommits] = useState([]);
  const [recentStatus, setRecentStatus] = useState({ busy: false, error: '', hasMore: false });
  const [recentRefresh, setRecentRefresh] = useState(0);
  useEffect(() => {
    if (activeTab !== 'recent') return;
    const abort = new AbortController();
    setRecentStatus(old => ({ ...old, busy: true, error: '' }));
    loadCommits('web/catalogue-overrides.json', revision?.sha, 1, abort.signal, fetch, 100).then(result => {
      if (!abort.signal.aborted) { setSharedCommits(result.items); setRecentStatus({ busy: false, error: '', hasMore: result.hasMore }); }
    }).catch(err => { if (!abort.signal.aborted) setRecentStatus(old => ({ ...old, busy: false, error: err.message })); });
    return () => abort.abort();
  }, [activeTab, revision?.sha, recentRefresh]);
  const recentList = useMemo(() => recentChannels(channelsData, sharedCommits, recentEdits), [channelsData, sharedCommits, recentEdits]);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("logo-tv-theme") || "dark",
  );
  const [gridSize, setGridSize] = useState(() =>
    Math.min(
      250,
      Math.max(140, Number(localStorage.getItem("logo-tv-grid-size")) || 180),
    ),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("All");
  const [category, setCategory] = useState("All");
  const [quick, setQuick] = useState("all");
  const [background, setBackground] = useState("checker");
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [visibleCount, setVisibleCount] = useState(80);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const loaderRef = useRef(null);
  const {
    favorites,
    toggleFavorite: toggleStoredFavorite,
    setFavorites,
  } = useFavorites();

  const isFavorite = (id) => {
    const channel = channelsData.find((channel) => (channel.aliases || [channel.id]).includes(id));
    return (channel?.aliases || [id]).some((alias) =>
      favorites.includes(alias),
    );
  };
  const toggleFavorite = (id) => {
    const channel = channelsData.find((channel) => (channel.aliases || [channel.id]).includes(id));
    if (isFavorite(id))
      setFavorites((previous) =>
        previous.filter((alias) => !(channel?.aliases || [id]).includes(alias)),
      );
    else toggleStoredFavorite(id);
  };

  const notify = useCallback((message, tone = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("logo-tv-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("logo-tv-grid-size", String(gridSize));
  }, [gridSize]);
  useEffect(() => {
    setVisibleCount(80);
  }, [searchTerm, country, category, quick]);

  const countries = useMemo(
    () =>
      [...new Set(channelsData.map((ch) => countryLabel(ch.country)))].sort(
        (a, b) => a.localeCompare(b, "hr"),
      ),
    [channelsData],
  );
  const categories = useMemo(
    () =>
      [...new Set(channelsData.map((ch) => ch.category))].sort((a, b) =>
        categoryLabel(a).localeCompare(categoryLabel(b), "hr"),
      ),
    [channelsData],
  );
  const filtered = useMemo(
    () =>
      filterChannels(activeTab === "recent" ? recentList : channelsData, {
        search: searchTerm,
        country,
        category,
        quick,
      }),
    [channelsData, searchTerm, country, category, quick, activeTab, recentList],
  );
  const hasFilters =
    searchTerm || country !== "All" || category !== "All" || quick !== "all";
  const resetFilters = () => {
    setSearchTerm("");
    setCountry("All");
    setCategory("All");
    setQuick("all");
  };

  useEffect(() => {
    if (!["search", "recent"].includes(activeTab) || !loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((count) => count + 80);
      },
      { rootMargin: "160px" },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [activeTab, filtered, visibleCount]);

  const copyLink = async (channel) => {
    if (channel.pendingPublication) {
      notify("Logotip je vidljiv. Javni PNG link se još objavljuje.");
      return;
    }
    try {
      await navigator.clipboard.writeText(getLogoUrl(channel));
      notify(`PNG link kopiran: ${channel.name}`);
    } catch {
      notify(
        "Kopiranje nije dostupno. Otvori pregled i kopiraj adresu iz polja.",
        "error",
      );
    }
  };

  const openLogo = (channel) => {
    setToast(null);
    setSelectedLogo(channel);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Logo TV početna"
        >
          <span className="brand-symbol">
            <Icon name="tv" size={22} />
          </span>
          <span>
            Logo <strong>TV</strong>
          </span>
          <span className="brand-label">RADNI PROSTOR</span>
        </a>
        <div className="header-right">
          <button className="button secondary owner-entry" onClick={() => setActiveTab("admin")}>{ownerAccess ? "Upravljanje" : "Prijava vlasnika"}</button>
          <span className="catalogue-count">
            {formatCount(channelsData.length)} logotipa
          </span>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark" ? "Uključi svijetlu temu" : "Uključi tamnu temu"
            }
            title={theme === "dark" ? "Svijetla tema" : "Tamna tema"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </div>
      </header>
      <main>
        <div className="page-intro workspace-intro">
          <div><span className="eyebrow">LOGO TV / KATALOG</span><h1>Katalog logotipa</h1><p>Pronađi kanal. Uredi sliku. Kopiraj link za panel.</p></div>
          {ownerAccess ? <button className="button primary" onClick={() => adminRef.current?.add()}>+ Dodaj kanal</button> : <span className="workspace-status"><span className="availability-dot" />{formatCount(channelsData.length)} dostupnih logotipa</span>}
        </div>
        <nav className="tabs" aria-label="Glavna navigacija">
          <button
            className={activeTab === "search" ? "active" : ""}
            onClick={() => setActiveTab("search")}
            aria-current={activeTab === "search" ? "page" : undefined}
          >
            <Icon name="search" />
            Katalog
          </button>
          <button
            className={activeTab === "favorites" ? "active" : ""}
            onClick={() => setActiveTab("favorites")}
            aria-current={activeTab === "favorites" ? "page" : undefined}
          >
            <Icon name="heart" />
            Favoriti<span className="count-badge">{favorites.length}</span>
          </button>
          <button
            className={activeTab === "fixer" ? "active" : ""}
            onClick={() => setActiveTab("fixer")}
            aria-current={activeTab === "fixer" ? "page" : undefined}
          >
            <Icon name="file" />
            M3U alati
          </button>
          <button className={activeTab === "recent" ? "active" : ""} onClick={() => { resetFilters(); setActiveTab("recent"); }} aria-current={activeTab === "recent" ? "page" : undefined}><Icon name="clock" />Nedavno uređeno<span className="count-badge">{recentList.length}</span></button>
          <button className={activeTab === "availability" ? "active" : ""} onClick={() => setActiveTab("availability")} aria-current={activeTab === "availability" ? "page" : undefined}><Icon name="check" />Provjera slika</button>
        </nav>
        <div>
          <Admin ref={adminRef} visible={activeTab === "admin"} onAuthChange={setOwnerAccess} rawChannels={rawChannels} channels={channelsData}
            onCatalogueChange={updateCatalogue}
            onSaved={(data, upload) => {
              updateCatalogue(data, upload);
              setRecentEdits(previous => {
                const next = [{id: upload.id, at: Date.now()}, ...previous.filter(x => x.id !== upload.id)].slice(0, 50);
                try { localStorage.setItem("logo-tv-recent-edits-v1", JSON.stringify(next)); } catch { /* Local history is optional. */ }
                return next;
              });
              setCountry("All"); setCategory("All"); setQuick("all");
              setSearchTerm(data.channels[upload.id].name);
              setVisibleCount(80); setActiveTab("search");
              notify("Logotip je spremljen i odmah prikazan u katalogu.");
            }} />
        </div>
        {["search", "recent"].includes(activeTab) && (
          <>
            {activeTab === "recent" && <div className="recent-note"><p>Promjene iz zajedničkog kataloga, dostupne na svim uređajima. {recentStatus.hasMore ? 'Pregled obuhvaća posljednjih 100 spremanja i datume novijih izmjena.' : 'Spremljene izmjene poredane su po datumu.'}</p><button className="button secondary" disabled={recentStatus.busy} onClick={() => setRecentRefresh(x => x + 1)}>{recentStatus.busy ? 'Učitavam…' : 'Osvježi promjene'}</button>{recentStatus.error && <p className="inline-error" role="alert">{recentStatus.error} Prikazane su dostupne spremljene promjene.</p>}</div>}
            <section className="search-panel" aria-label="Pretraga i filtri">
              <div className="search-row">
                <div className="search-field">
                  <Icon name="search" size={21} />
                  <input
                    type="search"
                    aria-label="Pretraži kanale"
                    placeholder="Pretraži kanale..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="icon-button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Obriši pretragu"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                </div>
                <label className="filter-field">
                  <span>Država</span>
                  <select
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setQuick("all");
                    }}
                  >
                    <option value="All">Sve države</option>
                    {countries.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="filter-field">
                  <span>Kategorija</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="All">Sve kategorije</option>
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {categoryLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="quick-filter-row">
                <div className="quick-filters" aria-label="Brzi filtri">
                  {quickFilters.map(([key, label]) => (
                    <button
                      key={key}
                      className={quick === key ? "active" : ""}
                      aria-pressed={quick === key}
                      onClick={() => {
                        setQuick(key);
                        setCountry("All");
                        setCategory("All");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {hasFilters && (
                  <button
                    className="text-button reset-filters"
                    onClick={resetFilters}
                  >
                    Poništi filtre
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </section>
            <div className="results-toolbar">
              <p>
                <strong>{formatCount(filtered.length)}</strong>{" "}
                {hasFilters ? "rezultata" : "logotipa u biblioteci"}
                <span className="toolbar-hint">Klikni na logo za detalje</span>
              </p>
              <div className="view-options">
                <PreviewControls value={background} onChange={setBackground} />
                <label className="density-control">
                  <span>Veličina</span>
                  <input
                    aria-label="Veličina kartica"
                    type="range"
                    min="140"
                    max="250"
                    step="10"
                    value={gridSize}
                    onChange={(event) =>
                      setGridSize(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>
            {filtered.length ? (
              <>
                <div
                  className="logos-grid"
                  style={{ "--card-size": `${gridSize}px` }}
                >
                  {filtered.slice(0, visibleCount).map((channel) => (
                    <LogoCard
                      key={channel.id}
                      channel={channel}
                      favorite={isFavorite(channel.id)}
                      onFavorite={toggleFavorite}
                      onOpen={openLogo}
                      onCopy={copyLink}
                      onEdit={ownerAccess ? editLogo : undefined}
                      background={background}
                    />
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <div className="load-more" ref={loaderRef}>
                    <button
                      className="button secondary"
                      onClick={() => setVisibleCount((count) => count + 80)}
                    >
                      Prikaži još logotipa
                      <Icon name="arrow" />
                    </button>
                    <span>
                      Prikazano{" "}
                      {formatCount(Math.min(visibleCount, filtered.length))} od{" "}
                      {formatCount(filtered.length)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Icon name="search" size={32} />
                <h2>{activeTab === "recent" && !recentList.length ? "Tvoje sljedeće izmjene bit će ovdje" : "Nismo pronašli taj kanal"}</h2>
                <p>{activeTab === "recent" && !recentList.length ? "Nakon spremanja kanal će se pojaviti u ovom pregledu." : "Pokušaj kraći naziv ili promijeni odabrane filtre."}</p>
                <button className="button secondary" onClick={resetFilters}>
                  Poništi pretragu i filtre
                </button>
                <a
                  className="text-button"
                  href={`mailto:abrnjic@gmail.com?subject=${encodeURIComponent(`Zahtjev za novi logo: ${searchTerm}`)}`}
                >
                  Zatraži novi logotip
                  <Icon name="external" size={15} />
                </a>
              </div>
            )}
          </>
        )}
        {activeTab === "favorites" && (
          <Favorites
            favorites={favorites}
            channelsData={channelsData}
            setSelectedLogo={openLogo}
            toggleFavorite={toggleFavorite}
            setFavorites={setFavorites}
            notify={notify}
            onCopy={copyLink}
            background={background}
            setBackground={setBackground}
            gridSize={gridSize}
          />
        )}
        {activeTab === "availability" && <LogoAvailability channels={channelsData} onEdit={editLogo} />}
        {activeTab === "fixer" && <M3UFixer channelsData={channelsData} />}
      </main>
      <footer className="site-footer">
        <span>
          Logo TV<span className="footer-dot">·</span>
          {formatCount(channelsData.length)} logotipa na jednom mjestu
        </span>
        <a
          href="https://github.com/abrnjic/logo-tv"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <Icon name="external" size={14} />
        </a>
      </footer>
      {selectedLogo && (
        <LogoDialog
          key={selectedLogo.id}
          channel={channelsData.find(channel => channel.id === selectedLogo.id) || selectedLogo}
          favorite={isFavorite(selectedLogo.id)}
          onFavorite={toggleFavorite}
          onCopy={copyLink}
          onEdit={editLogo}
          onRestore={(channel, version) => { setSelectedLogo(null); adminRef.current?.restore(channel, version); }}
          onVariant={openLogo}
          onClose={() => setSelectedLogo(null)}
          notify={notify}
          message={toast}
        />
      )}
      {toast && !selectedLogo && (
        <div
          className={`toast ${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <span className="toast-icon">
            <Icon name={toast.tone === "error" ? "close" : "check"} size={17} />
          </span>
          <span>{toast.message}</span>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Zatvori obavijest"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
