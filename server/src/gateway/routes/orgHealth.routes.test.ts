import { expect, it } from 'vitest';
import { orgHealthRouter } from './orgHealth.routes';
import { requireWorkspaceAdmin } from '../middleware/workspace.middleware';
it('guards the organization health overview with workspace admin admission', () => {
  const route = (orgHealthRouter as any).stack.find((layer: any) => layer.route?.path === '/').route;
  expect(route.stack[0].handle).toBe(requireWorkspaceAdmin);
});
