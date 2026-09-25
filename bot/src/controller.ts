import { Effect } from "effect"
import type { BridgeClientError, PiBridge } from "./bridge"

const MAX_VISIBLE_AGENTS = 40
const MAX_AGENT_LABEL = 60
const MAX_MESSAGE_CHARACTERS = 4_000

export interface TelegramControlInput {
  readonly text: string
  readonly userId: number
  readonly updateId: number
}

export type TelegramControlOutput =
  | { readonly kind: "reply"; readonly text: string }
  | {
      readonly kind: "pending"
      readonly acknowledgement: string
      readonly messageId: string
      readonly expiresAt: number
    }

export interface TelegramController {
  readonly handle: (
    input: TelegramControlInput,
  ) => Effect.Effect<TelegramControlOutput, BridgeClientError>
}

export interface TelegramControllerOptions {
  readonly bridge: PiBridge
  readonly ownerUserId?: number
}

const safeLabel = (label: string): string =>
  label
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, MAX_AGENT_LABEL) || "Pi session"

const isCommand = (text: string, command: string): boolean =>
  new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`).test(text)

export const createTelegramController = (
  options: TelegramControllerOptions,
): TelegramController => {
  let listedAgentIds: readonly string[] = []
  return {
    handle: input => {
      if (options.ownerUserId === undefined) {
        return Effect.succeed({
          kind: "reply",
          text: `Your Telegram user ID is ${input.userId}. Configure it as the Metagenda owner before enabling Pi access.`,
        })
      }
      if (input.userId !== options.ownerUserId) {
        return Effect.succeed({ kind: "reply", text: "Not authorized." })
      }

      const text = input.text.trim()
      if (isCommand(text, "start") || isCommand(text, "help")) {
        return Effect.succeed({
          kind: "reply",
          text: [
            "Metagenda Pi control",
            "/agents — list bridge-ready Pi sessions",
            "/tell <number> <message> — start a communication-only, no-tools turn",
          ].join("\n"),
        })
      }
      if (isCommand(text, "agents")) {
        return options.bridge.listAgents().pipe(
          Effect.map(agents => {
            const visible = agents.slice(0, MAX_VISIBLE_AGENTS)
            listedAgentIds = visible.map(agent => agent.id)
            const lines = visible.map(
              (agent, index) =>
                `${index + 1}. ${safeLabel(agent.label)} · ${agent.accepting ? "ready" : "busy"}`,
            )
            if (agents.length > visible.length) {
              lines.push(`… ${agents.length - visible.length} more sessions`)
            }
            return {
              kind: "reply" as const,
              text:
                lines.length === 0
                  ? "No bridge-ready Pi sessions."
                  : [
                      "Pi sessions",
                      ...lines,
                      "",
                      "Send /tell <number> <message>.",
                    ].join("\n"),
            }
          }),
        )
      }

      const match = text.match(
        /^\/tell(?:@[A-Za-z0-9_]+)?\s+(\d+)\s+([\s\S]+)$/,
      )
      if (!match) {
        return Effect.succeed({
          kind: "reply",
          text: "Use /agents or /tell <number> <message>.",
        })
      }
      const selected = Number(match[1])
      const message = match[2]?.trim() ?? ""
      if (
        !Number.isSafeInteger(selected) ||
        selected < 1 ||
        !message ||
        message.length > MAX_MESSAGE_CHARACTERS ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)
      ) {
        return Effect.succeed({
          kind: "reply",
          text:
            message.length > MAX_MESSAGE_CHARACTERS
              ? `Message exceeds ${MAX_MESSAGE_CHARACTERS} characters.`
              : "Invalid session number or message.",
        })
      }

      const selectedAgentId = listedAgentIds[selected - 1]
      if (!selectedAgentId || selected > MAX_VISIBLE_AGENTS) {
        return Effect.succeed({
          kind: "reply" as const,
          text: "Unknown or stale session number. Run /agents again.",
        })
      }

      return options.bridge.listAgents().pipe(
        Effect.flatMap(
          (agents): Effect.Effect<TelegramControlOutput, BridgeClientError> => {
            const agent = agents.find(
              candidate => candidate.id === selectedAgentId,
            )
            if (!agent) {
              return Effect.succeed({
                kind: "reply" as const,
                text: "Unknown or stale session number. Run /agents again.",
              })
            }
            return options.bridge
              .send({
                agentId: selectedAgentId,
                dedupeKey: `telegram-update-${input.updateId}`,
                text: message,
              })
              .pipe(
                Effect.map(queued => ({
                  kind: "pending" as const,
                  acknowledgement: `Message queued for ${safeLabel(agent.label)}.`,
                  messageId: queued.id,
                  expiresAt: queued.expiresAt,
                })),
              )
          },
        ),
      )
    },
  }
}
