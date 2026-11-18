import { Module } from '@nestjs/common';
import { IndexCheckModule } from './platform/index-check.js';
import { PlatformModule } from './platform/platform.module.js';

/**
 * Root module of the background worker. It shares PlatformModule (and, later,
 * the domain modules) with the API but exposes no HTTP controllers. Queue
 * processors are registered here as each milestone introduces them.
 */
@Module({
  imports: [PlatformModule, IndexCheckModule],
})
export class WorkerModule {}
