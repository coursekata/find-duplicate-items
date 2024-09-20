# @coursekata/find-duplicate-items

[![GitHub Super-Linter](https://github.com/coursekata/find-duplicate-items/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/coursekata/find-duplicate-items/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/coursekata/find-duplicate-items/actions/workflows/check-dist.yml/badge.svg)](https://github.com/coursekata/find-duplicate-items/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/coursekata/find-duplicate-items/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/coursekata/find-duplicate-items/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action searches a directory for CourseKata book markdown files. Within
those markdown files, it searches for any interactive items that are duplicated
within the course, as these will trigger a build error. The action will report
the location of the duplicates and the IDs of the duplicated items, if any are
found.

## Inputs

```yaml
# https://github.com/coursekata/find-duplicate-items
- uses: coursekata/find-duplicate-items@v2
  with:
    # The globs to use to build search paths. Use a newline to separate each glob.
    # Optional. Default is '.'
    include: '.'

    # Indicates whether to follow symbolic links when searching with the globs.
    # Optional. Default is true
    follow-symbolic-links: true

    # Whether the action should fail (versus warn) if any duplicates are found.
    # Optional. Default is true
    fail-on-duplicates: true
```

## Outputs

<!-- prettier-ignore -->
| name | description | example |
| - | - | - |
| `duplicates` | A JSON object as a string, where the keys are the IDs of the duplicate items and the values indicate where the items can be found (file and line number). If none are found, an empty object is returned: `{}` | `'{"duplicated-id": [{"file": "./path/to/file", "line": 16}, {"file": "./path/to/other/file", "line": 14}]}'` |

## Usage

### Basic

This example will search the entire repository for duplicate items and stop the
workflow if it finds any:

```yaml
steps:
  # https://github.com/actions/checkout
  - uses: actions/checkout@v4

  # https://github.com/coursekata/find-duplicate-items
  - name: Find duplicate items
    uses: coursekata/find-duplicate-items@v2
```

### Search only specific directories

This example only searches the subdirectories `a/` and `b/`:

```yaml
steps:
  # https://github.com/actions/checkout
  - uses: actions/checkout@v4

  # https://github.com/coursekata/find-duplicate-items
  - name: Find duplicate items in a/ and b/
    uses: coursekata/find-duplicate-items@v2
    with:
      include: |
        ./a
        ./b
```

### Using the output

In this example, the errors and warnings are piped into another script using
[`actions/github-script`](https://github.com/actions/github-script):

```yaml
steps:
  # https://github.com/actions/checkout
  - uses: actions/checkout@v4

  # https://github.com/coursekata/find-duplicate-items
  - name: Find duplicate items
    id: find-duplicate-items
    uses: coursekata/find-duplicate-items@v2
    continue-on-error: true

  # https://github.com/actions/github-script
  - name: 'Use the errors in another step'
    uses: actions/github-script@v7
    env:
      ERRORS: ${{ steps.find-duplicate-items.outputs.duplicates }}
    with:
      script: |
        // assert that there are no duplicates
        const assert_equal = (value) => require("node:assert/strict").deepEqual(value, true)
        assert_equal(Object.keys(JSON.parse(process.env['DUPLICATES'])).length !== 0)
```
