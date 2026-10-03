export default function PreviewControls({ value, onChange }) {
  return (
    <div
      className="preview-controls"
      role="group"
      aria-label="Pozadina pregleda"
    >
      <span className="control-caption">Pozadina</span>
      {[
        ["checker", "Šahovska"],
        ["white", "Bijela"],
        ["dark", "Tamna"],
      ].map(([key, label]) => (
        <button
          key={key}
          className={`preview-swatch preview-${key} ${value === key ? "selected" : ""}`}
          onClick={() => onChange(key)}
          aria-label={`${label} pozadina`}
          aria-pressed={value === key}
          title={`${label} pozadina`}
        />
      ))}
    </div>
  );
}
