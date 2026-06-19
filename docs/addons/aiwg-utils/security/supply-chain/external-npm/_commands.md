# External NPM Audit Commands

These commands avoid executing untrusted lifecycle scripts during inspection.

## Lockfile And Manifest Context

```bash
node -p "require('./package-lock.json').packages['node_modules/<pkg>']"
node -p "require('./package.json').dependencies?.['<pkg>'] || require('./package.json').optionalDependencies?.['<pkg>'] || require('./package.json').peerDependencies?.['<pkg>'] || require('./package.json').devDependencies?.['<pkg>']"
```

## Registry Metadata

```bash
npm view '<pkg>@<version>' name version repository dist.signatures dist.integrity gitHead scripts dependencies optionalDependencies peerDependencies --json
npm pack '<pkg>@<version>' --ignore-scripts --dry-run
```

## Source Ref Checks

```bash
git ls-remote --tags '<repo-url>'
git clone --filter=blob:none --no-checkout '<repo-url>' /tmp/<pkg>-audit
git -C /tmp/<pkg>-audit checkout '<tag-or-gitHead>'
git -C /tmp/<pkg>-audit tag -v '<tag>'
```

## Lifecycle And Dependency Source Scans

```bash
node -p "require('/tmp/<pkg>-audit/package.json').scripts"
rg -n '"(prepare|prepack|prepublishOnly|preinstall|install|postinstall)"' /tmp/<pkg>-audit/package.json
rg -n '"(git\+|github:|file:|link:|workspace:|https?://)' /tmp/<pkg>-audit/package.json
```

## Repo Gates

```bash
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

Run installs, tests, or package scripts only in an isolated throwaway workspace after the metadata-only review is complete.
