/**
 * Releases @luma-layered-ts/eslint-plugin and @luma-layered-ts/types with the same version.
 * types is published first (exec), so a failure there stops the release before eslint-plugin
 * is published or tagged. Both use npm trusted publishing (OIDC); each package needs a trusted
 * publisher for this workflow on npmjs.com.
 *
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        releaseRules: [
          { type: "major", release: "major" },
          { type: "minor", release: "minor" },
          { type: "patch", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "cd ../types && npm ci && npm version ${nextRelease.version} --no-git-tag-version --allow-same-version && npm run build",
        publishCmd: "cd ../types && npm publish --access public",
      },
    ],
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
};
