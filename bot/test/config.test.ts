import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { expect, it } from "vitest"
import { loadBotConfig } from "../src/config"

it("loads the token only from a runtime file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "metagenda-config-"))
  try {
    const tokenFile = join(directory, "telegram-token")
    writeFileSync(tokenFile, "synthetic:test-token\n", { mode: 0o600 })
    const config = await Effect.runPromise(
      loadBotConfig({
        METAGENDA_BOT_TOKEN_FILE: tokenFile,
        METAGENDA_TELEGRAM_OWNER_ID: "42",
        METAGENDA_PI_BRIDGE: "/bin/pi-bridge",
      }),
    )
    expect(config).toEqual({
      botToken: "synthetic:test-token",
      ownerUserId: 42,
      bridgePath: "/bin/pi-bridge",
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

it("never accepts a plaintext token environment variable", async () => {
  const result = await Effect.runPromise(
    Effect.either(loadBotConfig({ BOTOKEN: "must-not-be-used" })),
  )
  expect(result._tag).toBe("Left")
  if (result._tag === "Left") expect(result.left.message).not.toContain("must-not-be-used")
})
