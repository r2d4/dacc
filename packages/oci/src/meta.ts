import { DockerRegistryClient } from './client'; // Assuming the DockerRegistryClient is already implemented as in your code
import { OCIImageConfig, OCIImageManifest, Platform } from './types';

interface RegistryOptions {
    baseUrl: string;
    username?: string;
    password?: string;
    defaultPlatform?: Platform;
}

// Meta client to manage and resolve multiple DockerRegistryClients
export class MetaDockerRegistryClient {
    private registryClients: Map<string, DockerRegistryClient> = new Map();

    // Registers a new registry client based on the base URL of the registry
    addRegistry(options: RegistryOptions): void {
        if (this.registryClients.has(options.baseUrl)) {
            throw new Error(`Registry with URL ${options.baseUrl} already exists.`);
        }
        const client = new DockerRegistryClient(options.baseUrl, {
            username: options.username,
            password: options.password,
            defaultPlatform: options.defaultPlatform,
        });
        this.registryClients.set(options.baseUrl, client);
    }

    // Removes a registry client based on its base URL
    removeRegistry(baseUrl: string): void {
        if (!this.registryClients.has(baseUrl)) {
            throw new Error(`Registry with URL ${baseUrl} does not exist.`);
        }
        this.registryClients.delete(baseUrl);
    }

    // Resolves the appropriate registry client based on the image reference
    private resolveRegistry(imageReference: string): DockerRegistryClient {
        const { registry } = this.parseImageReference(imageReference);
        const client = this.registryClients.get(registry);
        if (!client) {
            throw new Error(`No registry client found for registry URL: ${registry}`);
        }
        return client;
    }

    // Parses the image reference into registry, repository, and tag
    private parseImageReference(imageReference: string): {
        registry: string;
        repository: string;
        tag: string;
    } {
        // Regex pattern to match [registry/][repository/]image[:tag]
        const regex = /^(?:(?<registry>[^/]+)\/)?(?<repository>[^:\/]+(?:\/[^:\/]+)*)?(?::(?<tag>[^\/]+))?$/;
        const match = imageReference.match(regex);
        if (!match || !match.groups) {
            throw new Error(`Invalid image reference format: ${imageReference}`);
        }

        // Default to Docker Hub if no registry is specified
        const registry = match.groups.registry || 'https://registry.hub.docker.com';
        const repository = match.groups.repository || '';
        const tag = match.groups.tag || 'latest';

        return { registry, repository, tag };
    }

    // Delegates the getManifest call to the resolved registry client
    async getManifest(
        imageReference: string,
        platform?: Platform
    ): Promise<OCIImageManifest> {
        const { repository, tag } = this.parseImageReference(imageReference);
        const client = this.resolveRegistry(imageReference);
        return client.getManifest(repository, tag, platform);
    }

    // Delegates the getImageConfig call to the resolved registry client
    async getImageConfig(
        imageReference: string,
        platform?: Platform
    ): Promise<OCIImageConfig> {
        const { repository, tag } = this.parseImageReference(imageReference);
        const client = this.resolveRegistry(imageReference);
        return client.getImageConfig(repository, tag, platform);
    }

    // Delegates the listTags call to the resolved registry client
    async listTags(imageReference: string): Promise<string[]> {
        const { repository } = this.parseImageReference(imageReference);
        const client = this.resolveRegistry(imageReference);
        return client.listTags(repository);
    }

    // Delegates the getPlatforms call to the resolved registry client
    async getPlatforms(imageReference: string): Promise<Platform[]> {
        const { repository, tag } = this.parseImageReference(imageReference);
        const client = this.resolveRegistry(imageReference);
        return client.getPlatforms(repository, tag);
    }
}
