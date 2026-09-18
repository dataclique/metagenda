import { Terminal, type UserInput } from "@effect/platform/Terminal"
import { Effect, Mailbox, Option, Ref } from "effect"
import { expect, it } from "vitest"

import { compareFx } from "../src/md"
import type { Todo } from "../src/todo"

const taskA: Todo = { description: "Task A", progress: "todo" }
const taskB: Todo = { description: "Task B", progress: "todo" }

it.each([
  ["a", true],
  ["b", false],
] as const)("compares tasks using mailbox key %s", async (key, expected) => {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const input = yield* Mailbox.make<UserInput>()
      const acquisitions = yield* Ref.make(0)
      const releases = yield* Ref.make(0)
      for (const character of [undefined, "x", key]) {
        yield* input.offer({
          input: Option.fromNullable(character),
          key: {
            name: character ?? "shift",
            ctrl: false,
            meta: false,
            shift: character === undefined,
          },
        })
      }
      const preferred = yield* compareFx(taskA, taskB).pipe(
        Effect.provideService(Terminal, {
          columns: Effect.succeed(80),
          rows: Effect.succeed(24),
          isTTY: Effect.succeed(true),
          readInput: Effect.acquireRelease(
            Ref.update(acquisitions, count => count + 1).pipe(Effect.as(input)),
            () => Ref.update(releases, count => count + 1),
          ),
          readLine: Effect.succeed(""),
          display: () => Effect.void,
        }),
        Effect.timeout("1 second"),
      )
      return {
        preferred,
        acquisitions: yield* Ref.get(acquisitions),
        releases: yield* Ref.get(releases),
      }
    }),
  )
  expect(result).toEqual({ preferred: expected, acquisitions: 1, releases: 1 })
})
