// tests/helpers/assertions.mjs
//
// Minimal, dependency-free test harness. No Jest/Vitest/Mocha — this project
// has no build step and no existing test framework (see AGENTS.md), so this
// stays in the same "plain Node script" spirit as the original
// scripts/verify-bullethell-fix.mjs, generalized into something every test
// file in tests/ can share.
//
// Design goals (see tests/README.md for the full rationale):
//  - Real implementation only. No mocking of game logic.
//  - AI-readable failures: every FAIL states WHAT FAILED / EXPECTED / ACTUAL
//    and, where we can infer one, a LIKELY AREA to look at.
//  - Three severities: PASS, WARN, FAIL. Only FAIL affects the exit code.

/** Thrown by assert* helpers. Carries structured info for the reporter. */
export class AssertionFailure extends Error {
  constructor(message, { expected, actual, likely } = {}) {
    super(message);
    this.name = 'AssertionFailure';
    this.expected = expected;
    this.actual = actual;
    this.likely = likely;
  }
}

/** Marker return value for a test that should be reported as WARN, not FAIL. */
export function warn(message) {
  return { __warn: true, message };
}

export function assert(cond, message, extra = {}) {
  if (!cond) throw new AssertionFailure(message, extra);
}

export function assertEqual(actual, expected, message, extra = {}) {
  if (actual !== expected) {
    throw new AssertionFailure(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      { expected, actual, ...extra }
    );
  }
}

export function assertDeepEqual(actual, expected, message, extra = {}) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new AssertionFailure(message || `Expected ${e}, got ${a}`, { expected, actual, ...extra });
  }
}

export function assertClose(actual, expected, tolerance, message, extra = {}) {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    throw new AssertionFailure(
      message || `Expected ${actual} to be within ${tolerance} of ${expected}`,
      { expected: `${expected} +/- ${tolerance}`, actual, ...extra }
    );
  }
}

export function assertInRange(actual, min, max, message, extra = {}) {
  if (!(actual >= min && actual <= max)) {
    throw new AssertionFailure(
      message || `Expected ${actual} to be within [${min}, ${max}]`,
      { expected: `[${min}, ${max}]`, actual, ...extra }
    );
  }
}

export function assertNoNaN(value, label, extra = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new AssertionFailure(`${label} is NaN`, { expected: 'a finite number', actual: value, ...extra });
  }
  if (!Number.isFinite(value)) {
    throw new AssertionFailure(`${label} is not finite (Infinity)`, { expected: 'a finite number', actual: value, ...extra });
  }
}

/**
 * A named group of tests. Each test() call is evaluated immediately (this is
 * a plain runner, not a deferred/async framework) and recorded as
 * PASS / WARN / FAIL.
 */
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  /** Run `fn`. If it throws AssertionFailure -> FAIL. If it returns warn(...) -> WARN. Anything else -> PASS. */
  test(name, fn) {
    const start = Date.now();
    try {
      const res = fn();
      const ms = Date.now() - start;
      if (res && res.__warn) {
        this.results.push({ name, status: 'WARN', message: res.message, ms });
      } else {
        this.results.push({ name, status: 'PASS', ms });
      }
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof AssertionFailure) {
        this.results.push({
          name,
          status: 'FAIL',
          message: err.message,
          expected: err.expected,
          actual: err.actual,
          likely: err.likely,
          ms,
        });
      } else {
        // A non-assertion exception (TypeError, etc.) is still a FAIL — it
        // usually means the shipped code itself threw, which is exactly the
        // kind of regression this suite exists to catch.
        this.results.push({
          name,
          status: 'FAIL',
          message: `Unexpected exception: ${err.message}`,
          actual: err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err),
          ms,
        });
      }
    }
  }

  /** Like test(), but for an async fn. */
  async testAsync(name, fn) {
    const start = Date.now();
    try {
      const res = await fn();
      const ms = Date.now() - start;
      if (res && res.__warn) {
        this.results.push({ name, status: 'WARN', message: res.message, ms });
      } else {
        this.results.push({ name, status: 'PASS', ms });
      }
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof AssertionFailure) {
        this.results.push({
          name,
          status: 'FAIL',
          message: err.message,
          expected: err.expected,
          actual: err.actual,
          likely: err.likely,
          ms,
        });
      } else {
        this.results.push({
          name,
          status: 'FAIL',
          message: `Unexpected exception: ${err.message}`,
          actual: err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err),
          ms,
        });
      }
    }
  }
}

const STATUS_MARK = { PASS: '\u2713', FAIL: '\u2717', WARN: '\u26A0' };

/** Prints one suite in the AI-friendly format and returns {pass,fail,warn} counts. */
export function printSuite(suite) {
  console.log(`\n[${suite.name}]`);
  let pass = 0, fail = 0, warnCount = 0;
  for (const r of suite.results) {
    console.log(`${STATUS_MARK[r.status]} ${r.status} - ${r.name}`);
    if (r.status === 'FAIL') {
      fail++;
      console.log(`    WHAT FAILED: ${r.name}`);
      if (r.expected !== undefined) console.log(`    EXPECTED:    ${stringify(r.expected)}`);
      if (r.actual !== undefined) console.log(`    ACTUAL:      ${stringify(r.actual)}`);
      console.log(`    MESSAGE:     ${r.message}`);
      if (r.likely) console.log(`    LIKELY AREA: ${r.likely}`);
    } else if (r.status === 'WARN') {
      warnCount++;
      console.log(`    ${r.message}`);
    } else {
      pass++;
    }
  }
  return { pass, fail, warn: warnCount };
}

function stringify(v) {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

/**
 * Runs an array of TestSuite instances (or thunks returning one/an array),
 * prints the full AI-formatted report, and returns the process exit code.
 */
export function runSuites(suites, { title = 'WAVE DODGE AI TEST SUITE' } = {}) {
  console.log('\u2550'.repeat(40));
  console.log(` ${title}`);
  console.log('\u2550'.repeat(40));

  let totalPass = 0, totalFail = 0, totalWarn = 0;
  for (const suite of suites) {
    const { pass, fail, warn: warnCount } = printSuite(suite);
    totalPass += pass;
    totalFail += fail;
    totalWarn += warnCount;
  }

  console.log('\n' + '\u2500'.repeat(40));
  console.log(`PASS: ${totalPass}`);
  console.log(`FAIL: ${totalFail}`);
  console.log(`WARN: ${totalWarn}`);
  console.log('\u2500'.repeat(40));

  return { totalPass, totalFail, totalWarn, exitCode: totalFail > 0 ? 1 : 0 };
}
