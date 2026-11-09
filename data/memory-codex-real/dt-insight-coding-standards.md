---
name: dt-insight-coding-standards
description: Enforceable coding rules for the dt-insight repo (SSOT is docs/agents/coding-standards.md) — typing, antd/Form, comments/stylelint, i18n, formatting, bug-fix convergence, plus the lint rules dtis ready actually blocks.
metadata: summarized from docs/agents/coding-standards.md read in session 01a197b9
---

# dt-insight 写码规范（摘要）

SSOT is `docs/agents/coding-standards.md` in the repo; AGENTS layer only keeps pointers. Read it before editing or reviewing. Items marked "→ lint 候选" should become lint; "(lint 已覆盖)" means trust the lint error. `dtis ready` runs ci-local prettier / eslint / stylelint / types and is the gate (see [[dt-insight-workflow-conventions]]).

## Types / API contracts

- No `as` / `as const` to paper over literals or external JSON: give the variable the target type and let the compiler check. Use `import type` for library types (e.g. `UploadFile` from `antd/es/upload/interface`).
- Do not widen to `Record<string, unknown>` / `any` bags just to carry one extra field; extend the existing request/form type.
- Never guess backend field names or infer business meaning from message substrings (`message.includes(...)`). Error classes belong to the backend (`errorType` / `code`); the front end maps type → action and only displays `message`.
- Already-agreed fields are used directly — no `Number.isFinite` + default seconds + `Math.floor` fallbacks. Missing contract → ask the backend, do not guess.
- One semantic, one agreed entry point. If docs say "several delimiters work", the front end still parses/serializes exactly one (e.g. comma only) and stays symmetric.

## Defensive code — don't

- No extra null/undefined guards when the data source already guarantees a value; no "just in case" timeouts or safety timers (enterprise project, no over-design); no hand-written trimming when the component/API already constrains (e.g. Upload `maxCount={1}`); no validation/compat layers the PRD doesn't require.
- Fix the root cause at the data entry point; don't re-defend on the consumer side.
- Keep default query params to page state only; don't pre-fill filters/search/sort the user never set.
- When a visible label depends on an async dictionary, skip the row or keep it empty when the dictionary isn't ready — never show a raw `code`/`id`/`String(code)` to users.

## React

- Function components only; no class components.
- Minimal `useEffect`: compute from props/state or handle in the event instead. Reset-on-data-change is done with `key` remount, not a reset effect. `useEffect` is not a hidden event bus (no `refreshKey` / version counters).
- Scroll into view with `scrollIntoView({ block: 'nearest' })`, never hand-computed `scrollTop`. Mandatory scroll on mount/expand goes in `useLayoutEffect` (effect paints one frame at 0 first).
- Build class names with `classNames`, not string concatenation; no `useCallback` unless needed.
- **Required-field / format validation belongs in `Form.Item` `rules` + `form.validateFields()`**, shown under the field — not `message.error` then `return`. Lint `dt-correct/no-message-validation` (worktree `chore/correct_20261030`, new lines only) enforces this; API-response checks (`code`/`success`) are exempt, table-selection prompts disable the rule with a reason. A worked bug where sibling fields already had `rules` and only the `matchValue` items were missing them: [[bug-dataassets-permission-strategy-149812]] (dataAssets 权限策略, 2026-11-02). The worked convention lives in `docs/solutions/conventions/form-validation-next-step.md` (Steps / modal case: parent owns `Form.useForm()`, child gets `form` and wraps fields in `<Form form={form}>` + `Form.Item rules`, button awaits `form.validateFields()`; reference files `apps/publicService/src/pages/approval/process/addProcess/index.tsx` and `.../components/basicInfoConfig/index.tsx`). A `required` rule accepts a whitespace-only string, so a trimmed text field needs a second `{ whitespace: true }` rule; for `Form.List` rows the rule goes on `Form.Item name={[field.name, 'x']}`. See [[bug-dataassets-permission-strategy-149812]] for the empty-value → backend-error case.
- Check `FormInstance` typing before doubting antd: `getFieldsValue(true)` returns the whole store object, `validateFields()` only mounted fields.
- `Form.List` rows and table-cell `Form.Item`s need their own `rules`; a parent `Form.Item` with only `required` (no `name`) just draws the star. Worked example: [[bug-dataassets-permission-strategy-149812]] (permissionStrategy `fileObjectSelector` `matchValue` had no rule, so an empty regex/file target reached the API and the backend threw an SQL error).
- Use existing shared capability before writing your own (e.g. typewriter from `dt-common/src/hooks/AI` `useTyping`).

## Comments / styles

