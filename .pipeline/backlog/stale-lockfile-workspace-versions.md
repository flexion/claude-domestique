# Stale workspace versions in package-lock.json

Found 2026-11-01 during #205 review (jay F6).

On `main` (317b706), `package-lock.json` records old versions for five workspaces:
- comitatus: 0.14.1, actual 1.2.1 (2.0.0 after #205)
- mantra: 0.6.2, actual 0.11.1
- memento: 0.5.2, actual 0.6.0
- onus: 0.4.3, actual 0.5.1
- vernaculus: 0.2.0, actual 0.2.1

`scripts/bump-version.js` updates package.json, host manifests and marketplace.json, but not the lockfile. Running `npm run install:all` reconciles the versions as a side effect.

Options:
- Have bump-version.js also update `packages["<plugin>"].version` in the lockfile.
- Or run `npm install --package-lock-only` in CI and fail when the lockfile is dirty.

#205 deliberately left the lockfile unchanged, to keep that change scoped.
