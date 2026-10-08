# Mobile free-pose support update

## What changed
- Enabled the `pose` tab to use the hydrated React client even on mobile user agents.
- Added a **自由ポーズ** card to the mobile robot workshop with a direct link to the pose studio.
- Preserved custom pose data on mobile via `poseState` query/form serialization.
- Updated the mobile robot save endpoint so custom mobile free poses can be saved.
- Extended the pose studio so it can open either:
  - from the existing desktop/sessionStorage workflow, or
  - directly from mobile query parameters.

## Main files changed
- `app/page.tsx`
- `components/mobile/mobile-site.tsx`
- `components/robot/robot-pose-studio.tsx`
- `app/api/mobile/robot/route.ts`

## Notes
- The mobile workshop remains the lightweight compat UI.
- Only the free-pose editor route uses the client runtime on smartphones.
- This keeps normal mobile pages light while allowing touch-based pose editing.
