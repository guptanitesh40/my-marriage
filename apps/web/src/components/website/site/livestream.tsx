'use client';

import { useState, type ReactNode } from 'react';
import { youtubeEmbedUrl } from '@/lib/website/site';

/**
 * A ceremony's YouTube livestream. Until a guest presses play it is the
 * design's own poster, so opening the website loads nothing from YouTube;
 * then it becomes YouTube's privacy-enhanced player.
 */
export function Livestream({
  videoId,
  title,
  className,
  children,
}: {
  videoId: string;
  /** The ceremony, to name the player and the button. */
  title: string;
  /** The box: its size, shape and colours. */
  className: string;
  /** The poster drawn inside the play button; its words start the button's name. */
  children: ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className={`${className} overflow-hidden`}>
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title={`${title} livestream`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full border-0"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`${className} group relative block w-full cursor-pointer overflow-hidden text-left`}
    >
      {children} <span className="sr-only">of {title}</span>
    </button>
  );
}
