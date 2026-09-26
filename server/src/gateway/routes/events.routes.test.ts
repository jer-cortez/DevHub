import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../controller/events.controller', () => ({
  EventsController: { subscribe: vi.fn() },
}));
vi.mock('../../lib/sse', () => ({ ORG_EVENTS_KEY: 'org' }));

import { eventsRouter } from './events.routes';
import { EventsController } from '../../controller/events.controller';
import { repoIdParams } from '../../schemas/common.schemas';

function requestChannel(channel: string) {
  const req = { method: 'GET', url: `/${channel}/events`, headers: {} } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  eventsRouter(req, res, next);
  return { req, res, next };
}

describe('repository event route', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['org', '550e8400-e29b-41d4-a716-446655440000'])(
    'opens the event controller for channel %s', (channel) => {
      const { req, res } = requestChannel(channel);
      expect(EventsController.subscribe).toHaveBeenCalledOnce();
      expect(req.params.repoId).toBe(channel);
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  it.each(['undefined', 'not-a-repo', '123'])(
    'rejects invalid channel %s', (channel) => {
      const { res } = requestChannel(channel);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(EventsController.subscribe).not.toHaveBeenCalled();
    },
  );

  it('keeps ordinary repository route validation UUID-only', () => {
    expect(repoIdParams.safeParse({ repoId: 'org' }).success).toBe(false);
  });
});
