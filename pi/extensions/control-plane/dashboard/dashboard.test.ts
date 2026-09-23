import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const appUrl = new URL("./app.tsx", import.meta.url)
const app = readFileSync(appUrl, "utf8")
const dock = readFileSync(
  new URL("./ControlPlaneDock.tsx", import.meta.url),
  "utf8",
)
const dockLayout = readFileSync(
  new URL("./dock-layout.ts", import.meta.url),
  "utf8",
)
const css = readFileSync(new URL("./app.css", import.meta.url), "utf8")
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8")
const browserRuntimeSources = [
  "../job-runtime.ts",
  "../job-presentation.ts",
  "../harness-protocol.ts",
  "../harness-research-protocol.ts",
  "../review-duty-profile.ts",
].map(path => readFileSync(new URL(path, import.meta.url), "utf8"))
const homeConfig = readFileSync(
  new URL("../../../../../home.nix", import.meta.url),
  "utf8",
)

test("dashboard uses Solid lifecycle primitives and validates API job state", () => {
  assert.match(app, /from "solid-js"/)
  assert.match(app, /createMemo/)
  assert.match(app, /createResource\(fetchSnapshot\)/)
  assert.match(app, /onMount/)
  assert.match(app, /onCleanup\(\(\) => clearInterval\(timer\)\)/)
  assert.match(app, /decodeStoredJob/)
  assert.match(app, /fetchJson\("\/v1\/agents"\)/)
  assert.match(app, /fetchJson\("\/v1\/backlog"\)/)
  assert.match(app, /decodeBacklog/)
  assert.match(app, /UNIFIED WORK/)
  assert.match(app, /Durable backlog/)
  assert.match(app, /implementationEvidence/)
  assert.match(app, /strong>\{onlineAgents\(\)\.length\}<\/strong>/)
  assert.match(app, /bridge-endpoint/)
  assert.match(
    app,
    /presence !== "bridge-endpoint" &&[\s\S]*?roles\.length > 0 \|\|[\s\S]*?status !== "pending"/,
  )
  assert.match(app, /inactive\s+or unverified sessions excluded/)
  assert.match(
    app,
    /unassigned runtimes and[\s\S]*?monitor-only bridge\s+endpoints[\s\S]*?excluded from the live-agent total/,
  )
  assert.match(app, /agent\.activities/)
  assert.match(app, /external harness/)
  assert.match(app, /#\{activity\.todoId\} \{activity\.text\}/)
  assert.match(app, /SUBSCRIPTION RUNWAY/)
  assert.match(app, /allowanceRunway/)
  assert.match(app, /usagePolicy/)
  assert.match(app, /autonomous budget/)
  assert.match(app, /observed ·/)
  assert.match(app, /allowanceTargetPolyline/)
  assert.match(app, /allowanceChartDomain/)
  assert.match(app, /allowanceChartSegments/)
  assert.match(app, /allowanceChartX/)
  assert.match(app, /reconstructChatGptSharedHistory/)
  assert.match(app, /usageHistory\(\)\?\.control\.pool/)
  assert.match(app, /activeCheckpoints/)
  assert.match(app, /selectedAllowanceCheckpoints/)
  assert.match(app, /decodeThrottleActivity/)
  assert.match(app, /provider roles throttled/)
  assert.match(app, /codexAllowancePolylines/)
  assert.match(app, /allowance-line codex/)
  assert.match(app, /allowance-point codex observed/)
  assert.match(app, /Allowance chart methodology/)
  assert.match(app, /pools are never merged/)
  assert.match(app, /allowance bump rebased/)
  assert.match(app, /ChatGPT shared weekly/)
  assert.match(app, /Codex app-server weekly/)
  assert.match(app, /Historical samples only/)
  assert.match(
    app,
    /Last verified \$\{relativeTime\(checkpoint\.capturedAt, now\)\}/,
  )
  assert.match(app, /MAX_ALLOWANCE_CHECKPOINT_AGE_MS/)
  assert.doesNotMatch(
    app,
    /inferredAllowanceBailouts|Recorded allowance increase|Bailout \+/,
  )
  assert.match(app, /Reset 100 · est\./)
  assert.match(app, /Zero · est\./)
  assert.match(app, /Bailout 100 · reported/)
  assert.match(app, /allowanceEventDetail/)
  assert.match(app, /<line\s+class=\{`allowance-event/)
  assert.match(app, /<ellipse/)
  assert.doesNotMatch(app, /<circle\s+class=\{`allowance-point/)
  assert.doesNotMatch(
    app,
    /\.filter\(\(\{ resetAt \}\) => resetAt === activeRunway\.latest\.resetAt\)/,
  )
  assert.match(app, /PROJECT ALLOCATION/)
  assert.doesNotMatch(app, /FEEDER LANES|agentops-(?:config|yielduck|review)/)
  assert.match(app, /job\.spec\.payload\.task/)
  assert.match(app, /jobSchedulePresentation\(job\)/)
  assert.match(app, /classList=\{\{ stale: schedule\.stale \}\}/)
  assert.doesNotMatch(app, /job\.state === "leased" \? "Lease" : "Run"/)
  assert.match(app, /Array\.isArray\(value\.checkpoints\)/)
  assert.doesNotMatch(app, /innerHTML|dangerouslySetInnerHTML/)
})

test("dashboard launcher removes stale build roots and cleans its current root on failure", () => {
  assert.match(homeConfig, /let control_plane_root = .*"control-plane"/u)
  assert.match(
    homeConfig,
    /let stale_build_roots = \(glob \(\$control_plane_root \| path join "dashboard-build-\*"\)\)/u,
  )
  assert.match(homeConfig, /\(date now\) - 10min/u)
  assert.match(homeConfig, /dashboard-build-\(\?<pid>\[0-9\]\+\)/u)
  assert.match(homeConfig, /stat --format='%Y' \$stale_build_root/u)
  assert.doesNotMatch(homeConfig, /stat -f '%m' \$stale_build_root/u)
  assert.match(homeConfig, /kill -0 \$pid/u)
  assert.match(homeConfig, /\$owner\.exit_code != 0/u)
  assert.match(
    homeConfig,
    /\^\$\{pkgs\.coreutils\}\/bin\/rm --recursive --force \$stale_build_root/u,
  )
  assert.match(
    homeConfig,
    /try \{[\s\S]*?rm --recursive --force \$build_root[\s\S]*?\} catch \{\|error\|/u,
  )
  assert.match(homeConfig, /error make \{ msg: \$message \}/u)
})

test("dashboard browser bundle dependencies do not import Node built-ins", () => {
  assert.doesNotMatch(
    [app, ...browserRuntimeSources].join("\n"),
    /(?:from|import\()\s*["']node:/,
  )
})

test("dashboard runtime has no retired Cursor subscription dependency", () => {
  const runtime = browserRuntimeSources.join("\n")
  assert.doesNotMatch(
    runtime,
    /CURSOR_REVIEW_MODELS|cursor-subscription|Cursor review/,
  )
})

test("dashboard remains observational until typed control commands exist", () => {
  assert.match(app, /VIEW ONLY/)
  assert.match(app, /Browser controls remain disabled/)
  assert.doesNotMatch(app, /\/cancel|\/retry|method:\s*"(?:DELETE|PATCH|PUT)"/)
})

test("dashboard uses a real persisted Dockview workspace instead of a stacked card grid", () => {
  assert.match(app, /ControlPlaneDock/)
  assert.doesNotMatch(app, /workspace-grid/)
  assert.match(dock, /DockviewSolid/)
  assert.match(dock, /applyControlPlaneDefaultLayout/)
  assert.match(dock, /const runway = addPanel\(api, "runway"\)/)
  assert.match(dock, /addPanel\(api, "backlog", \{/)
  assert.match(
    dock,
    /const agents = addPanel\(api, "agents", \{\s*referencePanel: runway,\s*direction: "below"/s,
  )
  assert.match(
    dock,
    /const overview = addPanel\(api, "overview", \{\s*referencePanel: runway,\s*direction: "right"/s,
  )
  assert.match(dock, /api\.width \* 0\.62/)
  assert.match(dock, /api\.height \* 0\.52/)
  assert.match(dock, /onDidLayoutChange/)
  assert.match(dock, /api\.fromJSON/)
  assert.match(dock, /api\.toJSON/)
  assert.match(dock, /Restore the default layout/)
  assert.match(dock, /Reopen a dashboard panel/)
  assert.match(dock, /watermarkComponent=\{EmptyWorkspace\}/)
  assert.match(dockLayout, /pi-control-plane-dock-layout-v1/)
  assert.match(dockLayout, /MAX_DOCK_LAYOUT_BYTES = 512 \* 1024/)
  assert.match(dockLayout, /unknown_panel/)
  assert.match(css, /\.control-plane-dockview-theme/)
  assert.match(css, /\.control-plane-dock-shell/)
  assert.match(css, /height: max\(640px, calc\(100dvh - 158px\)\)/)
  assert.match(
    css,
    /\.control-plane-dock-panel-body[\s\S]*container-type: inline-size/,
  )
  assert.match(
    css,
    /grid-template-columns: repeat\(auto-fit, minmax\(min\(132px, 100%\), 1fr\)\)/,
  )
  assert.match(css, /@container \(max-width: 560px\)/)
  assert.match(css, /\.backlog-summary/)
  assert.match(css, /\.backlog-row/)
  assert.match(css, /--dv-drag-over-border-color: var\(--cyan\)/)
  assert.match(css, /--dv-sash-color: rgba\(183, 156, 255, 0\.16\)/)
  assert.match(css, /--dv-active-sash-transition-delay: 0s/)
  assert.match(css, /\.dv-groupview\.dv-active-group/)
  assert.match(css, /> \.dv-sash \{\s*width: 8px/s)
  assert.match(css, /> \.dv-sash \{\s*height: 8px/s)
  assert.match(
    homeConfig,
    /@arminmajerie\/dockview-solid\/dist\/styles\/dockview\.css/,
  )
})

const localSpecifiers = (source: string): readonly string[] =>
  [...source.matchAll(/from "(\.[^"]+)"/gu)].flatMap(match =>
    match[1] === undefined ? [] : [match[1]],
  )

/** Every local module the bundle entry reaches, keyed by file URL. */
const localImportGraph = (
  entry: URL,
  collected: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> => {
  if (collected.has(entry.href)) return collected
  const source = readFileSync(entry, "utf8")
  return localSpecifiers(source).reduce<ReadonlyMap<string, string>>(
    (graph, specifier) => localImportGraph(new URL(specifier, entry), graph),
    new Map(collected).set(entry.href, source),
  )
}

const literal = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

test("the Nix bundle stages the full local import graph beside node modules", () => {
  const graph = localImportGraph(appUrl, new Map())
  const imported = [...graph.keys()].filter(href => href !== appUrl.href)
  assert.ok(imported.length > 0, "app.tsx must reach at least one local module")
  assert.match(
    homeConfig,
    /cp \(\$source_root \| path join "dashboard" "app\.tsx"\) \(\$build_root \| path join "dashboard" "app\.tsx"\)/u,
  )
  for (const href of imported) {
    const name = literal(href.slice(href.lastIndexOf("/") + 1))
    const path = href.includes("/dashboard/")
      ? `"dashboard" "${name}"`
      : `"${name}"`
    assert.match(
      homeConfig,
      new RegExp(
        `cp \\(\\$source_root \\| path join ${path}\\) \\(\\$build_root \\| path join ${path}\\)`,
        "u",
      ),
    )
  }
  for (const [href, source] of graph)
    assert.doesNotMatch(
      source,
      /from "node:/u,
      `${href} imports a Node builtin`,
    )
  assert.match(
    homeConfig,
    /ln --symbolic --no-target-directory .*node_modules.*\(\$build_root \| path join "node_modules"\)/,
  )
  assert.match(
    homeConfig,
    /node_modules\/\.bin\/babel \(\$build_root \| path join "dashboard" "app\.tsx"\)/,
  )
  assert.match(
    homeConfig,
    /--presets=.*@babel\/preset-typescript,.*babel-preset-solid/,
  )
  assert.match(
    homeConfig,
    /pkgs\.esbuild\} \(\$build_root \| path join "dashboard" "app\.js"\)/,
  )
  assert.match(homeConfig, /piDockviewSolidRuntime\s*=\s*pkgs\.runCommand/)
  assert.match(
    homeConfig,
    /ControlPlaneDock\.tsx"\)[\s\S]*?--out-file[\s\S]*?ControlPlaneDock\.tsx"\)[\s\S]*?babel-preset-solid/,
  )
  assert.match(
    homeConfig,
    /--alias:@arminmajerie\/dockview=\$\{piDockviewSolidRuntime\}/,
  )
  assert.match(homeConfig, /React\.createElement/)
  assert.match(
    homeConfig,
    /ln -s \$\{piExtensionNodeModules\}\/node_modules "\$out\/node_modules"/,
  )
})

test("dashboard assets are local, responsive, and share the terminal archeofuturism palette", () => {
  assert.match(html, /id="root"/)
  assert.match(html, /src="\/app\.js"/)
  assert.match(html, /href="\/app\.css"/)
  assert.doesNotMatch(`${html}\n${css}\n${app}`, /https?:\/\//)
  assert.match(css, /--cyan:\s*#29e7ff/i)
  assert.match(css, /--magenta:\s*#ff4fd8/i)
  assert.match(css, /--violet:\s*#983c8d/i)
  assert.match(css, /background:\s*#000000/)
  assert.match(css, /\.allowance-card\.stale/)
  assert.match(css, /\.allowance-point\.estimated/)
  assert.match(css, /\.allowance-point\.event/)
  assert.match(css, /\.allowance-event\.estimated/)
  assert.match(css, /\.throttle-note/)
  assert.match(css, /\.throttle-note\.active/)
  assert.match(css, /\.job-schedule\.stale strong/)
  assert.doesNotMatch(css, /\.allowance-card\.stale svg\s*\{[^}]*opacity:/s)
  assert.doesNotMatch(css, /#07111f|#0f1f31|#102236/i)
  assert.match(css, /@media \(max-width: 660px\)/)
  assert.match(css, /prefers-reduced-motion/)
})
