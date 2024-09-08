import { describe, expect, it } from '@jest/globals';
import { State } from '../dacc/state';

describe('dacc integration tests', () => {
    const baseImage = 'alpine:3.20';

    it('image build', async () => {
        await new State().from(baseImage)
            .image.build({ tag: ['dacc22'] });
    });

    it('image run', async () => {
        await new State().from(baseImage)
            .image.run({ run: { command: 'echo', args: ['Hello, World!'] } });
    });

    it('run', async () => {
        const { stdout } = await new State().from(baseImage)
            .run('echo Hello, World! >> /hello.txt')
            .image.run({ run: { command: 'cat', args: ['/hello.txt'] } });
        expect(stdout).toContain('Hello, World!');
    })

    it('run multiple commands', async () => {
        const { stdout } = await new State()
            .from(baseImage)
            .run('echo Hello, World! >> /hello.txt')
            .run('echo Goodbye, World! >> /hello.txt')
            .image.run({ run: { command: 'cat', args: ['/hello.txt'] } });
        expect(stdout).toContain('Hello, World!');
        expect(stdout).toContain('Goodbye, World!');
    })


    // TODO: cwd is stored in the image config. dacc does not support this yet.
    // it('workdir', async () => {
    //     const { stdout } = await new State().from(baseImage).workdir('/app').image.run({ run: { command: 'pwd' } });
    //     expect(stdout).toBe('/app\n');
    // })

    it('workdir', async () => {
        const { stdout } = await new State()
            .from(baseImage)
            .workdir('/app').image.run({ run: { command: 'ls', args: ['/'] } });
        expect(stdout).toContain('app\n');
    })

    it('copy', async () => {
        const { stdout } = await new State()
            .from(baseImage).copy('README.md', '/')
            .image.run({ run: { command: 'cat', args: ['/README.md'] } });
        // expect stdout to not be empty
        expect(stdout).toBeTruthy();
    });

    it('copy multiple files', async () => {
        const { stdout } = await new State()
            .from(baseImage).copy(['README.md', 'package.json'], '/')
            .image.run({ run: { command: 'ls', args: ['-l', '/'] } });
        expect(stdout).toContain('README.md');
        expect(stdout).toContain('package.json');
    })

    it('copy directory', async () => {
        const { stdout } = await new State()
            .from(baseImage).copy('packages/dacc/src/__tests__', '/tests')
            .image.run({ run: { command: 'ls', args: ['-l', '/tests'] } });
        expect(stdout).toContain('state.test.ts');
    })

    it('copy directory with glob', async () => {
        const s = new State()
        await s.from(baseImage).copy('packages/dacc/src/__tests__/*.test.ts', 'tests/')
        const { stdout } = await s.image.run({ run: { command: 'ls', args: ['/tests/'] } });
        expect(stdout).toContain('state.test.ts');
    })

    // it('diff', async () => {
    //     const s = new State()
    //     const diffNode = await s.from(baseImage).diff((s) => s.copy('README.md', '/')).current
    //     const runNode = await s.from(baseImage).
    //         expect(diff).not.toBeUndefined()
    // })
})