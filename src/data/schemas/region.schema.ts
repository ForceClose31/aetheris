/**
 * Region schema - groups maps and acts as the unit of progression gating.
 */

import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

export const REGION_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^reg\.[a-z0-9_]+$/, { message: 'region id must be "reg.<lowercase>"' }),
    name: LOCALIZED_SCHEMA,
    /** Levels this region targets (informational; spawn rules carry their own ranges). */
    levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    /** Map ids that belong to this region. Validated to exist at load time. */
    mapIds: z.array(z.string().min(1)).min(1),
    /** Default map for the region (the "hub"). */
    hubMapId: z.string().min(1),
    description: z.string().optional(),
  })
  .strict()
  .refine((r) => r.mapIds.includes(r.hubMapId), {
    path: ['hubMapId'],
    message: 'hubMapId must be one of mapIds',
  });
export type Region = z.infer<typeof REGION_SCHEMA>;
