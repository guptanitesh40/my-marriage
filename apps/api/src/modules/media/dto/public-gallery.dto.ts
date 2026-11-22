/** An album on the public website: approved photos only. */
export class PublicAlbumDto {
  id: string;

  title: string;

  /** `YYYY-MM-DD`, for a ceremony's album. */
  startDate?: string;

  /** Approved photos in it. */
  photoCount: number;

  /** Its newest approved photo, small. */
  coverUrl: string;
}

export class PublicGalleryDto {
  /** Albums with at least one approved photo, in the website's order. */
  albums: PublicAlbumDto[];
}

/**
 * An approved photo, for anyone. Nothing about who uploaded it, its file
 * name or where it is stored (decision 0019).
 */
export class PublicPhotoDto {
  id: string;

  width: number;

  height: number;

  thumbUrl: string;

  displayUrl: string;
}

export class PublicPhotoListDto {
  /** Newest first. */
  photos: PublicPhotoDto[];
}
