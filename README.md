# Get PR/push Files

Get all added/modified/removed/renamed files in a pull request or push's commits.
You can choose to get all files, only added files, only modified files, only removed files or only renamed files.
These outputs are available via the `steps` output context.
The `steps` output context exposes the output names `all`, `added`, `modified`, `removed` and `renamed`.

# Usage

See [action.yml](action.yml)

```yaml
- uses: ruslandulina/compare-basehead-commits@v1
  with:
    # Format of the steps output context.
    # Can be 'space-delimited', 'csv', or 'json'.
    # Default: 'space-delimited'
    format: ''
```
