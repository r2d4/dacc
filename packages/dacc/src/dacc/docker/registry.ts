export class DockerRegistryClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request(path: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async authenticate(username: string, password: string): Promise<void> {
        // TODO: Implement authentication
    }

    async getManifest(name: string, reference: string): Promise<any> {
        // TODO: Implement GET /v2/<name>/manifests/<reference>
    }
}
