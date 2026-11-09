---
name: dingtalk-ears-product-backlog-and-people
description: Open requests and who is asking for what in the dingtalk-ears message stream (skin/theming, timestamps, multi-group support, repo access), plus the UED group's antd+rc 7.0 Component Development Agent rollout. Read to answer follow-up messages without re-deriving context.
metadata: consolidated from DingTalk inbox/groups on 2026-10-29; recheck before treating as current
---

# dingtalk-ears requests and people

All timestamps 2026-10-29 (Asia/Shanghai). `Shane` is the user; the single watched group is `UED`. State recorded as of the last message in the stream (17:44) — nothing was confirmed complete.

## People

| Person | Channel | Role in the stream |
| --- | --- | --- |
| 贝儿 | direct | Main reviewer/stakeholder: PR, UI feedback, theming, repo access, multi-group question |
| 长路 | direct | Wants a full date-time timestamp added; sent a screenshot |
| 文静 | direct (+ 日历助手 bot) | Scheduling 「灵瞳前端性能优化」, wants 知章✨ consulted |
| 知章✨ | direct/inferred | Being added to the performance-review meeting |
| 霜序💛 | UED group | Posts the team's tooling announcements |
| 琉易 | direct | Social only ("来吃东西") — no work item |
| 日历助手 | direct | Calendar bot, `dingtalk://dingtalkclient/page/calendar_detail?uniqueId=...` links |

## Open requests

**Skin / theming (贝儿, 17:29:28 – 17:34:48).** The UI is entirely white and therefore hard to distinguish from the surrounding Codex interface — that, not layout, is the complaint: `嗯嗯 你这个布局会好看点， 只是 都是白色的我 在 codex 里面 不是很区分`, with the suggestion `要不支持换肤下` (support skin switching) and a note that the current theme `是不是就长得很 codex 风格`. `没事啊 布局没关系的， 就是 里面的 indexhtml 把` points at the `index.html` (i.e. `backend/static/`) as the place to change. Deadline request: `你看你啥时候 把布局和皮肤上一下`. Both screenshots she sent were never downloaded, so the visual delta is unverified.

**Timestamp display (长路, 17:06:22 – 17:06:33).** An image plus `这个是不是可以加一个时间` and `年月日时分` — wants a full year-month-day-hour-minute time shown somewhere in that screenshot. The location is unknown because the image was never read; it needs `dws chat message download-media`.

**PR (贝儿, 17:01:03).** Bare `提pr` after `可以啊`; project, branch and diff scope unstated.

**Repo access + issue (贝儿, 17:41:46 → 17:44:34).** She offered `我把你拉到 repo 里面，给你指派一个 issue`, got `可以`, then asked `github 名字给我一下来着` / `叫啥` — the GitHub username was never supplied in the stream, so this is blocked on the user until answered.

**Multi-group support (贝儿, 17:35:12 – 17:41:21).** `而且后面 是支持 可以添加关注 钉钉群的` is future work; the present limitation is `现在只是 一个 UED` and `仅支持一个群 ，数据结构里面` — the data structure holds one watched group, so following several DingTalk groups needs a schema change.

**Performance-review meeting (文静, 17:40:14 – 17:43:06).** 日历助手 reported 文静 added 知章✨ to 「灵瞳前端性能优化」 (uniqueId `ZGlhMndZWTl3bnRWcEU1cE1reElBdz09`); 文静 asked to pull 知章 in and check her availability. No meeting time was ever given. Her `这个设计到后端要停下么` followed by `听下么` reads as "should the backend listen in", not stop-work; the later `OK` has no identifiable referent.

## UED group announcement (霜序💛, 17:36:31, @所有人)

Component Development Agent rollout: `codex` local plugin, version **0.1.2**, installed locally per README; a Multica agent of the same name already exists. It supports the **antd+rc upgrade, target version 7.0**; each sub-product owner creates their own RC-upgrade story and ccs PD. Asset-migration tasks and rough workflow are in Multica. The notice warns that the task scans whole projects several times and is resource-heavy, so pick a general agent. Reference links: upgrade doc `https://dtstack.yuque.com/rd-center/tqk74v/xerr0t9ze200nslh`, story example `http://zenpms.dtstack.cn/zentao/story-view-16609.html`, migration board `http://172.16.122.147:3000/qianduan/issues/UED-112`. Whether Shane owns an affected sub-product is unresolved.

Delivery contract for answering these batches: [[dingtalk-ears-overview-task]]. Service commands and code boundaries: [[dingtalk-ears-run-and-service]].