- No comments unless the **why** is non-obvious (protocol quirk, history, security boundary). Never restate code, never write "本次改动 / 修 bug 过程" into code comments (lint `dt-correct/no-process-comments`, lynton + AIAgent).
- No Figma node ids in comments — design links go in the MR 相关链接. No comments in CSS/SCSS at all (stylelint `comment-pattern`); to bypass a stylelint rule use only `stylelint-disable-next-line`.
- Colors from `@/styles/const.scss` (`$black_title`, `$white`, …); only the changed/new lines. Don't re-implement antd theme colors: check `packages/ant-design-dtinsight-theme/theme/dt-theme/const.scss` first and only add spacing (lint `dt-correct/use-theme-var`, new lines only, #FFF/#000 exempt).
- Icons: look in the latest `@dtinsight/react-icons` before adding any svg/png (`dt-correct/no-local-asset-import`).
- Icon button next to text: button `line-height: 0`, `.dtstack-icon` / `svg` `display: block` — otherwise the glyph sits ~2px high.
- Delete classes that have no styles. Prettier is `ko prettier` (`dtis fmt`), never `node_modules` prettier defaults (a stray run reformatted 700+ lines once).
- Do not silence eslint warnings — only-warn rules (e.g. `react-hooks/exhaustive-deps` in the ko config) are ignored, not disabled (`dt-correct/no-warn-disable`).

## Simplicity

- Inline one-off shallow helpers; extract only for repeated, stable semantics. Use values already in scope instead of re-deriving with fallbacks.
- Animation timing can live in one `TIMING` object at the top of the file (Shane 2026-10-27, MR !14279); one-off offsets stay inline with no explanatory comment.
- **收敛优先于完备**: don't expand the diff with unrequested tests, coverage, helpers or refactors. The canonical counterexample is ZenTao 161496 (data-source version shouldn't default to the first entry): the first attempt rewrote the `sqlType` sessionStorage shape, added a `haveVersion` derivation and a ref — Shane: 「为什么这么多，必选不就好了」; the accepted version just makes the version field required ([[dt-insight-datasource-add-source]]).

## i18n

- Write Chinese directly in source; never hand-edit `locales/**` for new/changed text.
- Flow: source Chinese → `fnm exec --using 18 pnpm extract` at the repo root → translate only the newly added entries in en-US → `pnpm extract check` passes. Reviewers treat any new `locales/**` field as a hard violation, even if extract check passes.
- Reference keys by full path `I18N.a.b.X`; assigning a group to a variable defeats extract:clear and the keys get deleted as dead. Deleting genuinely unreferenced keys by hand is allowed.
- Process SSOT: `.agents/skills/dt-insight-locale-fix/SKILL.md`.

## Bug fix approach

- Ask **why the existing logic missed** before adding logic: unsaved-guard / permission / validation patterns usually already exist and fail due to path differences, mismatched primary keys, or state written too late.
- Compare against a working sibling path (multi-version vs multi-instance, list vs detail) — align when the identity key enters state and whether the check reads form or state.
- Reuse the domain's existing invalid/unsaved signal instead of inventing a second.
- Minimal loop: one guard at the user action entry (test connection, submit, delete) is enough; don't "improve" the whole comparison framework.
- Explicit whitelists for special cases; confirm sibling types aren't broken.
- For bug fixes, publish/low-version migration boundaries follow git-workflow「Bug 人测闸门」.

## Module layout / misc

- Business dirs camelCase, component dirs are nouns (`defaultConfirmContent/` not `setDefault…`), components PascalCase, page entry `index.tsx`. Page/modal API calls go in a module `hooks/useXxx` (copy the neighbor page); components consume `loading` / `data` / `mutate`.
- Data transformation: spread reuse for identical shapes; contract types in the api layer; handle defaults once; normalize at the boundary.
- No hardcoded string literals for comparisons (types, statuses, event names) — reuse enums/constants (`dt-correct/no-hardcoded-compare`, `typeof` and `event.key` exempt).
- Unfinished work needs a ticket in `.scratch/<feature>/issues/`; `// TODO` alone is not delivery.
- One package per commit, scope = the package actually changed (`apps/console` + `packages/dt-common` → two commits).
- This project **does not write unit tests**; deleting existing tests needs explicit user approval. Always run `dtis ready` before claiming "done" or sending a Plannotator page.
- UI changes must be visually verified before delivery: measure against the design on the real page (DOM/screenshot), never ship on typecheck alone.

Related: [[dt-insight-workflow-conventions]] (dtis / acceptance gates), [[dt-insight-frontend-conventions]] (earlier summary of the same SSOT), [[dt-insight-datasource-add-source]] (the 161496 worked example), [[zentao-cli]].
