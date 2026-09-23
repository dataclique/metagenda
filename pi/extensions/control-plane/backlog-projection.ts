import type {
  BacklogEvidencePhase,
  BacklogState,
} from "../agent-registry/backlog.ts"

export interface DashboardBacklogCounts {
  readonly ready: number
  readonly assigned: number
  readonly implementing: number
  readonly inReview: number
  readonly publishing: number
  readonly blocked: number
  readonly unreconciled: number
  readonly totalOpen: number
  readonly terminal: number
  readonly implementationEvidence: number
  readonly reviewEvidence: number
  readonly publicationEvidence: number
  readonly terminalEvidence: number
}

export interface DashboardBacklogProject extends DashboardBacklogCounts {
  readonly project: string
}

export interface DashboardBacklogProjection {
  readonly totals: DashboardBacklogCounts
  readonly projects: readonly DashboardBacklogProject[]
}

const emptyCounts = (): DashboardBacklogCounts => ({
  ready: 0,
  assigned: 0,
  implementing: 0,
  inReview: 0,
  publishing: 0,
  blocked: 0,
  unreconciled: 0,
  totalOpen: 0,
  terminal: 0,
  implementationEvidence: 0,
  reviewEvidence: 0,
  publicationEvidence: 0,
  terminalEvidence: 0,
})

const evidenceCountKey = (
  phase: BacklogEvidencePhase,
): keyof Pick<
  DashboardBacklogCounts,
  | "implementationEvidence"
  | "reviewEvidence"
  | "publicationEvidence"
  | "terminalEvidence"
> =>
  phase === "implementation"
    ? "implementationEvidence"
    : phase === "review"
      ? "reviewEvidence"
      : phase === "publication"
        ? "publicationEvidence"
        : "terminalEvidence"

export const dashboardBacklogProject = (
  state: BacklogState,
  project: string,
): DashboardBacklogProject => {
  const counts = { ...emptyCounts() }
  for (const item of state.items) {
    if (item.project !== project) continue
    switch (item.state.kind) {
      case "ready":
        counts.ready += 1
        counts.totalOpen += 1
        break
      case "assigned":
        counts.assigned += 1
        counts.totalOpen += 1
        break
      case "implementing":
        counts.implementing += 1
        counts.totalOpen += 1
        break
      case "in-review":
        counts.inReview += 1
        counts.totalOpen += 1
        break
      case "publishing":
        counts.publishing += 1
        counts.totalOpen += 1
        break
      case "blocked":
        counts.blocked += 1
        counts.totalOpen += 1
        break
      case "unreconciled":
        counts.unreconciled += 1
        counts.totalOpen += 1
        break
      case "terminal":
        counts.terminal += 1
        break
    }
  }
  const itemIds = new Set(
    state.items.filter(item => item.project === project).map(item => item.id),
  )
  for (const evidence of state.evidence) {
    if (!itemIds.has(evidence.itemId)) continue
    counts[evidenceCountKey(evidence.phase)] += 1
  }
  return { project, ...counts }
}

const addCounts = (
  total: DashboardBacklogCounts,
  project: DashboardBacklogProject,
): DashboardBacklogCounts => ({
  ready: total.ready + project.ready,
  assigned: total.assigned + project.assigned,
  implementing: total.implementing + project.implementing,
  inReview: total.inReview + project.inReview,
  publishing: total.publishing + project.publishing,
  blocked: total.blocked + project.blocked,
  unreconciled: total.unreconciled + project.unreconciled,
  totalOpen: total.totalOpen + project.totalOpen,
  terminal: total.terminal + project.terminal,
  implementationEvidence:
    total.implementationEvidence + project.implementationEvidence,
  reviewEvidence: total.reviewEvidence + project.reviewEvidence,
  publicationEvidence: total.publicationEvidence + project.publicationEvidence,
  terminalEvidence: total.terminalEvidence + project.terminalEvidence,
})

export const dashboardBacklogProjection = (
  states: readonly { readonly project: string; readonly state: BacklogState }[],
): DashboardBacklogProjection => {
  const projects = states
    .map(({ project, state }) => dashboardBacklogProject(state, project))
    .sort((left, right) => left.project.localeCompare(right.project))
  return {
    totals: projects.reduce(addCounts, emptyCounts()),
    projects,
  }
}
