import { beforeAll, describe, expect, it } from "@jest/globals";
import { DockerRegistryClient } from '../client';

describe('DockerRegistryClient Integration Tests', () => {
    let client: DockerRegistryClient;

    beforeAll(() => {
        const username = process.env.DOCKER_USERNAME;
        const password = process.env.DOCKER_PAT;
        client = new DockerRegistryClient('https://registry-1.docker.io', { username, password });
    });

    it('should fetch a manifest for a public image', async () => {
        // We'll use the official Alpine Linux image as a test case
        const imageName = 'library/ubuntu';
        const tag = 'latest';

        const manifest = await client.getManifest(imageName, tag);
        console.log(manifest);

        // Verify the structure of the returned manifest
        expect(manifest).toBeDefined();
        expect(manifest.schemaVersion).toBe(2);
        expect(manifest.mediaType).toBe('application/vnd.docker.distribution.manifest.v2+json');
        expect(manifest.config).toBeDefined();
        expect(manifest.config.mediaType).toBe('application/vnd.docker.container.image.v1+json');
        expect(manifest.layers).toBeDefined();
        expect(Array.isArray(manifest.layers)).toBe(true);
        expect(manifest.layers.length).toBeGreaterThan(0);
    }, 2000); // Increase timeout to 30 seconds for network requests

    it('should fetch manifests for different tags of the same image', async () => {
        const imageName = 'library/ubuntu';
        const tags = ['latest', '20.04'];

        for (const tag of tags) {
            const manifest = await client.getManifest(imageName, tag);
            expect(manifest).toBeDefined();
            expect(manifest.schemaVersion).toBe(2);
            expect(manifest.config).toBeDefined();
            expect(manifest.layers).toBeDefined();
        }
    }, 60000); // Increase timeout to 60 seconds for multiple requests

    it('should fetch manifest for a private image', async () => {
        // We'll use the official Nginx image as a test case
        const imageName = 'r2d4/manifest-test';
        const tag = 'latest';

        console.log("Fetching manifest for r2d4/manifest-test:latest");
        const manifest = await client.getManifest(imageName, tag);
        console.log(manifest);

        // Verify the structure of the returned manifest
        expect(manifest).toBeDefined
        expect(manifest.schemaVersion).toBe(2);
        expect(manifest.mediaType).toBe('application/vnd.docker.distribution.manifest.v2+json');
        expect(manifest.config).toBeDefined
        expect(manifest.config.mediaType).toBe('application/vnd.docker.container.image.v1+json');
        expect(manifest.layers).toBeDefined();
        expect(Array.isArray(manifest.layers)).toBe(true);
        expect(manifest.layers.length).toBeGreaterThan(0);
    }
        , 2000); // Increase timeout to 30 seconds for network requests

    it('should fetch image config for a public image', async () => {
        const config = await client.getImageConfig('library/ubuntu', 'latest');

        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    }, 30000);

    it('should fetch image config for a private image', async () => {
        const config = await client.getImageConfig('r2d4/manifest-test', 'latest');

        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    })

    it('should list tags for a public image', async () => {
        const tags = await client.listTags('library/ubuntu');

        expect(tags).toBeDefined();
        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThan(0);
    })

    it('should fetch image config for a platform-specific image', async () => {
        const platform = {
            architecture: 'amd64',
            os: 'linux'
        };

        const config = await client.getImageConfig('library/ubuntu', 'latest', platform);

        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    })
});