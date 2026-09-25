import { Effect } from "effect"
import { expect, it } from "vitest"
import { parseBridgeEnvelope } from "../src/bridge"

it("parses the versioned pi-bridge agent response without accepting extra authority", () => {
  expect(
    Effect.runSync(
      parseBridgeEnvelope(
        JSON.stringify({
        protocolVersion: 1,
        ok: true,
        result: [
          {
            id: "session-1",
            label: "config",
            accepting: true,
            expiresAt: 10,
          },
          ],
        }),
        "agents",
      ),
    ),
  ).toEqual([
    {
      id: "session-1",
      label: "config",
      accepting: true,
      expiresAt: 10,
    },
  ])
})

it("fails closed on unknown protocol versions and malformed responses", () => {
  expect(() =>
    Effect.runSync(
      parseBridgeEnvelope(
        JSON.stringify({ protocolVersion: 2, ok: true, result: [] }),
        "agents",
      ),
    ),
  ).toThrow(/protocol version/i)
  expect(() => Effect.runSync(parseBridgeEnvelope("not-json", "agents"))).toThrow(
    /malformed bridge JSON/i,
  )
})
