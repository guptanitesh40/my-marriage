import { Injectable, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

/**
 * Refuses to start the API or the worker while the database lacks an index
 * that a schema declares. Indexes carry business invariants — one active owned
 * wedding per user, unique emails, session expiry — and they are created only
 * by migrations, so a process that started without them would quietly stop
 * enforcing those rules.
 */
@Injectable()
export class IndexCheck implements OnApplicationBootstrap {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap(): Promise<void> {
    const missing = await this.findMissingIndexes();
    if (missing.length > 0) {
      throw new Error(
        `MongoDB is missing indexes declared in the schemas: ${missing.join('; ')}. ` +
          'Run "pnpm db:migrate". If that reports the database is up to date, ' +
          'a schema index was added or changed without a migration.',
      );
    }
  }

  /** Each missing index as `collection {keys}`. Extra indexes in the database are fine. */
  async findMissingIndexes(): Promise<string[]> {
    const missing: string[] = [];
    for (const model of Object.values(this.connection.models)) {
      const { toCreate } = await model.diffIndexes();
      for (const keys of toCreate as unknown[]) {
        missing.push(`${model.collection.name} ${JSON.stringify(keys)}`);
      }
    }
    return missing;
  }
}

/** Imported by the API and the worker, but not by the migration runner, which runs first. */
@Module({ providers: [IndexCheck] })
export class IndexCheckModule {}
