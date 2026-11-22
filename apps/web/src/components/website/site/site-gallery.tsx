'use client';

import type { components } from '@my-marriage/contracts';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import type { SiteSkin } from './site-skins';

export type GalleryAlbum = components['schemas']['PublicAlbumDto'];
type GalleryPhoto = components['schemas']['PublicPhotoDto'];

/**
 * The website's gallery (PRD SITE-03, PHOTO-07): the couple's approved
 * photos, an album at a time, and a full-screen view with arrow keys. The
 * same albums and photos in every design; only the skin differs. Nothing
 * about who uploaded a photo is shown or sent.
 */
export function SiteGallery({
  slug,
  albums,
  skin,
}: {
  slug: string;
  albums: readonly GalleryAlbum[];
  skin: SiteSkin;
}) {
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? '');
  const [loaded, setLoaded] = useState<{ albumId: string; photos: GalleryPhoto[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!albumId) return;
    let current = true;
    void api
      .GET('/api/v1/public/weddings/{slug}/albums/{albumId}/photos', {
        params: { path: { slug, albumId } },
      })
      .then(({ data }) => {
        if (!current) return;
        if (data) setLoaded({ albumId, photos: data.data.photos });
        else setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [albumId, slug]);

  const photos = loaded?.albumId === albumId ? loaded.photos : null;
  const album = albums.find((candidate) => candidate.id === albumId);
  const shown = open === null || !photos ? undefined : photos[open];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (shown && !element.open) element.showModal();
    if (!shown && element.open) element.close();
  }, [shown]);

  return (
    <div className="flex flex-col gap-4">
      {albums.length > 1 && (
        <div role="group" aria-label="Albums" className="flex flex-wrap gap-2">
          {albums.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === albumId}
              onClick={() => {
                setAlbumId(option.id);
                setFailed(false);
              }}
              className={`min-h-9 ${option.id === albumId ? skin.choiceOn : skin.choice}`}
            >
              {option.title} ({option.photoCount})
            </button>
          ))}
        </div>
      )}

      {failed ? (
        <p className={`${skin.card} ${skin.body}`}>
          The photos couldn’t be loaded. Please try again.
        </p>
      ) : !photos ? (
        <ul
          aria-hidden="true"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
        >
          {Array.from({ length: Math.min(album?.photoCount ?? 4, 8) }, (_, index) => (
            <li key={index} className={`aspect-square animate-pulse bg-black/5 ${skin.photo}`} />
          ))}
        </ul>
      ) : (
        <ul
          aria-label={album ? `${album.title} photos` : 'Photos'}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
        >
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpen(index)}
                className={`group relative block aspect-square w-full overflow-hidden ${skin.photo}`}
              >
                <Image
                  src={photo.thumbUrl}
                  alt={`${album?.title ?? 'Wedding'} photo ${index + 1} of ${photos.length}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label={album ? `${album.title} photo` : 'Photo'}
        onClose={() => setOpen(null)}
        onKeyDown={(event) => {
          if (open === null || !photos) return;
          if (event.key === 'ArrowRight' && open < photos.length - 1) setOpen(open + 1);
          if (event.key === 'ArrowLeft' && open > 0) setOpen(open - 1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {shown && photos && open !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-label-md text-white/80">
                {album?.title} · {open + 1} of {photos.length}
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => dialog.current?.close()}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <Icon name="close" className="size-6" label="Close" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image
                src={shown.displayUrl}
                alt={`${album?.title ?? 'Wedding'} photo ${open + 1} of ${photos.length}`}
                fill
                unoptimized
                sizes="100vw"
                className="object-contain"
              />
              {open > 0 && (
                <button
                  type="button"
                  onClick={() => setOpen(open - 1)}
                  className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 hover:bg-black/70"
                >
                  <Icon name="arrow-back" className="size-6" label="Previous photo" />
                </button>
              )}
              {open < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setOpen(open + 1)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 hover:bg-black/70"
                >
                  <Icon name="arrow-forward" className="size-6" label="Next photo" />
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
