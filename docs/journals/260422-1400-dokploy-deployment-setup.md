# Dokploy Deployment Setup

**Date:** 2026-04-22 14:00
**Severity:** Medium
**Component:** Infrastructure, CI/CD
**Status:** Resolved

## What Happened

Configured the project to deploy to Dokploy via GitLab (`code.vnggames.ai/khoitn/segment-builder.git`, SSH on port 2332). Added `serve` dependency and `start` script to `package.json` to support Nixpacks-based deployment.

## Technical Details

- Added `serve` to package.json dependencies
- Configured `start` script as entry point for Nixpacks
- Resolved three distinct issues:
  1. **Dokploy provider misconfiguration**: User had selected GitHub provider by default; switched to GitLab
  2. **Empty clone symptom**: Initial push to GitLab remote failed silently. Symptoms looked like Nixpacks only seeing `.git/` directory. Root cause: branch never reached remote
  3. **Unrelated histories merge**: GitLab auto-generated README conflicted with local commit history. Resolved via `git merge --allow-unrelated-histories`
- Set up GitLab webhook pointing to Dokploy deploy endpoint for auto-deploy on push
- Final push: commit `d64b21d`

## Why This Matters

Deployment automation is now functional. Future pushes to GitLab trigger immediate Dokploy build + deploy without manual intervention. The unrelated histories resolution ensures the repository history is clean going forward.

## Lessons Captured

1. Verify CI/CD provider selection in deployment tools matches actual git remote (GitHub vs GitLab are different endpoints)
2. Silent push failures can look like source code import problems — always verify remote branches exist
3. `git merge --allow-unrelated-histories` is safe for one-time repo initialization conflicts but should not be routine

## Next Steps

- Monitor first few automatic deployments to confirm webhook is firing correctly
- Document webhook URL and GitLab configuration in deployment runbook if one exists
