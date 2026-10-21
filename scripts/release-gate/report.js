// Release-gate evidence and verdict computation.
//
// A run has two phases (`local`, `deployed`). Only checks in the selected
// phases count towards the verdict. Acceptance requires every selected
// `core: true` check to PASS: a failure rejects the release, and a skip of a
// core check also rejects it because the required evidence is missing. Skips
// of non-core checks (email delivery, optional tooling) are recorded and shown
// but do not block acceptance.
const STATUS = {
  PASS: "PASS",
  FAIL: "FAIL",
  SKIP: "SKIP",
};

const VERDICT = {
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  NOT_RUN: "not-run",
};

function createReport({
  baseUrl,
  expectedSiteUrl,
  commit,
  startedAt = new Date().toISOString(),
}) {
  return {
    startedAt,
    finishedAt: null,
    candidate: { commit, baseUrl },
    expectedSiteUrl,
    results: [],
  };
}

function addResult(report, result) {
  report.results.push({
    id: result.id,
    phase: result.phase,
    core: Boolean(result.core),
    status: result.status,
    detail: result.detail ?? "",
  });
}

function summarize(results) {
  return {
    passed: results.filter((result) => result.status === STATUS.PASS).length,
    failed: results.filter((result) => result.status === STATUS.FAIL).length,
    skipped: results.filter((result) => result.status === STATUS.SKIP).length,
  };
}

function computeVerdict(results, phases) {
  const selected = results.filter((result) => phases.includes(result.phase));
  if (selected.length === 0) {
    return {
      verdict: VERDICT.NOT_RUN,
      reason: "no checks were selected for this run",
    };
  }

  const failed = selected.filter((result) => result.status === STATUS.FAIL);
  if (failed.length > 0) {
    return {
      verdict: VERDICT.REJECTED,
      reason: `${failed.length} check(s) failed: ${failed
        .map((result) => result.id)
        .join(", ")}`,
    };
  }

  const skippedCore = selected.filter(
    (result) => result.core && result.status === STATUS.SKIP,
  );
  if (skippedCore.length > 0) {
    return {
      verdict: VERDICT.REJECTED,
      reason: `required evidence was skipped: ${skippedCore
        .map((result) => result.id)
        .join(", ")}`,
    };
  }

  const passed = selected.filter((result) => result.status === STATUS.PASS);
  if (passed.length === 0) {
    return {
      verdict: VERDICT.NOT_RUN,
      reason: "no check produced evidence",
    };
  }

  return {
    verdict: VERDICT.ACCEPTED,
    reason: `${passed.length} required check(s) passed`,
  };
}

function toJson(report, verdict, options = {}) {
  return {
    ...report,
    command: options.command ?? "",
    phases: options.phases ?? [],
    notes: options.notes ?? [],
    verdict: verdict.verdict,
    verdictReason: verdict.reason,
    summary: summarize(report.results),
  };
}

function formatResults(results, phases) {
  const width = results.reduce(
    (max, result) => Math.max(max, result.id.length),
    0,
  );
  return results.map((result) => {
    const selected = phases.includes(result.phase);
    const core = result.core ? "required" : "optional";
    const scope = selected ? core : `not selected in this run`;
    const detail = result.detail ? `  ${result.detail}` : "";
    return `${result.status.padEnd(4)}  ${result.id.padEnd(width)}  [${scope}]${detail}`;
  });
}

module.exports = {
  STATUS,
  VERDICT,
  addResult,
  computeVerdict,
  createReport,
  formatResults,
  summarize,
  toJson,
};
