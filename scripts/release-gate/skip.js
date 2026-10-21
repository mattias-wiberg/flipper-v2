// A check throws this to report SKIP with an operator note instead of a
// failure. Skips are never silent: the gate prints the note and, for required
// checks, rejects the release because the evidence is missing.
class SkipCheck extends Error {
  constructor(message) {
    super(message);
    this.name = "SkipCheck";
  }
}

function skip(message) {
  return new SkipCheck(message);
}

function isSkip(error) {
  return error instanceof SkipCheck;
}

module.exports = { SkipCheck, isSkip, skip };
