import { Effect } from "effect"
import { expect, it } from "vitest"
import {
  createTelegramController,
  type TelegramControlInput,
} from "../src/controller"
import type { BridgeAgent, BridgeMessage, PiBridge } from "../src/bridge"

const agents: readonly BridgeAgent[] = [
  {
    id: "session-config",
    label: "config",
    accepting: true,
    expiresAt: 10_000,
  },
  {
    id: "session-yielduck",
    label: "yielduck",
    accepting: false,
    expiresAt: 10_000,
  },
]

const input = (
  text: string,
  userId = 42,
  updateId = 7,
): TelegramControlInput => ({ text, userId, updateId })

const fakeBridge = () => {
  const sends: Array<{
    agentId: string
    dedupeKey: string
    text: string
  }> = []
  const bridge: PiBridge = {
    listAgents: () => Effect.succeed(agents),
    send: request => {
      sends.push(request)
      return Effect.succeed({
        id: "message-1",
        targetAgentId: request.agentId,
        status: "queued",
        createdAt: 1,
        expiresAt: 10_000,
      } satisfies BridgeMessage)
    },
    result: () =>
      Effect.succeed({
        id: "message-1",
        targetAgentId: "session-config",
        status: "completed",
        createdAt: 1,
        expiresAt: 10_000,
        response: "all systems nominal",
        completedAt: 2,
      }),
  }
  return { bridge, sends }
}

it("bootstrap mode reveals only the caller's own Telegram ID", async () => {
  let bridgeCalls = 0
  const bridge: PiBridge = {
    listAgents: () => {
      bridgeCalls += 1
      return Effect.succeed(agents)
    },
    send: () => Effect.die("must not send"),
    result: () => Effect.die("must not poll"),
  }
  const controller = createTelegramController({ bridge })

  expect(
    await Effect.runPromise(controller.handle(input("/agents", 123))),
  ).toEqual({
    kind: "reply",
    text: "Your Telegram user ID is 123. Configure it as the Metagenda owner before enabling Pi access.",
  })
  expect(bridgeCalls).toBe(0)
})

it("an unauthorized user receives no session metadata and triggers no bridge calls", async () => {
  let bridgeCalls = 0
  const bridge: PiBridge = {
    listAgents: () => {
      bridgeCalls += 1
      return Effect.succeed(agents)
    },
    send: () => Effect.die("must not send"),
    result: () => Effect.die("must not poll"),
  }
  const controller = createTelegramController({ ownerUserId: 42, bridge })

  expect(
    await Effect.runPromise(controller.handle(input("/agents", 99))),
  ).toEqual({
    kind: "reply",
    text: "Not authorized.",
  })
  expect(bridgeCalls).toBe(0)
})

it("lists only bounded bridge presentation fields", async () => {
  const { bridge } = fakeBridge()
  const controller = createTelegramController({ ownerUserId: 42, bridge })

  expect(await Effect.runPromise(controller.handle(input("/agents")))).toEqual({
    kind: "reply",
    text: [
      "Pi sessions",
      "1. config · ready",
      "2. yielduck · busy",
      "",
      "Send /tell <number> <message>.",
    ].join("\n"),
  })
})

it("resolves the last displayed exact session and uses the Telegram update as dedupe key", async () => {
  const { bridge, sends } = fakeBridge()
  const controller = createTelegramController({ ownerUserId: 42, bridge })
  await Effect.runPromise(controller.handle(input("/agents")))

  expect(
    await Effect.runPromise(
      controller.handle(input("/tell 1 give me a concise status", 42, 812)),
    ),
  ).toEqual({
    kind: "pending",
    acknowledgement: "Message queued for config.",
    messageId: "message-1",
    expiresAt: 10_000,
  })
  expect(sends).toEqual([
    {
      agentId: "session-config",
      dedupeKey: "telegram-update-812",
      text: "give me a concise status",
    },
  ])
})

it("rejects a stale numeric selection without enqueueing", async () => {
  const { bridge, sends } = fakeBridge()
  const controller = createTelegramController({ ownerUserId: 42, bridge })

  expect(
    await Effect.runPromise(controller.handle(input("/tell 9 hello"))),
  ).toEqual({
    kind: "reply",
    text: "Unknown or stale session number. Run /agents again.",
  })
  expect(sends).toEqual([])
})

it("never retargets a displayed number when the live session ordering changes", async () => {
  let listed = false
  const sends: Array<{ agentId: string; dedupeKey: string; text: string }> = []
  const inserted: BridgeAgent = {
    id: "session-added",
    label: "added",
    accepting: true,
    expiresAt: 10_000,
  }
  const bridge: PiBridge = {
    listAgents: () => {
      const result = listed ? [inserted, ...agents] : agents
      listed = true
      return Effect.succeed(result)
    },
    send: request => {
      sends.push(request)
      return Effect.succeed({
        id: "message-shift",
        targetAgentId: request.agentId,
        status: "queued",
        createdAt: 1,
        expiresAt: 10_000,
      })
    },
    result: () => Effect.die("must not poll"),
  }
  const controller = createTelegramController({ ownerUserId: 42, bridge })

  await Effect.runPromise(controller.handle(input("/agents")))
  await Effect.runPromise(controller.handle(input("/tell 2 status", 42, 900)))

  expect(sends).toEqual([
    {
      agentId: "session-yielduck",
      dedupeKey: "telegram-update-900",
      text: "status",
    },
  ])
})
