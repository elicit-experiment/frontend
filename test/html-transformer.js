// Preserve templates for tests that render components; do not replace them with empty mocks.
module.exports = {
  process(source) {
    return { code: `module.exports = ${JSON.stringify(source)};` };
  },
};
