import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile, open } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { Traced } from '../tracing.js';

/** Where a browser sends a file: a form POST of `fields`, then the file as `file`. */
export interface UploadTarget {
  url: string;
  fields: Record<string, string>;
}

export interface StoredObject {
  body: Readable;
  bytes: number;
  contentType: string;
}

/**
 * Uploaded files (decision 0018). One bucket; each kind of file has its
 * own folder (key prefix) in it. Keys are always made by the API, never
 * taken from a request. Domain code uses this, never an S3 client.
 */
export abstract class ObjectStorage {
  /** A short-lived form the browser can upload one file to, at `key`, up to `maxBytes`. */
  abstract uploadTarget(
    key: string,
    contentType: string,
    maxBytes: number,
    expiresSeconds: number,
  ): Promise<UploadTarget>;

  /** The object's size, or null when there is none. */
  abstract size(key: string): Promise<number | null>;

  /** The first bytes of an object, to check what it really is. */
  abstract start(key: string, bytes: number): Promise<Uint8Array>;

  abstract move(from: string, to: string, contentType: string): Promise<void>;

  abstract delete(key: string): Promise<void>;

  /** The object to stream to a reader, or null when there is none. */
  abstract read(key: string): Promise<StoredObject | null>;
}

const notFound = (error: unknown) =>
  error instanceof S3ServiceException &&
  (error.name === 'NotFound' ||
    error.name === 'NoSuchKey' ||
    error.$metadata.httpStatusCode === 404);

/** Files in the S3 bucket S3_BUCKET; credentials from the standard AWS chain. */
@Traced()
@Injectable()
export class S3ObjectStorage extends ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.bucket = config.get('S3_BUCKET', { infer: true }) ?? '';
    this.client = new S3Client({ region: config.get('AWS_REGION', { infer: true }) });
  }

  async uploadTarget(key: string, contentType: string, maxBytes: number, expiresSeconds: number) {
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresSeconds,
      Conditions: [
        ['content-length-range', 1, maxBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
    });
    return { url, fields };
  }

  async size(key: string): Promise<number | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? null;
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  }

  async start(key: string, bytes: number): Promise<Uint8Array> {
    const { Body } = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
    );
    return Body ? Body.transformToByteArray() : new Uint8Array();
  }

  async move(from: string, to: string, contentType: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${from.split('/').map(encodeURIComponent).join('/')}`,
        Key: to,
        ContentType: contentType,
        MetadataDirective: 'REPLACE',
      }),
    );
    await this.delete(from);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async read(key: string): Promise<StoredObject | null> {
    try {
      const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!out.Body) return null;
      return {
        body: out.Body as Readable,
        bytes: out.ContentLength ?? 0,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  }
}

/** What a local upload form carries, signed so only forms the API made are accepted. */
export interface LocalUploadGrant {
  key: string;
  contentType: string;
  maxBytes: number;
  expires: number;
}

/**
 * Files in a folder on this machine, for development and tests when no
 * bucket is set. Uploads go to the API's own `/api/v1/local-uploads`,
 * signed with a key that lives only as long as the process.
 */
@Traced()
@Injectable()
export class LocalObjectStorage extends ObjectStorage {
  private readonly logger = new Logger(LocalObjectStorage.name);
  private readonly root: string;
  private readonly signingKey = randomBytes(32);

  constructor(config: ConfigService<Env, true>) {
    super();
    const dir = config.get('MEDIA_LOCAL_DIR', { infer: true });
    this.root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  }

  private path(key: string): string {
    const path = resolve(this.root, key);
    // Keys are the API's own, but never let one leave the folder.
    if (!path.startsWith(this.root + '/')) throw new Error('Object key outside the media folder');
    return path;
  }

  signature(grant: LocalUploadGrant): string {
    return createHmac('sha256', this.signingKey)
      .update(`${grant.key}\n${grant.contentType}\n${grant.maxBytes}\n${grant.expires}`)
      .digest('base64url');
  }

  /** True when the form was made here, has not expired, and was not altered. */
  accepts(grant: LocalUploadGrant, signature: string): boolean {
    const expected = Buffer.from(this.signature(grant));
    const given = Buffer.from(signature);
    return (
      grant.expires > Date.now() &&
      expected.length === given.length &&
      timingSafeEqual(expected, given)
    );
  }

  async write(key: string, data: Uint8Array): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  uploadTarget(
    key: string,
    contentType: string,
    maxBytes: number,
    expiresSeconds: number,
  ): Promise<UploadTarget> {
    const grant = { key, contentType, maxBytes, expires: Date.now() + expiresSeconds * 1000 };
    this.logger.log('Local upload form made', { key });
    return Promise.resolve({
      url: '/api/v1/local-uploads',
      fields: {
        key,
        'Content-Type': contentType,
        maxBytes: String(maxBytes),
        expires: String(grant.expires),
        signature: this.signature(grant),
      },
    });
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.path(key))).size;
    } catch {
      return null;
    }
  }

  async start(key: string, bytes: number): Promise<Uint8Array> {
    const file = await open(this.path(key), 'r');
    try {
      const buffer = Buffer.alloc(bytes);
      const { bytesRead } = await file.read(buffer, 0, bytes, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  }

  async move(from: string, to: string, contentType: string): Promise<void> {
    const target = this.path(to);
    await mkdir(dirname(target), { recursive: true });
    await rename(this.path(from), target);
    await writeFile(`${target}.type`, contentType);
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
    await rm(`${this.path(key)}.type`, { force: true });
  }

  async read(key: string): Promise<StoredObject | null> {
    const bytes = await this.size(key);
    if (bytes === null) return null;
    const contentType = await readFile(`${this.path(key)}.type`, 'utf8').catch(
      () => 'application/octet-stream',
    );
    return { body: createReadStream(this.path(key)), bytes, contentType };
  }
}

/** S3 when a bucket is set, else the local folder (never in production: env.ts). */
export const objectStorageProvider = {
  provide: ObjectStorage,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): ObjectStorage =>
    config.get('S3_BUCKET', { infer: true })
      ? new S3ObjectStorage(config)
      : new LocalObjectStorage(config),
};

/** Joins key parts into one key; parts are the API's own IDs. */
export function objectKey(...parts: string[]): string {
  return join(...parts).replace(/\\/g, '/');
}
