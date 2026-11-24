import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_SNIFF_BYTES,
  matchesDocumentType,
  tidyFileName,
  VIEWABLE_TYPES,
  type DocumentType,
} from '../../platform/storage/document-type.js';
import { FileAsset, type FileOwner } from '../../platform/storage/file-asset.schema.js';
import {
  objectKey,
  ObjectStorage,
  type StoredObject,
} from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import type {
  ExpenseFileDto,
  ExpenseFileUploadDto,
  ExpenseFileUploadRequestDto,
} from './dto/expense-file.dto.js';
import { receiptNotFound, receiptRejected, unknownReceipt } from './expense-errors.js';
import { RECEIPT_LIMITS } from './expense-policy.js';

type StoredAsset = FileAsset & { _id: Types.ObjectId };

/**
 * Receipts and documents kept with expenses and their payments (PRD
 * EXP-01, decision 0023), in the bucket's `weddings/{weddingId}/receipts/`
 * folder. The browser uploads into `uploads/` with a short-lived form; the
 * file is then checked (size, and its own bytes agree with its type) and
 * kept. It is attached to an expense or a ledger entry when that is saved,
 * in the same transaction, and to nothing else ever. Private: streamed by
 * the API to the wedding's members only.
 */
@Traced()
@Injectable()
export class ExpenseFilesService {
  private readonly logger = new Logger(ExpenseFilesService.name);

  constructor(
    @InjectModel(FileAsset.name) private readonly assets: Model<FileAsset>,
    private readonly access: WeddingAccessService,
    private readonly storage: ObjectStorage,
  ) {}

