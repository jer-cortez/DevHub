import { z } from 'zod';
import { isWithinSerializedSize } from './common.schemas';

// created_by is intentionally excluded — the controller derives it from the
// authenticated user, never from the request body.
const MAX_CANVAS_BYTES = 5_000_000;

export const createDrawingBoardBody = z.object({
  repo_id: z.uuid(),
  type: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(255),
  nodes: z.any().refine(isWithinSerializedSize(MAX_CANVAS_BYTES), 'nodes payload is too large'),
  edges: z.any().refine(isWithinSerializedSize(MAX_CANVAS_BYTES), 'edges payload is too large'),
});

export const updateDrawingBoardBody = z
  .object({
    type: z.string().trim().min(1).max(50),
    title: z.string().trim().min(1).max(255),
    nodes: z.any().refine(isWithinSerializedSize(MAX_CANVAS_BYTES), 'nodes payload is too large'),
    edges: z.any().refine(isWithinSerializedSize(MAX_CANVAS_BYTES), 'edges payload is too large'),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
