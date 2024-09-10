import { describe, expect, it } from '@jest/globals';
import { createFile } from '../dacc/patterns/patterns';
import { State } from '../dacc/state/state';

describe('dacc integration tests', () => {
    const alpineVersion = '3.20';
    const baseImage = `busybox:uclibc`;
    const alpineBase = `alpine:${alpineVersion}`;
    const golangBase = `golang:1.23-alpine${alpineVersion}`;

    it('create file', async () => {
        const base = await new State().from(golangBase)
        base.do(createFile('/hello.txt', 'Hello, World!'))
        const { stdout } = await base.image.run({ run: { command: 'cat', args: ['/hello.txt'] } });
        expect(stdout).toContain('Hello, World!');
    });
})