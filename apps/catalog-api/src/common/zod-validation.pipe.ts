import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// Wraps `schema.safeParse`. Use as `@Body(new ZodValidationPipe(MySchema))`
// at controller boundaries. Returns 400 with the issue list on failure.
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request payload failed validation',
        details: { issues: r.error.issues },
      });
    }
    return r.data;
  }
}
