import { z } from 'zod';

export const createDrawingBoardCollaboratorBody = z.object({
  board_id: z.uuid(),
  user_id: z.uuid(),
  permission: z.string().trim().min(1).max(50),
  added_at: z.coerce.date(),
});
