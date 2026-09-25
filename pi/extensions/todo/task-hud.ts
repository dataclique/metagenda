import type { Theme } from "@earendil-works/pi-coding-agent"

import type { ExternalBacklogProjection } from "../shared/backlog-events.ts"
import { frameTaskHud, taskHud } from "./presentation.ts"
import type { TodoState } from "./state.ts"

export interface TaskHudOptions {
  readonly idle?: boolean
  readonly intervalMs?: number
  readonly externalBacklog?: ExternalBacklogProjection
}

export class TaskHudComponent {
  private readonly state: TodoState
  private readonly theme: Theme
  private readonly externalBacklog?: ExternalBacklogProjection

  constructor(
    state: TodoState,
    theme: Theme,
    _requestRender: () => void = () => {},
    options: TaskHudOptions = {},
  ) {
    this.state = state
    this.theme = theme
    this.externalBacklog = options.externalBacklog
  }

  private colorTaskHeadline(line: string): string {
    return this.theme.bold(this.theme.fg("borderAccent", line))
  }

  private colorTaskRow(line: string): string {
    const firstBorder = line.indexOf("│")
    const lastBorder = line.lastIndexOf("│")
    if (firstBorder < 0 || lastBorder <= firstBorder) {
      return this.theme.fg("accent", line)
    }

    return [
      this.theme.fg("borderAccent", line.slice(0, firstBorder + 1)),
      this.theme.fg("accent", line.slice(firstBorder + 1, lastBorder)),
      this.theme.fg("borderAccent", line.slice(lastBorder)),
    ].join("")
  }

  render(width: number): string[] {
    const hud = taskHud(this.state, Date.now(), width, this.externalBacklog)
    const [headline = "", ...rows] = frameTaskHud(hud, width)
    return [
      this.colorTaskHeadline(headline),
      ...rows.map(row => this.colorTaskRow(row)),
    ]
  }

  invalidate(): void {}

  dispose(): void {}
}
