---
name: implement-spec-stack
description: "Extend /implement-spec for a GitHub spec with issue splitting, stacked pull requests, and three-level independent review and verification."
disable-model-invocation: true
---

# Implement Spec Stack

This is an extension of `/implement-spec`, not a second implementation recipe.
Read `.agents/skills/implement-spec/SKILL.md` before dispatching work and follow
its steps and guardrails. OpenCode does not merge skill files automatically;
that file is the base contract and this file contains only the additions and
overrides below.

The user supplies a parent GitHub issue URL or number. The parent issue is the
spec source for this run.

## Base contract and overrides

Keep all `/implement-spec` rules unless this skill explicitly overrides them:

- The parent issue is decomposed into a GitHub task graph before implementation.
- Implementers use dedicated worktrees, implement only their assigned ticket,
  run the normal implementation checks, and commit their work.
- The single-branch, single-PR outcome from `/implement-spec` is replaced by
  one branch and pull request per child ticket.
- The base merger step is replaced by orchestrator-owned `gh stack` branch
  operations. Workers never create pull requests or mutate shared stack state.
- The final review and full verification remain mandatory after the stack is
  integrated.

The main session is the orchestrator. It owns the task graph, frontier,
worktree and branch pointers, pull-request lifecycle, and compact reports. It
does not implement application code or paste child diffs and logs into its
context.

## Preflight

1. Read `AGENTS.md`, `CONTEXT.md` or `context/` when present, and
   `docs/agents/issue-tracker.md`.
2. Resolve the repository and default branch from GitHub and Git.
3. Verify `gh auth status` and `gh stack --help`. If `gh-stack` is unavailable,
   stop and report that it must be installed; do not fall back to ordinary PRs.
4. Read the parent issue and comments with the repository's issue-tracker
   workflow.
5. Verify the resolved OpenCode config has `subagent_depth >= 3` before
   dispatching workers. Level-3 gates are part of this skill's contract.
6. Inspect existing child issues, dependencies, pull requests, and completed
   work before changing anything.
7. Preserve user changes. If the checkout is dirty, perform branch operations
   only in dedicated worktrees and leave the orchestrator checkout unchanged.

## Issue splitting

Turn the parent issue into a complete child-ticket graph before implementation:

1. Keep existing direct child issues when they have clear scope, acceptance
   criteria, verification commands, and correct dependency edges. Never create
   duplicates for an existing ticket.
2. If the child set is missing or incomplete, split the parent into the
   smallest independently implementable tracer bullets. Each child must state
   its scope, acceptance criteria, expected verification, and parent pointer.
3. Publish missing children with `gh issue create`. Link them to the parent as
   native sub-issues when available; otherwise put `Part of #<parent>` at the
   top of each child and maintain the parent's task list.
4. Add native blocking edges using the repository issue-tracker instructions.
   If native dependencies are unavailable, put `Blocked by: #<n>` at the top
   of the child issue. Dependencies must describe real prerequisites, not merely
   the preferred implementation order.
5. Record every child URL and dependency edge, then recompute the unblocked
   frontier. GitHub issues and dependency edges are the source of truth after
   this point, not an informal checklist in the parent body.
6. Claim a ticket before dispatching its worker. A ticket is ready only when
   every open blocker is resolved and its scope and acceptance criteria are
   clear.

Run independent frontier tickets concurrently when their worktrees and stack
operations do not conflict. Serialize each dependency chain. Recompute the
frontier after every completed worker. Do not close the parent or alter scope
to make another ticket appear ready.

## Three-level quality gates

"Level" counts nested task delegation from the primary orchestrator. No level
may launch a fourth level:

- **Level 0, orchestrator:** splits issues, owns branches and PRs, dispatches
  workers, aggregates reports, and never edits application code.
- **Level 1, implementer:** works in the assigned worktree and stack branch,
  implements one ticket, commits it, and dispatches fresh gate coordinators.
- **Level 2, gate coordinators:** one review coordinator and one verification
  coordinator run independently and read-only. They aggregate the specialist
  results for the implementer.
- **Level 3, specialists:** review and verification specialists inspect the
  committed diff or run checks. They do not edit files or launch more agents.

For every completed Level-1 implementation:

1. Dispatch a fresh Level-2 review coordinator with the exact base ref, parent
   issue, ticket URL, acceptance criteria, and diff range. It runs `/code-review`;
   the Standards and Spec reviewers are Level-3 specialists.
2. Dispatch a fresh Level-2 verification coordinator separately. It launches
   Level-3 specialists for affected tests and for independent typecheck, lint,
   and relevant build checks. Specialists may run commands but do not fix code.
3. The Level-1 implementer fixes every review finding and verification failure,
   commits the fixes, and starts a fresh Level-2/Level-3 gate cycle. Never let
   a reviewer or verifier edit the implementation.
4. Keep communication pointer-based: pass issue URLs, refs, worktree paths,
   commands, and saved reports instead of copying diffs or logs.

Each worker returns only:

```text
STATUS: ready | blocked
TICKET: <issue URL>
BRANCH: <branch name>
WORKTREE: <absolute path>
COMMIT: <commit SHA>
REVIEW: pass | findings fixed | blocked
TESTS: <commands and concise results>
BLOCKER: <none or explanation>
```

## Stacked pull requests

The orchestrator owns the stack and pull-request lifecycle:

1. Initialize or adopt one `gh stack` per linear dependency chain. Use
   separate stacks for independent chains.
2. Create or assign one branch and dedicated worktree per child ticket in
   dependency order. Ensure each worker commit has the expected base.
3. Use `gh stack submit --auto` to push branches and create or update one
   draft PR per branch.
4. Link every PR to its child ticket and parent issue. A PR does not close the
   parent issue; do not close issues merely because a PR exists.
5. Mark a PR ready only after its Level-2/Level-3 review and verification gates
   pass.
6. When an ancestor changes, rebase descendants with `gh stack`, then rerun
   their complete quality-gate cycle before updating their PR state.
7. Do not merge PRs automatically. Do not create a duplicate PR when a ticket
   already has a valid one.

## Completion

A child ticket is complete only when its implementation is committed, its
independent Level-3 review has no unresolved findings, its verification passes,
and its PR is ready for review.

After every child is complete or explicitly blocked:

1. Run a fresh integrated Level-2 review and verification cycle over the full
   stack, including the full test suite and the repository's typecheck, lint,
   and build checks.
2. Fix all integrated findings before marking the affected PRs ready.
3. Clean up all implementation worktrees while preserving the stack branches.
4. Finish with the parent issue, each child ticket, branch, PR URL, review and
   verification result, and any remaining blocker.
