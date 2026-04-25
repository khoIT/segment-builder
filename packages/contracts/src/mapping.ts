import { z } from 'zod';

// One field in a raw → standard mapping. `confidence` is the auto-mapper's
// match confidence (0–100). `transform` is a small DSL string we evaluate
// at master-table build time (executor lives in apps/query-svc).
export const MappingField = z.object({
  raw: z.string(),
  rawType: z.string(),         // 'epoch_sec' | 'string' | 'enum' | …
  std: z.string(),
  stdType: z.string(),         // 'timestamp' | 'string' | 'iso_cc' | 'bigint' | …
  transform: z.string(),
  confidence: z.number().min(0).max(100),
  required: z.boolean(),
  warning: z.string().nullable().optional(),
});
export type MappingField = z.infer<typeof MappingField>;

// A full Mapping = ordered list of MappingField for a (raw_topic → playbook).
// Keyed in storage by `playbookId` + `gameCode`.
export const Mapping = z.object({
  id: z.string(),                       // 'login_logout_ptg'
  playbookId: z.string(),               // 'login_logout' | 'moneyflow' | …
  gameCode: z.string(),                 // 'PTG' | 'CFM' | 'TFB'
  fields: z.array(MappingField),
});
export type Mapping = z.infer<typeof Mapping>;

// A pre-built semantic mapping recipe (UI starting point).
export const Playbook = z.object({
  id: z.string(),                       // 'login_logout' | 'moneyflow' | 'custom'
  label: z.string(),
  icon: z.string(),                     // lucide icon name
  fields: z.number().int().nonnegative(),
  schema: z.string(),                   // 'standard.session' | '—' for custom
});
export type Playbook = z.infer<typeof Playbook>;
