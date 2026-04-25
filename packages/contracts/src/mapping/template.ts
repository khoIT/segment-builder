import { z } from 'zod';
import { MappingSpec } from './dsl.js';

// A starter recipe. UI renders `parameterSchema` into a form; on submit
// we deep-merge the user's params into `defaultSpec` and persist the
// result as a `Mapping` row.
//
// `parameterSchema` is a tiny JSON-Schema-like shape we intentionally
// keep narrow: enough to drive a form, not enough to express anything
// the DSL can't already validate.
export const TemplateParamType = z.enum(['date', 'number', 'string', 'boolean', 'enum']);
export type TemplateParamType = z.infer<typeof TemplateParamType>;

export const TemplateParam = z.object({
  key: z.string().min(1),                          // e.g. 'cohortStart'
  label: z.string().min(1),                        // 'Cohort start date'
  type: TemplateParamType,
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  options: z.array(z.string()).optional(),         // for type=enum
  help: z.string().optional(),
});
export type TemplateParam = z.infer<typeof TemplateParam>;

export const MappingTemplate = z.object({
  id: z.string().min(1),                           // 'tpl_user_profile_dx'
  label: z.string().min(1),
  description: z.string(),
  parameterSchema: z.array(TemplateParam),
  defaultSpec: MappingSpec,
});
export type MappingTemplate = z.infer<typeof MappingTemplate>;
