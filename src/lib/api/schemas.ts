import { z } from 'zod';

const nonNegativeInt = z.number().int().nonnegative();

const optionalUrl = z.preprocess(
	(value) => (value === '' ? undefined : value),
	z.string().url().optional(),
);

export const MediaVariantSchema = z.object({
  quality: z.string().min(1),
  url: z.string().url(),
  resolution: z.string().optional(),
  mime: z.string().optional(),
  format: z.string().optional(),
  size: nonNegativeInt.optional(),
  bitrate: nonNegativeInt.optional(),
  codec: z.string().optional(),
  hasAudio: z.boolean().optional(),
  requiresMerge: z.boolean().optional(),
  requiresProxy: z.boolean().optional(),
  formatId: z.string().optional(),
  filename: z.string().optional(),
});

export const MediaItemSchema = z.object({
  index: nonNegativeInt,
  type: z.enum(['video', 'audio', 'image']),
  thumbnail: optionalUrl,
  variants: z.array(MediaVariantSchema).min(1),
});

export const EngagementSchema = z.object({
  views: nonNegativeInt.optional(),
  likes: nonNegativeInt.optional(),
  comments: nonNegativeInt.optional(),
  shares: nonNegativeInt.optional(),
  bookmarks: nonNegativeInt.optional(),
});

export const AuthorSchema = z.object({
  name: z.string().optional(),
  handle: z.string().optional(),
  avatar: optionalUrl,
  verified: z.boolean().optional(),
});

export const ContentSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
});

export const AuthenticationSchema = z.object({
  used: z.boolean().optional(),
  source: z.string().optional(),
});

export const ExtractSuccessDataSchema = z.object({
  url: z.string().url(),
  platform: z.string().min(1),
  mediaType: z.string().optional(),
  author: AuthorSchema,
  content: ContentSchema,
  engagement: EngagementSchema,
  media: z.array(MediaItemSchema).min(1),
  authentication: AuthenticationSchema,
});

export const ExtractMetaSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
  responseTime: nonNegativeInt.optional(),
  cached: z.boolean().optional(),
  accessMode: z.string().optional(),
  publicContent: z.boolean().optional(),
  cookieSource: z.string().optional(),
});

export const ExtractResultSchema = z.object({
  success: z.literal(true),
  data: ExtractSuccessDataSchema,
  meta: ExtractMetaSchema.optional(),
});

export const ExtractErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    category: z.enum(['NETWORK', 'VALIDATION', 'RATE_LIMIT', 'AUTH', 'NOT_FOUND', 'EXTRACTION_FAILED']).optional(),
    code: z.string().min(1),
    message: z.string().min(1),
    metadata: z.record(z.any()).optional(),
  }),
  meta: ExtractMetaSchema.optional(),
});

export const ExtractResponseSchema = z.union([ExtractResultSchema, ExtractErrorSchema]);

export type ExtractResult = z.infer<typeof ExtractResultSchema>;
export type ExtractError = z.infer<typeof ExtractErrorSchema>;
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

export function validateExtractResponse(payload: unknown): ExtractResponse {
  return ExtractResponseSchema.parse(payload);
}
