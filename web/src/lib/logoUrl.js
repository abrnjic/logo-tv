// Use one public address for previews, panel links, downloads and exports.
const LOGO_BASE_URL = 'https://abrnjic.github.io/logo-tv/';
const LOGO_HOST = 'abrnjic.github.io';

export function getLogoUrl(image) {
  // A confirmed source URL changes after a save, so panels fetch the new PNG.
  if (image && typeof image === 'object') return getLogoUrl(image.publicUrl || image.image);
  const url = new URL(image, LOGO_BASE_URL);
  // Older app versions and root-relative paths omitted the repository name.
  if (url.hostname === LOGO_HOST && /^\/(?:logo-tv\/)?logos\//.test(url.pathname)) {
    url.protocol = 'https:';
    url.pathname = url.pathname.replace(/^\/(?:logo-tv\/)?logos\//, '/logo-tv/logos/');
  }
  return url.href;
}

// Only repair our own old links, and only when the file exists in the catalogue.
export function repairLegacyLogoLinks(text, validUrls) {
  return text.replace(/https?:\/\/abrnjic\.github\.io\/logos\/[^\s"'<>]+/gi, (oldUrl) => {
    const corrected = getLogoUrl(oldUrl);
    return validUrls.has(corrected) ? corrected : oldUrl;
  });
}
