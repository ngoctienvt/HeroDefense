# VFX type validation

- Scope: existing catalog override typing, water orbit type, actor mesh collection, capped zone/array lookup, four existing VFX tests.
- Changes preserve combat values. Catalog override uses its existing owning interface and preserves explicit null abilities; water is now accepted by the trait type already used by the combat profile. Mesh collection accepts the real optional mesh array without unsafe casts. Zone/array locals explicitly include the pool-cap undefined result.
- Added `VisualActor.culinhShield` for root's snapshot/render fix.
- Test fixtures use inferred JSON palette types, valid structural ground-effect arguments, and an explicit skill-effect presence check.
- Validation: three `npm run typecheck` runs. Assigned files have no remaining errors. Latest run reports only two nullable Tier 3 ability accesses in root-owned `apps/client/test/visual-long-vuong.test.ts:12,13` under active repair.
- Focused regression: final run **61/61 passed**, four files, exit 0: `npx vitest run apps/client/test/hangnga-vfx.test.ts apps/client/test/tayvuongmau-vfx.test.ts apps/client/test/ladongtan-vfx.test.ts apps/client/test/thietphien-vfx.test.ts`.
- Fixed Hằng Nga's precise hold-frame boundary with a 1e-9 tolerance in frame units; regression retains exact-boundary expectations and adds two 1µs-before-boundary checks. No gameplay or C6 art change.
- Replaced Tây Vương Mẫu's brittle closing-parenthesis substring assertion with a routing regex that requires both skill ids, validated server coordinates, and the server-point Vector3 while allowing the expanded skill list.
- Static review: edits retain user source, gameplay values, C6 profiles, generated catalog, and existing logs. No new runtime failure path or process was added.
- Build/browser: delegated to root; not run by this agent.

## Outstanding

- Root is repairing the last two Tier 3 nullable ability test accesses and running aggregate build/browser validation.
