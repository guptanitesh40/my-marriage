import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  /** Always "ok": a failed check is a 503 in the standard error envelope instead. */
  @ApiProperty({ enum: ['ok'] })
  status: 'ok';

  /** The dependencies that were checked and are reachable. Empty for the liveness probe. */
  @ApiProperty({ type: [String], example: ['mongodb', 'redis'] })
  checks: string[];
}
