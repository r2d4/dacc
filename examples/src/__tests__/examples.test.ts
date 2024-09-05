import { describe, expect, it } from "@jest/globals";
import { helloWorld } from "../hello-world";
import { merge } from "../merge";
import { nestedBuilds } from "../nested-builds";
import { parallel } from "../parallel";

describe('Examples Integration Tests', () => {
    it('should run hello world example', async () => {
        const output = await helloWorld()
        expect(output.stdout).toBe("Hello, World!\n")
    })
    it('should run nested builds example', async () => {
        const output = await nestedBuilds()
        expect(output.stdout).toBe("Hello, World!\ndacc is awesome!\n")
    })
    it('should run merge example', async () => {
        const output = await merge()
        expect(output.stdout).toContain(`(oo)`)
    }, 10000)
    it('should run parallel example', async () => {
        const output = await parallel()
        expect(output.stdout).toContain('git')
    })
})