import { useState, useRef, useEffect } from "react";
import { createAdminSession, validatePng } from "../lib/adminApi";
import { prepareCatalogue } from "../lib/channelNames";
import { getLogoUrl } from "../lib/logoUrl";

export default function Admin({ rawChannels, channels }) {
  const session = useRef(null);
  const operation = useRef(false);
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [records, setRecords] = useState(channels);
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [fields, setFields] = useState({
    name: "",
    country: "Hrvatska",
    category: "General",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [hidden, setHidden] = useState(false);
  const [preferred, setPreferred] = useState(false);
  const fileInput = useRef(null);
  useEffect(() => () => session.current?.logout(), []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const select = (channel) => {
    setSelected(channel);
    setFields({
      name: channel?.name || "",
      country: channel?.country || "Hrvatska",
      category: channel?.category || "General",
    });
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setHidden(Boolean(channel?.hidden));
    setPreferred(Boolean(channel?.preferred));
    setError("");
    setNotice("");
  };
  const run = async (action) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const login = () =>
    run(async () => {
      const candidate = createAdminSession(token.trim());
      try {
        const data = await candidate.login();
        session.current = candidate;
        setRecords(
          prepareCatalogue(rawChannels, data, { includeHidden: true }),
        );
        setLoggedIn(true);
        setToken("");
      } catch (error) {
        candidate.logout();
        setToken("");
        throw error;
      }
    });
  const save = () =>
    run(async () => {
      if (!selected && !file)
        throw new Error("Za novi kanal odaberi PNG logotip.");
      let imageBytes;
      if (file) {
        imageBytes = new Uint8Array(await file.arrayBuffer());
        validatePng(imageBytes);
        const bitmap = await createImageBitmap(file);
        bitmap.close();
      }
      const slug = fields.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const countrySlug = fields.country
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const id = selected?.id || `${slug}-${countrySlug}`;
      if (!selected && rawChannels.some((channel) => channel.id === id))
        throw new Error(
          "Ta oznaka kanala već postoji. Odaberi postojeći kanal za uređivanje.",
        );
      if (
        !selected &&
        records.some(
          (channel) =>
            channel.name.toLowerCase() === fields.name.trim().toLowerCase() &&
            channel.country.toLowerCase() ===
              fields.country.trim().toLowerCase(),
        )
      )
        throw new Error(
          "Isti kanal u toj državi već postoji. Uredi postojeći zapis.",
        );
      const sourcePath =
        selected?.sourcePath || (!selected ? `logos/custom/${id}.png` : null);
      if (imageBytes && !sourcePath)
        throw new Error(
          "Putanja izvornog logotipa nije učitana. Osvježi aplikaciju prije zamjene slike.",
        );
      const result = await session.current.save({
        id,
        fields,
        imageBytes,
        sourcePath,
        hidden,
        preferred,
        ids: selected?.aliases || [id],
        isNew: !selected,
      });
      const updatedRaw = selected
        ? rawChannels
        : [
            ...rawChannels,
            { id, ...fields, image: `logos/${id}.png`, sourcePath },
          ];
      setRecords(
        prepareCatalogue(updatedRaw, result.metadata, { includeHidden: true }),
      );
      setNotice(
        "Spremljeno na GitHub. Automatska objava je pokrenuta; promjena će biti javna nakon završetka objave.",
      );
    });
  const logout = () => {
    session.current?.logout();
    session.current = null;
    setLoggedIn(false);
    setToken("");
    select(null);
  };
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">VLASNIČKI PRISTUP</span>
          <h2>Upravljanje logotipima</h2>
          <p>Dodavanje i uređivanje dopušteno je samo GitHub računu abrnjic.</p>
        </div>
        {loggedIn && (
          <button className="button secondary" onClick={logout} disabled={busy}>
            Odjava
          </button>
        )}
      </div>
      {!loggedIn ? (
        <form
          className="admin-login"
          onSubmit={(event) => {
            event.preventDefault();
            login();
          }}
        >
          <label className="field-label" htmlFor="admin-token">
            GitHub fine-grained token
          </label>
          <input
            className="url-input"
            id="admin-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            spellCheck={false}
          />
          <p className="field-hint">
            Token ostaje samo u memoriji ove kartice. Odjava ili zatvaranje
            kartice prekida pristup.
          </p>
          <button className="button primary" disabled={busy}>
            {busy ? "Provjeravam…" : "Prijavi se kao vlasnik"}
          </button>
          <details className="admin-help">
            <summary>Kako omogućiti vlastiti pristup?</summary>
            <ol>
              <li>
                Na svojem GitHub računu abrnjic izradi fine-grained token.
              </li>
              <li>
                Odaberi samo repozitorij <strong>logo-tv</strong> i ovlast{" "}
                <strong>Contents: Read and write</strong>.
              </li>
              <li>
                Odaberi rok trajanja, kopiraj token i unesi ga u ovo polje.
              </li>
            </ol>
            <a
              className="text-button"
              href="https://github.com/settings/personal-access-tokens/new?name=Logo%20TV%20upravljanje&contents=write"
              target="_blank"
              rel="noreferrer"
            >
              Otvori GitHub postavke tokena ↗
            </a>
            <p>
              Token unosiš samo ovdje; nemoj ga slati u razgovor ili spremati u
              izvorni kod.
            </p>
          </details>
        </form>
      ) : (
        <div className="admin-workspace">
          <aside>
            <div className="admin-toolbar">
              <button
                className="button primary"
                onClick={() => select(null)}
                disabled={busy}
              >
                Dodaj logotip
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const data = await session.current.refresh();
                    setRecords(
                      prepareCatalogue(rawChannels, data, {
                        includeHidden: true,
                      }),
                    );
                    select(null);
                  })
                }
              >
                Ponovno učitaj podatke
              </button>
            </div>
            <input
              className="url-input"
              aria-label="Pronađi kanal za uređivanje"
              placeholder="Naziv ili država…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="admin-check">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(event) => setShowHidden(event.target.checked)}
              />
              Prikaži skrivene kanale
            </label>
            <div className="admin-list">
              {records
                .filter(
                  (channel) =>
                    (showHidden || !channel.hidden) &&
                    `${channel.name} ${channel.country}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .slice(0, 100)
                .map((channel) => (
                  <button
                    key={channel.id}
                    className={`admin-channel ${selected?.id === channel.id ? "active" : ""}`}
                    disabled={busy}
                    onClick={() => select(channel)}
                  >
                    <strong>{channel.name}</strong>
                    <span>
                      {channel.country}
                      {channel.hidden ? " · Skriven" : ""}
                      {channel.aliases?.length > 1
                        ? ` · ${channel.aliases.length} varijante`
                        : ""}
                    </span>
                  </button>
                ))}
            </div>
            <p className="field-hint">
              Prikazano najviše 100 zapisa. Suzi pretragu za ostale kanale.
            </p>
          </aside>
          <form
            className="admin-editor"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <h3>{selected ? "Uredi kanal" : "Novi kanal"}</h3>
            {["name", "country", "category"].map((key, index) => (
              <label className="admin-field" key={key}>
                {["Naziv kanala", "Država", "Kategorija"][index]}
                <input
                  className="url-input"
                  value={fields[key]}
                  required
                  maxLength={120}
                  onChange={(event) =>
                    setFields({ ...fields, [key]: event.target.value })
                  }
                  list={
                    key === "country"
                      ? "admin-countries"
                      : key === "category"
                        ? "admin-categories"
                        : undefined
                  }
                />
              </label>
            ))}
            <datalist id="admin-countries">
              {[...new Set(channels.map((channel) => channel.country))]
                .sort()
                .map((country) => (
                  <option key={country} value={country} />
                ))}
            </datalist>
            <datalist id="admin-categories">
              {[
                "General",
                "Sport",
                "Dječji",
                "Filmski",
                "Dokumentarni",
                "Glazbeni",
                "Radio",
                "Informativni",
                "Lokalni",
              ].map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <label className="admin-field">
              {selected ? "Zamijeni logotip (neobavezno)" : "PNG logotip"}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,.png"
                required={!selected}
                onChange={(event) => setFile(event.target.files[0] || null)}
              />
            </label>
            {selected?.variants?.length > 1 && (
              <label className="admin-field">
                Varijanta logotipa
                <select
                  className="url-input"
                  value={selected.id}
                  onChange={(event) => {
                    const variant = selected.variants.find(
                      (variant) => variant.id === event.target.value,
                    );
                    setSelected({
                      ...variant,
                      aliases: selected.aliases,
                      variants: selected.variants,
                    });
                    setPreferred(Boolean(variant.preferred));
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  {selected.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.id}.png
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(preview || selected) && (
              <img
                className="admin-preview"
                src={preview || getLogoUrl(selected.image)}
                alt="Pregled logotipa"
              />
            )}
            <p className="field-hint">
              PNG do 5 MB i 4096 × 4096 px. Isti naziv u drugoj državi može
              ostati zaseban kanal.
            </p>
            {selected && (
              <>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={preferred}
                    onChange={(event) => setPreferred(event.target.checked)}
                  />
                  Koristi ovu varijantu kao glavni logotip
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(event) => setHidden(event.target.checked)}
                  />
                  Sakrij ovaj kanal i njegove varijante iz kataloga
                </label>
              </>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Spremam…" : "Spremi i objavi"}
            </button>
          </form>
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="dialog-feedback success" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
