import { beforeAll, describe, expect, it } from "@jest/globals";
import { DOCKER_REGISTRY_URL, DockerRegistryClient } from '../client';
import { ImageReference } from "../reference";

describe('DockerRegistryClient Integration Tests', () => {
    let client: DockerRegistryClient;

    beforeAll(() => {
        const username = process.env.DOCKER_USERNAME || "";
        const password = process.env.DOCKER_PAT || "";
        client = new DockerRegistryClient(
            {
                registries: {
                    "docker.io": {
                        baseUrl: DOCKER_REGISTRY_URL,
                        credentials: { username, password }
                    }
                }
            }
        );
    });

    it('should fetch a manifest for a ghcr.io image', async () => {
        const ref = ImageReference.parse("ghcr.io/astral-sh/uv:latest");
        const manifest = await client.getManifest(ref);
        // Verify the structure of the returned manifest
        expect(manifest).toBeDefined();
        expect(manifest.schemaVersion).toBe(2);
        expect(manifest.mediaType).toBe('application/vnd.oci.image.manifest.v1+json');
        expect(manifest.config).toBeDefined();
        expect(manifest.config.mediaType).toBe('application/vnd.oci.image.config.v1+json');
        expect(manifest.layers).toBeDefined();
        expect(Array.isArray(manifest.layers)).toBe(true);
        expect(manifest.layers.length).toBeGreaterThan(0);
    })


    it('should fetch a manifest for a public image', async () => {
        const ref = ImageReference.parse("ubuntu");
        const manifest = await client.getManifest(ref);

        // Verify the structure of the returned manifest
        expect(manifest).toBeDefined();
        expect(manifest.schemaVersion).toBe(2);
        expect(manifest.mediaType).toBe('application/vnd.oci.image.manifest.v1+json');
        expect(manifest.config).toBeDefined();
        expect(manifest.config.mediaType).toBe('application/vnd.oci.image.config.v1+json');
        expect(manifest.layers).toBeDefined();
        expect(Array.isArray(manifest.layers)).toBe(true);
        expect(manifest.layers.length).toBeGreaterThan(0);
    }, 2000);

    it('should fetch manifest for a private image', async () => {
        const ref = ImageReference.parse("r2d4/manifest-test");
        const manifest = await client.getManifest(ref);

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
        const config = await client.getImageConfig(ImageReference.parse('ubuntu'));
        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    }, 30000);

    it('should fetch image config for a private image', async () => {
        const config = await client.getImageConfig(ImageReference.parse('r2d4/manifest-test'));

        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    })

    it('should list tags for a public image', async () => {
        const tags = await client.listTags(ImageReference.parse('library/ubuntu'));

        expect(tags).toBeDefined();
        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThan(0);
    })

    it('should fetch image config for a platform-specific image', async () => {
        const platform = {
            architecture: 'amd64',
            os: 'linux'
        };

        const config = await client.getImageConfig(ImageReference.parse('ubuntu'), platform);

        expect(config).toBeDefined();
        expect(config.architecture).toBeDefined();
        expect(config.os).toBe('linux');
        expect(config.config).toBeDefined();
        expect(Array.isArray(config.config?.Env)).toBe(true);
        expect(Array.isArray(config.config?.Cmd)).toBe(true);
    })
});