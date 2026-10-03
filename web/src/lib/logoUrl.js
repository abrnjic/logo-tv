// Shared public URL for links pasted into panels and exported playlists.
// Keep the project path even when the app is previewed on localhost.
const LOGO_BASE_URL = 'https://abrnjic.github.io/logo-tv/';

export function getLogoUrl(image) {
  return new URL(image, LOGO_BASE_URL).href;
}
