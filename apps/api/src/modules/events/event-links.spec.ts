import { describe, expect, it } from 'vitest';
import { googleMapsUrl, youtubeVideoId, youtubeWatchUrl } from './event-links.js';

describe('event links', () => {
  it('accepts the Google Maps links people share, as https', () => {
    expect(googleMapsUrl('https://maps.app.goo.gl/AbCdEf123')).toBe(
      'https://maps.app.goo.gl/AbCdEf123',
    );
    expect(googleMapsUrl('https://www.google.com/maps/place/Rambagh+Palace/@26.89,75.80')).toBe(
      'https://www.google.com/maps/place/Rambagh+Palace/@26.89,75.80',
    );
    expect(googleMapsUrl('http://maps.google.co.in/?q=Jaipur')).toBe(
      'https://maps.google.co.in/?q=Jaipur',
    );
    expect(googleMapsUrl('https://goo.gl/maps/xyz')).toBe('https://goo.gl/maps/xyz');
  });

  it('refuses anything else', () => {
    for (const bad of [
      'javascript:alert(1)',
      'https://evil.example/maps',
      'https://google.com.evil.example/maps',
      'https://www.google.com/search?q=maps',
      'https://user:pass@www.google.com/maps',
      'ftp://maps.google.com',
      'not a link',
      'https://maps.app.goo.gl/',
    ]) {
      expect(googleMapsUrl(bad), bad).toBeNull();
    }
  });

  it('keeps only the ID of a YouTube link', () => {
    for (const link of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/live/dQw4w9WgXcQ?feature=share',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      expect(youtubeVideoId(link), link).toBe('dQw4w9WgXcQ');
    }
    expect(youtubeWatchUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('refuses links that are not a YouTube video', () => {
    for (const bad of [
      'https://vimeo.com/123',
      'https://www.youtube.com/@channel',
      'https://www.youtube.com/watch?v=short',
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'javascript:alert(1)//youtu.be/dQw4w9WgXcQ',
    ]) {
      expect(youtubeVideoId(bad), bad).toBeNull();
    }
  });
});
