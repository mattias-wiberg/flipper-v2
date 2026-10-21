import {
  STATUS,
  VERDICT,
  addResult,
  computeVerdict,
  createReport,
  summarize,
} from "./report.js";

function reportWith(
  results: Array<{
    id: string;
    phase: string;
    core: boolean;
    status: string;
    detail?: string;
  }>,
) {
  const report = createReport({
    baseUrl: "https://beta.example.test",
    expectedSiteUrl: "https://beta.example.test",
    commit: "abc123",
  });
  for (const result of results) {
    addResult(report, result);
  }
  return report;
}

describe("release-gate verdict", () => {
  it("accepts a release when required checks pass and optional checks skip", () => {
    const report = reportWith([
      { id: "local.tests", phase: "local", core: true, status: STATUS.PASS },
      {
        id: "deployed.health",
        phase: "deployed",
        core: true,
        status: STATUS.PASS,
      },
      {
        id: "deployed.password-reset-email",
        phase: "deployed",
        core: false,
        status: STATUS.SKIP,
      },
    ]);

    expect(computeVerdict(report.results, ["local", "deployed"])).toEqual({
      verdict: VERDICT.ACCEPTED,
      reason: "2 required check(s) passed",
    });
  });

  it("rejects the release when any executed check fails", () => {
    const report = reportWith([
      {
        id: "deployed.health",
        phase: "deployed",
        core: true,
        status: STATUS.PASS,
      },
      {
        id: "deployed.golden-replay",
        phase: "deployed",
        core: true,
        status: STATUS.FAIL,
      },
    ]);

    const verdict = computeVerdict(report.results, ["deployed"]);
    expect(verdict.verdict).toBe(VERDICT.REJECTED);
    expect(verdict.reason).toContain("deployed.golden-replay");
  });

  it("rejects the release when required evidence is skipped", () => {
    const report = reportWith([
      {
        id: "deployed.health",
        phase: "deployed",
        core: true,
        status: STATUS.PASS,
      },
      {
        id: "deployed.auth-signin",
        phase: "deployed",
        core: true,
        status: STATUS.SKIP,
      },
    ]);

    const verdict = computeVerdict(report.results, ["deployed"]);
    expect(verdict.verdict).toBe(VERDICT.REJECTED);
    expect(verdict.reason).toContain("deployed.auth-signin");
  });

  it("ignores checks from phases that were not selected", () => {
    const report = reportWith([
      {
        id: "deployed.health",
        phase: "deployed",
        core: true,
        status: STATUS.PASS,
      },
      {
        id: "local.tests",
        phase: "local",
        core: true,
        status: STATUS.SKIP,
      },
    ]);

    expect(computeVerdict(report.results, ["deployed"]).verdict).toBe(
      VERDICT.ACCEPTED,
    );
  });

  it("reports a dry run as not-run instead of accepted", () => {
    const report = reportWith([
      {
        id: "deployed.health",
        phase: "deployed",
        core: false,
        status: STATUS.SKIP,
      },
      {
        id: "local.tests",
        phase: "local",
        core: false,
        status: STATUS.SKIP,
      },
    ]);

    expect(computeVerdict(report.results, []).verdict).toBe(VERDICT.NOT_RUN);
    expect(computeVerdict(report.results, ["deployed"]).verdict).toBe(
      VERDICT.NOT_RUN,
    );
  });

  it("counts outcomes for the compact report", () => {
    const report = reportWith([
      { id: "a", phase: "deployed", core: true, status: STATUS.PASS },
      { id: "b", phase: "deployed", core: true, status: STATUS.PASS },
      { id: "c", phase: "deployed", core: true, status: STATUS.FAIL },
      { id: "d", phase: "deployed", core: false, status: STATUS.SKIP },
    ]);

    expect(summarize(report.results)).toEqual({
      passed: 2,
      failed: 1,
      skipped: 1,
    });
  });
});