  /** A form to upload one file to, and the record that waits for it. */
  async requestUpload(
    user: AuthenticatedUser,
    weddingId: string,
    input: ExpenseFileUploadRequestDto,
  ): Promise<ExpenseFileUploadDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = new Types.ObjectId();
    const folder = wedding._id.toHexString();
    const extension = DOCUMENT_EXTENSIONS[input.contentType];
    const asset = await this.assets.create({
      _id: id,
      weddingId: wedding._id,
      kind: 'receipt',
      state: 'pending',
      uploadKey: objectKey('uploads', folder, id.toHexString()),
      s3Key: objectKey('weddings', folder, 'receipts', `${id.toHexString()}.${extension}`),
      contentType: input.contentType,
      fileName: tidyFileName(input.fileName, `document.${extension}`),
      createdBy: userId,
    });
    const target = await this.storage.uploadTarget(
      asset.uploadKey,
      input.contentType,
      RECEIPT_LIMITS.bytes,
      RECEIPT_LIMITS.formSeconds,
    );
    return {
      uploadId: id.toHexString(),
      url: target.url,
      fields: target.fields,
      maxBytes: RECEIPT_LIMITS.bytes,
      expiresAt: new Date(Date.now() + RECEIPT_LIMITS.formSeconds * 1000),
    };
  }

  /**
   * Checks an upload and keeps it: it arrived, fits the limit, and its own
   * first bytes agree with the type it was uploaded as. Anything else is
   * removed and refused. The kept file is attached to nothing yet.
   */
  async completeUpload(
    user: AuthenticatedUser,
    weddingId: string,
    uploadId: string,
  ): Promise<ExpenseFileDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(uploadId);
    const asset = id
      ? await this.assets
          .findOne({ _id: id, weddingId: wedding._id, kind: 'receipt', state: 'pending' })
          .lean()
      : null;
    if (!asset) throw receiptRejected('UPLOAD_NOT_FOUND');

    const bytes = await this.storage.size(asset.uploadKey);
    if (bytes === null) throw receiptRejected('UPLOAD_NOT_FOUND');
    if (bytes > RECEIPT_LIMITS.bytes) {
      await this.discard(asset);
      throw receiptRejected('UPLOAD_TOO_LARGE');
    }
    const start = await this.storage.start(asset.uploadKey, DOCUMENT_SNIFF_BYTES);
    if (!matchesDocumentType(start, asset.contentType as DocumentType)) {
      await this.discard(asset);
      throw receiptRejected('UPLOAD_WRONG_TYPE');
    }
    await this.storage.move(asset.uploadKey, asset.s3Key, asset.contentType);
    const kept = await this.assets
      .findOneAndUpdate(
        { _id: asset._id, weddingId: wedding._id, state: 'pending' },
        { $set: { state: 'active', bytes } },
        { returnDocument: 'after' },
      )
      .lean();
    if (!kept) throw receiptRejected('UPLOAD_NOT_FOUND');
    return this.toDto(kept);
  }

  /** A kept file of this wedding, to stream to one of its members; not found otherwise. */
  async read(
    user: AuthenticatedUser,
    weddingId: string,
    fileId: string,
  ): Promise<{ file: StoredObject; fileName: string; viewable: boolean }> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(fileId);
    const asset = id
      ? await this.assets
          .findOne({ _id: id, weddingId: wedding._id, kind: 'receipt', state: 'active' })
          .lean()
      : null;
    const file = asset ? await this.storage.read(asset.s3Key) : null;
    if (!asset || !file) throw receiptNotFound();
    // The type is the one the API checked, never what storage says.
    return {
      file: { ...file, contentType: asset.contentType },
      fileName: asset.fileName ?? 'document',
      viewable: this.viewable(asset.contentType),
    };
  }

  /**
   * Attaches uploaded files to an expense or a ledger entry, in the caller's
   * transaction. Each must be this wedding's, checked, and attached to
   * nothing yet; otherwise nothing is attached and the save is refused.
   */
  async attach(
    weddingId: Types.ObjectId,
    ids: readonly Types.ObjectId[],
    owner: FileOwner,
    session: ClientSession,
  ): Promise<void> {
    if (ids.length === 0) return;
    const attached = await this.assets.updateMany(
      {
        _id: { $in: ids },
        weddingId,
        kind: 'receipt',
        state: 'active',
        attachedTo: null,
      },
      { $set: { attachedTo: owner } },
      { session },
    );
    if (attached.modifiedCount !== ids.length) throw unknownReceipt();
  }

  /**
   * Takes files off an expense, in the caller's transaction: they are marked
   * deleted. Returns where they are stored, for `removeStored` once the
   * transaction has committed.
   */
  async detach(
    weddingId: Types.ObjectId,
    ids: readonly Types.ObjectId[],
    owner: FileOwner,
    session: ClientSession,
  ): Promise<string[]> {
    if (ids.length === 0) return [];
    const found = await this.assets
      .find(
        {
          _id: { $in: ids },
          weddingId,
          kind: 'receipt',
          state: 'active',
          'attachedTo.kind': owner.kind,
          'attachedTo.id': owner.id,
        },
        { s3Key: 1 },
      )
      .session(session)
      .lean();
    await this.assets.updateMany(
      { _id: { $in: found.map((asset) => asset._id) }, weddingId },
      { $set: { state: 'deleted' } },
      { session },
    );
    return found.map((asset) => asset.s3Key);
  }

  /**
   * Deletes the stored copies of files already marked deleted. A failure is
   * logged and left: the record says deleted, so the file is never served.
   */
  async removeStored(weddingId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        this.logger.warn('Removed receipt not deleted from storage yet', {
          weddingId: weddingId.toHexString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** The kept files among `ids`, by ID, for an expense's details. */
  async filesOf(
    weddingId: Types.ObjectId,
    ids: readonly Types.ObjectId[],
  ): Promise<Map<string, ExpenseFileDto>> {
    if (ids.length === 0) return new Map();
    const found = await this.assets
      .find({ _id: { $in: ids }, weddingId, kind: 'receipt', state: 'active' })
      .lean();
    return new Map(found.map((asset) => [asset._id.toHexString(), this.toDto(asset)]));
  }

  private viewable(contentType: string): boolean {
    return (VIEWABLE_TYPES as readonly string[]).includes(contentType);
  }

  private toDto(asset: StoredAsset): ExpenseFileDto {
    const id = asset._id.toHexString();
    return {
      id,
      fileName: asset.fileName ?? 'document',
      contentType: asset.contentType as DocumentType,
      bytes: asset.bytes ?? 0,
      url: `/api/v1/weddings/${asset.weddingId.toHexString()}/expense-files/${id}`,
      viewable: this.viewable(asset.contentType),
      createdAt: asset.createdAt,
    };
  }

  /** An upload that failed its checks: its file and record go. */
  private async discard(asset: StoredAsset): Promise<void> {
    await this.storage.delete(asset.uploadKey);
    await this.assets.updateOne(
      { _id: asset._id, weddingId: asset.weddingId, state: 'pending' },
      { $set: { state: 'deleted' } },
    );
  }
}
