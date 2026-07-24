# Contributing

## Commit messages

This repo follows [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description
```

- **type**: `feat`, `fix`, `docs`, `chore`, `test`, `debug`
- **scope**: the app or area touched — `admin`, `api`, `storefront`, `deploy`, `plan`, `spec`, `audit`. Omit the scope only for changes that don't target one area (e.g. `chore: rebrand admin title casing`).
- **description**: imperative mood, lowercase, no trailing period (e.g. `add SPA rewrite`, not `Added SPA rewrite.`)

Keep the message to a single line — no body, no footer. Put any extra detail in the PR description instead.

Examples from this repo's history:
```
fix(admin): correct outputDirectory and buildCommand in vercel.json
feat(api): add StorageService for R2 uploads with sharp downscale
docs(plan): storefront responsive blocker fixes
chore: rebrand admin title casing and tidy gitignore rules
```
