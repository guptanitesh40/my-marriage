/** The wedding's photo storage (PRD PHOTO-05), in bytes. */
export class QuotaDto {
  /** 5,000,000,000: decimal 5 GB. */
  limitBytes: number;

  /** Photos kept: originals and their display copies. */
  usedBytes: number;

  /** Set aside for uploads in progress. */
  reservedBytes: number;
}
