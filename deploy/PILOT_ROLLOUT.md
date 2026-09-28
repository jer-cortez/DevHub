# Delivery pilot rollout

## Before deploy

1. Apply database migrations `007`, `008`, and `009` in order in the target environment. Confirm each migration completes before starting the API or client rollout.
2. Configure Supabase Auth email OTP delivery and templates for the pilot. Set the production site URL and add the exact production `/auth/callback` URL to the Supabase redirect URL allowlist. Add the matching local development callback only where needed. Confirm the email provider is ready without sending a pilot invitation during implementation.
3. Explicitly provision the pilot administrator in the organization membership data and verify the account is active with organization role `admin`. The UI does not promote administrators.
4. Deploy the API admission and invitation endpoints, then deploy this client. Confirm `/api/auth/login` rejects uninvited identities and that rejected callbacks clear the Supabase session.
5. Create invitations through Admin → Invitations. Creating one authorizes the email but does not send email; deliver sign-in instructions through the separately approved pilot process.

## Pilot role matrix

| Role | Tasks | Sprints | Invitations / overview |
| --- | --- | --- | --- |
| Inactive or uninvited | No workspace access | No workspace access | No access |
| Active organization member | Work on the assigned repository | View repository sprints | No admin access |
| Active team developer/designer | Create and update permitted tasks | View sprints | No admin access |
| Active tech lead/project manager | Team task assignment and review actions | Plan/start/close team sprints | No invitation administration |
| Active organization admin | Manage members and leadership; task edits still require own-team membership | View; sprint mutation requires own-team lead/PM role | Create/list/revoke invitations |

## Backout

If admission or delivery behavior is incorrect, disable pilot access at the API/auth layer first, then roll back the client deployment. Preserve invitation and migration data for investigation; do not delete migration history. Re-enable access only after API checks confirm the intended role and admission rules.

## Remaining deployment steps

- Add and review migration `009` plus the backend invitation routes (neither exists in this checkout), then apply `007`/`008`/`009` in sequence and verify schema state.
- Set Supabase email OTP configuration and callback allowlist in the target project.
- Provision the pilot admin explicitly and verify active membership.
- Deploy API before client and validate login admission, invitation CRUD, task reopen, and sprint close behavior.
- Arrange any invitation email communication outside this UI; no email is sent by invitation creation.

## Validation completed locally

- Server build and 126 tests passed.
- Client TypeScript, targeted lint and production webpack build passed.
- Migrations 008 and 009 applied to a disposable PostgreSQL 16 database; task/sprint and invitation constraint fixtures passed. No live schema or account changes were made.
- Authenticated browser flows with real Supabase/GitHub accounts and the pilot role matrix still require staging validation. No invitation or sign-in email was sent during implementation.

Apply only pending migrations after inspecting the ledger. Migrations 008 and 009 are one-time scripts; do not blindly rerun them. See CHECKPOINT_STATUS.md for the final validation record.
