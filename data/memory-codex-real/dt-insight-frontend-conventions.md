---
name: dt-insight-frontend-conventions
description: Frontend coding conventions for the dt-insight console (validation via Form.Item rules, minimal-diff discipline, i18n extract, comments/style/lint gates) distilled from docs/agents/coding-standards.md and the 161496 review.
metadata: SSOT docs/agents/coding-standards.md, observed 2026-11-01
---

# dt-insight frontend conventions

SSOT is `docs/agents/coding-standards.md` in the repo (read it before editing or reviewing; AGENTS.override.md only points at it). Highlights that decide reviews:

## Validation

- Field required / format checks go into `Form.Item` `rules`, submitted with `form.validateFields()`; errors render under the field. Do **not** show `message.error(...)` and `return` from the submit handler. If the page has no Form, wrap just that field in one.
- Canonical counter-example: bug 161496 first version wrote `if (!version) { message.error(...); return; }` inside 「下一步」; Shane: 「为什么不作为表单下面的校验，要用 message 提示呢」. Lint `dt-correct/no-message-validation` exists (worktree `chore/correct_20261030`, new lines only; API `code`/`success` checks and table-selection prompts are exempt with a reason).

## Diff discipline (收敛优先于完备)

- Do not widen the diff beyond the request: no extra tests, abstractions or state reshaping unless asked. 161496 again: first version restructured the `sessionStorage` `sqlType` shape, added a `haveVersion` derivation and a ref; final version = version becomes a required field.
- Fix the root cause where the bad value enters; consume-side guards for "theoretically missing" data are rejected. Data the source guarantees is not null-checked again.
- No speculative fallbacks: no default timeouts/insurance timers, no guessing field names, no branching on `message` substrings, no frontend business defaults for contract fields. Missing/ambiguous contract → ask the backend rather than hard-coding heuristics.
- Prefer reusing an existing domain signal (unsaved/validity) over inventing a second judgment; whitelist special cases explicitly.

## i18n

- Write Chinese literals in source; never hand-edit `locales/**`. Flow: `fnm exec --using 18 pnpm extract` → translate only this round's new entries in en-US → `pnpm extract check`.
- Reference keys by full path `I18N.a.b.X`; assigning a group to a variable makes `extract:clear` drop the keys.

## Comments / styles

- Non-obvious only; no restating logic, no change-log comments, no Figma node numbers. CSS/SCSS: no comments at all; a rule can only be bypassed with `stylelint-disable-next-line`.
- Colors from `@/styles/const.scss` variables (`$black_title`, `$white`); icons from `@dtinsight/react-icons` before adding any local svg/png.
- Prettier via `dtis fmt`, never `node_modules` prettier; leave pre-existing formatting alone.

## React / verification

- Function components; avoid `useCallback` and gratuitous `useEffect` (compute from props/state, use `key` remount instead of reset effects); `scrollIntoView` instead of manual `scrollTop`; `classNames()` instead of string math.
- Before handover run `dtis ready` (prettier/eslint/stylelint/types with the dt-correct overlay). Any user-visible UI change must be visually verified on the running page (DOM measurement / screenshot), not just typechecked. This repo does not write unit tests; deleting existing tests needs an explicit request.
- One package per commit, scope follows the package (`apps/console` vs `packages/dt-common` split into two commits); commit-msg scope lint is not yet enforced.

Related: [[dt-insight-project-workflow]], [[datasource-center-add-source-flow]]
