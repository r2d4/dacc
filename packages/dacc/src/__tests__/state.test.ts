import { describe, expect, it } from '@jest/globals';
import path from 'path';
import { State } from '../dacc/state';

describe('dacc integration tests', () => {
    const alpineVersion = '3.20';
    const baseImage = `busybox:uclibc`;
    const alpineBase = `alpine:${alpineVersion}`;
    const golangBase = `golang:1.23-alpine${alpineVersion}`;

    it('image build', async () => {
        const base = await new State().from(baseImage)
        await base.image.build({ tag: ['dacc22'] });
    });

    it('image run', async () => {
        const base = await new State().from(baseImage)
        await base.image.run({ run: { command: 'echo', args: ['Hello, World!'] } });
    });

    it('run', async () => {
        const base = await new State().from(baseImage)
        const { stdout } = await base
            .run('echo Hello, World! >> /hello.txt')
            .image.run({ run: { command: 'cat', args: ['/hello.txt'] } });
        expect(stdout).toContain('Hello, World!');
    })

    it('run multiple commands', async () => {
        const base = await new State().from(baseImage)
        const { stdout } = await base
            .run('echo Hello, World! >> /hello.txt')
            .run('echo Goodbye, World! >> /hello.txt')
            .image.run({ run: { command: 'cat', args: ['/hello.txt'] } });
        expect(stdout).toContain('Hello, World!');
        expect(stdout).toContain('Goodbye, World!');
    })


    it('workdir from image config', async () => {
        const base = await new State().from(baseImage)
        const { stdout } = await base.workdir('/app').image.run({ run: { command: 'pwd' } });
        expect(stdout).toBe('/app\n');
    })

    it('env from image config', async () => {
        const base = await new State().from(golangBase)
        const { stdout } = await base.image.run({ run: { command: 'env' } });
        expect(stdout).toContain('GOLANG_VERSION');
    })

    it('workdir', async () => {
        const base = await new State().from(baseImage)
        const { stdout } = await base.workdir('/app').image.run({ run: { command: 'ls', args: ['/'] } });
        expect(stdout).toContain('app\n');
    })

    it('copy', async () => {
        const base = await new State().from(baseImage)
        const testFile = 'a.txt'
        const { stdout } = await base.copy(testFile, '/')
            .image.run(
                {
                    build: { contextPath: path.join(__dirname, 'testfiles') },
                    run: { command: 'ls', args: ['/'] }
                });
        expect(stdout).toContain(testFile);
    });

    it('copy multiple files', async () => {
        // TODO: test with test files
        const files = ["a.txt", "b.txt"]
        const base = await new State().from(baseImage)
        const { stdout } = await base.copy(files, '/')
            .image.run({
                build: { contextPath: path.join(__dirname, 'testfiles') },
                run: { command: 'ls', args: files }
            });
        expect(stdout).toContain(files.join('\n'));
    })

    it('copy directory', async () => {
        const files = ["a.txt", "b.txt"]
        const base = await new State().from(baseImage)
        const { stdout } = await base.copy('.', '/tests')
            .image.run(

                {
                    build: { contextPath: path.join(__dirname, 'testfiles') },

                    run: { command: 'ls', args: ['/tests'] }
                });
        expect(stdout).toContain(files.join('\n'));
    })

    it('copy directory with glob', async () => {
        const files = ["a.txt", "b.txt"]
        const base = await new State().from(baseImage)
        const { stdout } = await base.copy('*.txt', '/tests')
            .image.run(

                {
                    build: { contextPath: path.join(__dirname, 'testfiles') },

                    run: { command: 'ls', args: ['/tests'] }
                });
        expect(stdout).toContain(files.join('\n'));
    })
})