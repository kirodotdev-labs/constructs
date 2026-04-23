# Agent Notes

## Pre-push checklist

Before pushing changes, run the full CI pipeline locally to avoid PR failures:

```bash
npm run build && npm run lint && npm run format:check && npm test
```

If `format:check` fails, fix with `npm run format` then re-run the check.
