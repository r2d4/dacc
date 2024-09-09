import { Descriptor, DockerManifestList, DockerManifestMediaType, OCIImageConfig, OCIImageIndex, OCIImageManifest, OCIMediaType, Platform } from "./types";

export class DockerRegistryClient {
    private baseUrl: string;
    private username?: string;
    private password?: string;
    private bearerToken?: string;
    private defaultPlatform: Platform = { architecture: 'amd64', os: 'linux' };

    constructor(baseUrl: string, options: {
        username?: string;
        password?: string;
        defaultPlatform?: Platform;
    } = {}) {
        this.baseUrl = baseUrl;
        this.username = options.username || process.env.DOCKER_USERNAME;
        this.password = options.password || process.env.DOCKER_PASSWORD;
        if (options.defaultPlatform) {
            this.defaultPlatform = options.defaultPlatform;
        }
    }

    setDefaultPlatform(platform: Platform) {
        this.defaultPlatform = platform;
    }

    private async request(path: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this.baseUrl}${path}`;
        const headers = new Headers(options.headers);

        if (this.bearerToken) {
            headers.set('Authorization', `Bearer ${this.bearerToken}`);
        }

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 && !this.bearerToken) {
            await this.handleAuthChallenge(response);
            return this.request(path, options);
        }
        return response;
    }

    private async handleAuthChallenge(response: Response): Promise<void> {
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
        if (this.username && this.password) {
            const authString = Buffer.from(`${this.username}:${this.password}`).toString('base64');
            headers['Authorization'] = `Basic ${authString}`;
        }

        const tokenResponse = await fetch(tokenUrl.toString(), { headers });
        if (!tokenResponse.ok) {
            throw new Error('Failed to obtain bearer token:' + await tokenResponse.text());
        }

        interface TokenResponse {
            token?: string;
            access_token?: string;
        }

        const tokenData = await tokenResponse.json() as TokenResponse;
        this.bearerToken = tokenData.token || tokenData.access_token;
        if (!this.bearerToken) {
            throw new Error('No token received from authorization server');
        }
    }

    async getManifest(name: string, reference: string, platform?: Platform): Promise<OCIImageManifest> {
        const headers = new Headers({
            'Accept': `${OCIMediaType.ImageManifest},${OCIMediaType.ImageIndex},${DockerManifestMediaType.V2},${DockerManifestMediaType.V2List}`
        });
        const response = await this.request(`/v2/${name}/manifests/${reference}`, { headers });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Manifest not found for ${name}:${reference}`);
            }
            throw new Error(`Failed to get manifest: ${response.statusText}`);
        }
        const contentType = response.headers.get('Content-Type');
        const body = await response.json();

        if (contentType === OCIMediaType.ImageIndex || contentType === DockerManifestMediaType.V2List) {
            const index = body as OCIImageIndex | DockerManifestList;
            return this.handleImageIndex(index, name, platform || this.defaultPlatform);
        } else if (contentType === OCIMediaType.ImageManifest || contentType === DockerManifestMediaType.V2) {
            return body as OCIImageManifest;
        } else {
            throw new Error(`Unexpected Content-Type: ${contentType}`);
        }
    }

    private async handleImageIndex(index: OCIImageIndex | DockerManifestList, name: string, platform: Platform): Promise<OCIImageManifest> {
        const matchingManifest = index.manifests.find(m =>
            m.platform &&
            m.platform.architecture === platform.architecture &&
            m.platform.os === platform.os &&
            (platform.variant ? m.platform.variant === platform.variant : true)
        );

        if (!matchingManifest) {
            throw new Error(`No matching manifest found for platform ${JSON.stringify(platform)}`);
        }

        return this.getManifest(name, matchingManifest.digest);
    }

    async getImageConfig(name: string, reference: string, platform?: Platform): Promise<OCIImageConfig> {
        const manifest = await this.getManifest(name, reference, platform);
        const response = await this.request(`/v2/${name}/blobs/${manifest.config.digest}`);
        if (!response.ok) {
            throw new Error(`Failed to get image config: ${response.statusText}`);
        }
        return await response.json() as OCIImageConfig;
    }

    async listTags(name: string): Promise<string[]> {
        const response = await this.request(`/v2/${name}/tags/list`);
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

    async getPlatforms(name: string, reference: string): Promise<Platform[]> {
        const headers = new Headers({
            'Accept': `${OCIMediaType.ImageIndex},${DockerManifestMediaType.V2List}`
        });
        const response = await this.request(`/v2/${name}/manifests/${reference}`, { headers });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Manifest not found for ${name}:${reference}`);
            }
            throw new Error(`Failed to get manifest: ${response.statusText}`);
        }
        const contentType = response.headers.get('Content-Type');
        if (contentType !== OCIMediaType.ImageIndex && contentType !== DockerManifestMediaType.V2List) {
            // If it's not an index, it's a single platform image
            const config = await this.getImageConfig(name, reference);
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