import { Digest } from "@dacc/common";
import { ImageReference } from "./reference";
import { Descriptor, DockerManifestList, DockerManifestMediaType, OCIImageConfig, OCIImageIndex, OCIImageManifest, OCIMediaType, Platform } from "./types";

type RegistryCredentials = {
    username: string;
    password: string;
};

type RegistryConfig = {
    baseUrl: string;
    credentials?: RegistryCredentials;
    bearerToken?: string;
};

type RegistryMap = {
    [domain: string]: RegistryConfig;
};

export const DOCKER_REGISTRY_URL = 'https://registry-1.docker.io';

export class DockerRegistryClient {
    private registries: RegistryMap;
    private defaultPlatform: Platform = { architecture: 'amd64', os: 'linux' };

    constructor(props: {
        registries?: RegistryMap,
        defaultPlatform?: Platform;
    } = {}) {
        this.registries = props.registries || {
            'docker.io': { baseUrl: DOCKER_REGISTRY_URL }
        };
        this.defaultPlatform = props.defaultPlatform || { architecture: 'amd64', os: 'linux' };
    }

    setDefaultPlatform(platform: Platform) {
        this.defaultPlatform = platform;
    }

    private getRegistryConfig(ref: ImageReference): RegistryConfig {
        const domain = ref.domain || 'docker.io';
        const config = this.registries[domain];
        if (!config) {
            this.registries[domain] = { baseUrl: `https://${domain}` };
        }
        return this.registries[domain];
    }

    private async request(ref: ImageReference, path: string, options: RequestInit = {}): Promise<Response> {
        const config = this.getRegistryConfig(ref);
        const url = `${config.baseUrl}${path}`;
        const headers = new Headers(options.headers);

        if (config.bearerToken) {
            headers.set('Authorization', `Bearer ${config.bearerToken}`);
        }

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 && !config.bearerToken) {
            await this.handleAuthChallenge(ref, response);
            return this.request(ref, path, options);
        }
        return response;
    }


    private async handleAuthChallenge(ref: ImageReference, response: Response): Promise<void> {
        const config = this.getRegistryConfig(ref);
        const authHeader = response.headers.get('WWW-Authenticate');
        if (!authHeader) {
            throw new Error('WWW-Authenticate header missing from 401 response');
        }
        const match = authHeader.match(/Bearer realm="([^"]+)",service="([^"]+)",scope="([^"]+)"/);
        if (!match) {
            throw new Error('Invalid WWW-Authenticate header format');
        }
        const [, realm, service, scope] = match;
        const tokenUrl = new URL(realm);
        tokenUrl.searchParams.append('service', service);
        tokenUrl.searchParams.append('scope', scope);

        let headers: Record<string, string> = {};
        if (config.credentials) {
            const authString = Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64');
            headers['Authorization'] = `Basic ${authString}`;
        }

        const tokenResponse = await fetch(tokenUrl.toString(), { headers });
        if (!tokenResponse.ok) {
            throw new Error('Failed to obtain bearer token: ' + await tokenResponse.text());
        }

        interface TokenResponse {
            token?: string;
            access_token?: string;
        }

        const tokenData = await tokenResponse.json() as TokenResponse;
        config.bearerToken = tokenData.token || tokenData.access_token;
        if (!config.bearerToken) {
            throw new Error('No token received from authorization server');
        }
    }

    async getManifest(ref: ImageReference, platform?: Platform): Promise<OCIImageManifest> {
        const headers = new Headers({
            'Accept': `${OCIMediaType.ImageManifest},${OCIMediaType.ImageIndex},${DockerManifestMediaType.V2},${DockerManifestMediaType.V2List}`
        });
        const response = await this.request(ref, `/v2/${ref.path}/manifests/${ref.tagOrDigest}`, { headers });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Manifest not found for ${ref.toString()}`);
            }
            throw new Error(`Failed to get manifest: ${response.statusText}`);
        }
        const contentType = response.headers.get('Content-Type');
        const body = await response.json();

        if (contentType === OCIMediaType.ImageIndex || contentType === DockerManifestMediaType.V2List) {
            if (ref.digest) {
                throw new Error('Unexpected image index response for manifest request with digest');
            }
            const index = body as OCIImageIndex | DockerManifestList;
            return this.handleImageIndex(index, ref, platform || this.defaultPlatform);
        } else if (contentType === OCIMediaType.ImageManifest || contentType === DockerManifestMediaType.V2) {
            return body as OCIImageManifest;
        } else {
            throw new Error(`Unexpected Content-Type: ${contentType}`);
        }
    }

    private async handleImageIndex(index: OCIImageIndex | DockerManifestList, image: ImageReference, platform: Platform): Promise<OCIImageManifest> {
        const matchingManifest = index.manifests.find(m =>
            m.platform &&
            m.platform.architecture === platform.architecture &&
            m.platform.os === platform.os &&
            (platform.variant ? m.platform.variant === platform.variant : true)
        );

        if (!matchingManifest) {
            throw new Error(`No matching manifest found for platform ${JSON.stringify(platform)}`);
        }

        const imageWithDigest = ImageReference.parse(`${image.toString()}@${matchingManifest.digest}`);
        return this.getManifest(imageWithDigest);
    }

    async getImageConfig(ref: ImageReference, platform?: Platform): Promise<OCIImageConfig> {
        const manifest = await this.getManifest(ref, platform);
        const response = await this.request(ref, `/v2/${ref.path}/blobs/${manifest.config.digest}`);
        if (!response.ok) {
            throw new Error(`Failed to get image config: ${response.statusText}`);
        }
        return await response.json() as OCIImageConfig;
    }

    async listTags(ref: ImageReference): Promise<string[]> {
        const response = await this.request(ref, `/v2/${ref.path}/tags/list`);
        if (!response.ok) {
            throw new Error(`Failed to list tags: ${response.statusText}`);
        }
        interface TagListResponse {
            name: string;
            tags: string[];
        }
        const data = await response.json() as TagListResponse;
        return data.tags || [];
    }

    async getPlatforms(name: string, reference: Digest): Promise<Platform[]> {
        const ref = ImageReference.parse(`${name}@${reference}`);
        const headers = new Headers({
            'Accept': `${OCIMediaType.ImageIndex},${DockerManifestMediaType.V2List}`
        });
        const response = await this.request(ref, `/v2/${name}/manifests/${reference}`, { headers });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Manifest not found for ${name}:${reference}`);
            }
            throw new Error(`Failed to get manifest: ${response.statusText}`);
        }
        const contentType = response.headers.get('Content-Type');
        if (contentType !== OCIMediaType.ImageIndex && contentType !== DockerManifestMediaType.V2List) {
            // If it's not an index, it's a single platform image
            const config = await this.getImageConfig(ref);
            return [{
                architecture: config.architecture,
                os: config.os,
                "os.version": config["os.version"],
                "os.features": config["os.features"],
                variant: config.variant
            }];
        }

        const index = await response.json() as OCIImageIndex | DockerManifestList;
        return index.manifests
            .filter((m): m is Descriptor & { platform: Platform } => !!m.platform)
            .map(m => m.platform);
    }
}