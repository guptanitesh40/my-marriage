import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import type { StoredObject } from '../../platform/storage/object-storage.js';
import { ObjectStorage } from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { AlbumsService, photoImageUrl } from './albums.service.js';
import type { PhotoDto, PhotoListDto } from './dto/photo.dto.js';
import { albumNotFound, photoNotFound } from './media-errors.js';
import { PHOTO_LIST_LIMIT, PHOTO_SIZES, type PhotoSize } from './media-policy.js';
import { Photo } from './schemas/photo.schema.js';
import { UploadsService } from './uploads.service.js';

export type StoredPhoto = Photo & { _id: Types.ObjectId };

function isPhotoSize(size: string): size is PhotoSize {
  return Object.hasOwn(PHOTO_SIZES, size);
}

/** States whose files are kept, and so can be seen by the wedding's members. */
export const KEPT = ['pending', 'approved', 'hidden'] as const;

/**
 * A wedding's photos as its owners and managers see them: every photo
 * that is kept, whatever its review state. Images are streamed by the API
 * (decision 0018); no address of a file in the bucket ever reaches a page.
 */
@Traced()
@Injectable()
export class PhotosService {
  constructor(
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly uploads: UploadsService,
    private readonly storage: ObjectStorage,
    private readonly accounts: AccountsService,
  ) {}

  /** An album's photos, newest first, and how many are still being processed. */
  async list(user: AuthenticatedUser, weddingId: string, albumId: string): Promise<PhotoListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(albumId);
    const album = id ? await this.albums.listed(wedding._id, id) : null;
    if (!album) throw albumNotFound();
    const [found, processing] = await Promise.all([
      this.photos
        .find({ weddingId: wedding._id, albumId: album._id, moderation: { $in: KEPT } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(PHOTO_LIST_LIMIT + 1)
        .lean(),
      this.uploads.processing(wedding._id, album._id),
    ]);
    const shown = found.slice(0, PHOTO_LIST_LIMIT);
    const names = await this.accounts.displayNames(
      shown.flatMap((photo) => (photo.uploadedBy ? [photo.uploadedBy] : [])),
    );
    return {
      photos: shown.map((photo) => photoDto(photo, names)),
      processing,
      truncated: found.length > PHOTO_LIST_LIMIT,
    };
  }

  /** One of the wedding's kept photos, in a display size, to stream. */
  async image(
    user: AuthenticatedUser,
    weddingId: string,
    photoId: string,
    size: string,
  ): Promise<StoredObject> {
    const { wedding } = await this.access.require(user, weddingId);
    if (!isPhotoSize(size)) throw photoNotFound();
    const id = parseObjectId(photoId);
    const photo = id
      ? await this.photos
          .findOne({ _id: id, weddingId: wedding._id, moderation: { $in: KEPT } })
          .lean()
      : null;
    const file = photo ? await this.storage.read(photo.derivativeKeys[size]) : null;
    if (!file) throw photoNotFound();
    return file;
  }
}

/** A photo as the wedding's members see it. */
export function photoDto(photo: StoredPhoto, names: ReadonlyMap<string, string>): PhotoDto {
  const uploadedByName = photo.uploadedBy ? names.get(photo.uploadedBy.toHexString()) : undefined;
  return {
    id: photo._id.toHexString(),
    albumId: photo.albumId.toHexString(),
    moderation: photo.moderation,
    source: photo.source,
    ...(photo.uploaderName ? { uploaderName: photo.uploaderName } : {}),
    ...(uploadedByName ? { uploadedByName } : {}),
    originalName: photo.originalName,
    width: photo.width,
    height: photo.height,
    bytes: photo.byteCounts.original,
    thumbUrl: photoImageUrl(photo.weddingId, photo._id, 'thumb'),
    displayUrl: photoImageUrl(photo.weddingId, photo._id, 'display'),
    createdAt: photo.createdAt,
  };
}
