/**
 * The two kinds of link a ceremony may carry for guests (PRD EVT-02,
 * LIVE-01, decision 0017): Google Maps directions and a YouTube livestream.
 * Both are checked against a short list of hosts, so the public site never
 * links or embeds anything else. Pure functions: no network.
 */

const MAX_URL_LENGTH = 2048;

function parse(input: string): URL | null {
  if (input.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(input.trim());
    // No credentials in a shared link, and only the web's own protocols.
    if (url.username || url.password) return null;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * A Google Maps link, as https, or null if it is not one. Accepts the
 * forms the Maps app shares: google.<country>/maps/…, maps.google.<country>,
 * maps.app.goo.gl/… and goo.gl/maps/….
 */
export function googleMapsUrl(input: string): string | null {
  const url = parse(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const isGoogle = /^(?:www\.)?google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host);
  const ok =
    (isGoogle && (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))) ||
    /^maps\.google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host) ||
    (host === 'maps.app.goo.gl' && url.pathname.length > 1) ||
    (host === 'goo.gl' && url.pathname.startsWith('/maps/'));
  if (!ok) return null;
  url.protocol = 'https:';
  url.hash = '';
  return url.toString();
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video ID of a YouTube link, or null. Accepts watch, live, embed and
 * shorts links and youtu.be short links; only the ID is kept, and the
 * public site builds its own embed and watch links from it.
 */
export function youtubeVideoId(input: string): string | null {
  const url = parse(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(?:www\.|m\.)/, '');
  let id: string | null | undefined;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, value] = url.pathname.split('/');
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (kind === 'live' || kind === 'embed' || kind === 'shorts') id = value;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** The page to watch a video on YouTube itself. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
