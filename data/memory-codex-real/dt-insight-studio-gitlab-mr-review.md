---
name: dt-insight-studio-gitlab-mr-review
description: Querying GitLab merge requests for dt-insight-studio on the self-managed gitlab.prod.dtstack.cn with glab (list/view/diff/approvals), the huaiju review-triage rule, and the recurring daily MR automation; read before running or debugging an MR review.
metadata: verified 2026-09-29 → 2026-11-03, glab v1.107.0
---

# GitLab MR review for dt-insight-studio

## Target and auth

- Host: `gitlab.prod.dtstack.cn` (self-managed). Project: `dt-insight-front/dt-insight-studio`, **project_id 1232**. Web URLs are `http://gitlab.prod.dtstack.cn/dt-insight-front/dt-insight-studio/-/merge_requests/<iid>` (MR `iid` 11617 for the standing item).
- The `glab` CLI is authenticated as `huaiju` for that host (token in `/Users/mac/Library/Application Support/glab-cli/config.yml`). `glab auth status` also reports `gitlab.com` as unauthenticated (401, no token) and therefore exits non-zero with "could not authenticate to one or more of the configured GitLab instances" — that is noise, not a blocker for the internal host.
- Shell commands in this setup are prefixed with `rtk` (see `~/.codex/RTK.md`); `rtk` occasionally prints `[rtk] No hook installed — run `rtk init -g`` on stderr.

## Commands that work

```bash
# open MRs where huaiju is a reviewer (default state: opened)
rtk glab mr list --repo https://gitlab.prod.dtstack.cn/dt-insight-front/dt-insight-studio \
  --reviewer huaiju --output json

# per-MR detail: adds draft/work_in_progress, head_pipeline, detailed_merge_status,
# latest_build_started_at/finished_at, diverged_commits_count, changes_count
rtk glab mr view <iid> --repo <URL> --output json

rtk glab mr diff <iid> --repo <URL>

# approvals — only through the raw API
rtk proxy glab api --hostname gitlab.prod.dtstack.cn \
  projects/1232/merge_requests/<iid>/approvals
```

- `glab mr view` has no approvals flag (its only flags are `--comments`, `--jq`, `--output`, `--page[r-page]`, `--repo`, `--resolved`, `--system-logs`, `--unresolved`, `--web`). Use the approvals endpoint; it returns `user_has_approved`, `user_can_approve`, `approved`, `approved_by[].user.username`.
- The `mr list` JSON is enough for title/author/updated_at/draft/web_url but **not** for pipeline or approval state — fetch `mr view` and the approvals endpoint for those.
- **`rtk glab api` is not a pass-through**: the wrapper accepts only `-R/--repo`, `-g/--group`, `--ultra-compact`, `--skip-env`, so `rtk glab api --hostname …` loses the host and fails with `Unauthenticated`. Use `rtk proxy glab api --hostname gitlab.prod.dtstack.cn …`.
- `--repo <full URL>` selects the host on its own; `GITLAB_HOST=gitlab.prod.dtstack.cn` is not needed for these calls. The local skill `~/.agents/skills/glab/SKILL.md` says to always set `GITLAB_HOST` and that "`--hostname` is not a valid flag on glab" — that is only true for `glab mr` subcommands; `glab api` does take `--hostname`, and it is the reliable way to hit the internal host.
- `glab mr list --reviewer <username>` first resolves the user via `GET /api/v4/users?per_page=30&username=huaiju`, so an outage surfaces as `Get ".../api/v4/users?...username=huaiju": EOF`, not as a project error.

## Triage rule (what counts as "needs review")

Pending = MR is open **and** reviewer includes `huaiju` **and** not Draft **and** `user_has_approved == false`. Draft MRs and MRs already approved by huaiju but still open go into a separate "暂不需 review" (no action needed) section. If the approvals call fails, mark approval unknown and say a human must confirm — never assume it needs review. Read-only: never comment, approve, merge, close or edit an MR.

## Failures seen

- 2026-10-11 and 2026-10-17 (both attempts that day): every call to `gitlab.prod.dtstack.cn` returned `EOF` (`mr list`, and the fallback `glab api --paginate 'projects/1232/merge_requests?state=opened&per_page=100'`). Service came back by 2026-10-19. Correct behaviour: report "could not check, no result inferred", do not reuse the previous day's list.
- Fallback when `--reviewer` resolution breaks: hit the project endpoint directly (`projects/1232/merge_requests?state=opened&per_page=100`) to distinguish a user-lookup failure from a full outage.

## Standing item

`!11617` "Draft: hotfix(console): defaultTenant not work when dispatch,#140149" (author `beier`, target `console/release_6.4.x` ← `console/hotfix_6.4.x_140149`) has been the only reviewer match since 2025-12-30: draft, pipeline 118202 `success`, `huaiju` has approved it, last updated 2026-01-05, `diverged_commits_count` 220, task checklist 1/12. It therefore never enters the pending list. Its diff makes `PortalLayout` subscribe to `state.tenantDetail` via `mapStateToProps` and run `checkTenant()` from a `useEffect` keyed on `props.tenantDetail?.defaultTenantInfo` instead of chaining it after `checkDefaultTenantInfo()`.

## The automation

Automation id `gitlab-mr-review`, name 每日 GitLab MR Review 汇总, heartbeat attached to the thread, `RRULE:FREQ=DAILY;BYHOUR=17;BYMINUTE=0` (17:00 Asia/Shanghai), ACTIVE. Its prompt encodes the commands above plus the triage rule and the read-only constraint; it was tightened on 2026-09-29 after the first run reported the already-approved Draft as if it were pending. See [[codex-app-automations]] for the tool shape and heartbeat reply format. MR-status facts are point-in-time and go stale; re-run the list before reporting.

Related: [[dt-insight-studio-agent-rules]] (coding/delivery rules for the same project).
