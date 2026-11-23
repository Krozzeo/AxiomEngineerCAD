# Selective development verification

Owner-authorized process improvement, November 2026. This is development tooling,
not a CAD milestone, product panel, new native format or new product version.

## Start small

Run `npm run verify -- --list` for available areas and independently runnable UI
scenarios. Prefer `--plan` first: it describes the affected scope, risk, short
reading list and exact commands without launching a test.

```sh
npm run verify -- --plan --base HEAD~1
npm run verify -- --plan --file app/project.css
npm run verify -- --area assembly
npm run verify -- --suite browser:mates-motion --hardware
npm run verify -- --suite native:tests/e4-m3-motion.test.mjs --case Between
```

No selector means working-tree changes relative to HEAD, including staged and
untracked files. `--base <commit-or-ref>` also includes committed changes since
that base. `--file` is an explicit hypothetical or observed impact input. Repeated
`--area`/`--suite` options and comma-separated lists form a union; duplicate suites
run once. A direct test edit selects that test. Changes to imported helpers or
unmapped runtime code conservatively recommend/run the complete local commands.
Review the plan: a path map helps scope work; it cannot prove absence of effects.

`scripts/verification-map.mjs` is the maintained impact map. Add a rule when a new
subsystem appears. Shared code changes require all applicable areas. Never
classify an unknown runtime file as documentation merely to avoid a check.

| Area | Principal coverage |
| --- | --- |
| tooling | Planner, runner options, catalogue and evidence contracts |
| appearance | Representative visual contexts; no geometry or exchange tests |
| layout | Docking, Project, tabs and Workbench |
| selection | Model/tree picks, operations and sketch contexts |
| assembly | Spatial solver, components, M3 motion and retained M2 mates |
| sketch | Geometry, constraints, dragging, external references and recovery |
| parameters | Expressions, units, bindings and dependency impact |
| features | Extrude/revolve/reference/finishing construction and history |
| exchange | STEP, native exchange and production material properties |
| persistence | Documents, hierarchy, identities and retained versions |
| rendering | Native proof, picks, renderer recovery and previews |
| drawings | Drawing/proof and related native contracts |
| platform | Lifecycle, sessions, authorization and startup |
| review | Review/transaction domain contracts and Workbench integration |

## Reuse scenarios instead of reconstructing a walkthrough

`tests/browser-scenarios.mjs` declares existing assertion functions and the exact
demo fixtures they need. `tests/browser-focused.mjs` starts a real temporary
Platform, seeds only those fixtures and invokes those functions. It never changes
the production Load Demos catalogue. The complete browser suite uses the original
eleven construction scenarios in order, followed by the registered M4 scenario, with every assertion intact.
Other historical full-suite paths remain present.

The focused runner defaults to explicitly labelled software WebGPU. `--hardware`
requests actual Chrome and does not force a software adapter. On Windows it uses
the installed Chrome path; `ENGINEER_CHROME` can specify another executable.
Hardware requested is not hardware proof: inspect the scenario's actual adapter
classification. A case needing physical GPU acceptance must retain that evidence.
Browser tests need Playwright/Chromium installed. Full PDF/STEP commands also need
the existing independent QA Python dependencies; installation remains the existing
CI/environment setup, not repeated for each test.

## Read the summary, then the failing evidence

Each run writes `.axiom/verification/<run>/report.json`, one full log per suite and
separate evidence directories. `.axiom/verification/latest.json` points to the
last completed report. Reports record commands, selected scope/reasons, exact
source fingerprint, commit, runtime/OS, durations, native test counts and log sizes.
Console output contains one line per suite and a bounded failure excerpt. UI
reports retain the stage and screenshots. Inspect only the failing suite first.

The default stops on the first failure and explicitly marks remaining suites
`not-run`. `--keep-going` is available for independent diagnosis. It does not turn
a partial result into acceptance. A native `--case` filter matching no passing
test fails rather than reporting a misleading success.

```sh
npm run verify -- --rerun-failed .axiom/verification/<run>/report.json
npm run verify:history
```

A retry executes only failed focused suites, preserving a native case filter and
hardware request. Passed/not-run suites are not silently credited to the retry.
Full/context/independent-oracle failures require an explicit corresponding run.
There is **no automatic success cache**: these reports do not justify skipping a
changed or cross-platform release gate. Fingerprints detect source edits during
a run; such a run cannot be marked passed.

History reports measured suite time, repeated executions, failures and log bytes.
Token usage stays `null` unless a real provider measurement is available. Never
translate CPU time or log size into claimed AI tokens saved. Compare like scopes
and environments when establishing the first real before/after baseline.

## Development versus delivery

Use affected checks after each coherent implementation block. Add a small
regression reproducer for a discovered defect; do not replay the whole product to
diagnose it. Establish initial tab, mode, fixture and presented revision explicitly.
Keep unrelated minor issues in the backlog; document preservation, invalid native
geometry and broken identity/authorization remain blocking for an affected release.

`npm run verify -- --full` runs the existing complete local native/browser,
independent PDF/STEP and performance commands. It cannot be narrowed by `--case`.
It remains **local evidence**, not Windows/Linux CI or installed-package evidence.
The existing trusted `check.yml` and immutable publication verifier are unchanged.
Freeze source before milestone acceptance; avoid duplicating full local and CI
runs without a concrete environment/failure reason. Repeat affected checks during
development, complete acceptance at delivery, and the installed critical path
selected by impact. Never relabel a focused result as full acceptance.

## Initial implementation evidence

The first local run of the full native selection passed386 tests, including seven
new runner/catalogue contracts. Isolated actual Chrome/NVIDIA runs passed the
M3 workflow (50.4s), startup recovery (4.7s) and historical operation UX (42.0s).
Only the declared fixture was prepared per UI scenario. These are measured suite
wall times from this machine, not a before/after or token-savings claim. The
empty-name-filter negative run failed as intended; retry retained that filter.

Node24 reports a passing file wrapper when a name filter matches no test. The
runner therefore records actual per-file test summaries using a small reporter,
rejects zero real passing cases, and uses per-file failures to retry just those
files while preserving Node's normal file concurrency. Existing timeouts and
assertions are unchanged. Full logs remain local under `.axiom/verification/`.
