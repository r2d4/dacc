// Regular expressions for individual components
const DOMAIN_COMPONENT = `(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])`;
const DOMAIN = `(?:${DOMAIN_COMPONENT}(?:\\.${DOMAIN_COMPONENT})*|\\[(?:[a-fA-F0-9:]+)\\])(?::[0-9]+)?`;
const NAME_COMPONENT = `[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*`;
const NAME = `${NAME_COMPONENT}(?:/${NAME_COMPONENT})*`;
const TAG = `[\\w][\\w.-]{0,127}`;
const DIGEST = `[A-Za-z][A-Za-z0-9]*(?:[-_+.][A-Za-z][A-Za-z0-9]*)*[:][a-fA-F0-9]{32,}`;

// Compiled regular expressions
const DOMAIN_REGEXP = new RegExp(`^${DOMAIN}$`);
const REFERENCE_REGEXP = new RegExp(`^((?:${DOMAIN}/)?)(${NAME})(?::(${TAG}))?(?:@(${DIGEST}))?$`);

// Constants
const DEFAULT_DOMAIN = "docker.io";
const LEGACY_DEFAULT_DOMAIN = "index.docker.io";
const OFFICIAL_REPO_PREFIX = "library";
const DEFAULT_TAG = "latest";
const LOCALHOST = "localhost";

class ImageReference {
    private constructor(readonly domain: string, readonly path: string, readonly tag: string | null = null, readonly digest: string | null = null) { }

    static parse(s: string): ImageReference {
        if (s.toLowerCase() !== s) {
            throw new Error(`Invalid reference format: uppercase letters found: ${s}`);
        }
        const match = REFERENCE_REGEXP.exec(s);
        if (!match) {
            throw new Error(`Invalid reference format: ${s}`);
        }
        const [, domain, path, tag, digest] = match;
        const [parsedDomain, parsedPath] = this.normalizeDomainPath(domain, path);
        return new ImageReference(parsedDomain, parsedPath, tag || null, digest || null);
    }

    get name(): string {
        return this.domain + "/" + this.path;
    }

    public string(): string {
        let ref = this.domain;
        if (ref !== "") {
            ref += "/";
        }
        ref += this.path;
        if (this.digest !== null) {
            ref += "@" + this.digest;
            return ref;
        }
        if (this.tag !== null) {
            ref += ":" + this.tag;
            return ref;
        }
        return ref += ":" + DEFAULT_TAG
    }

    private static normalizeDomainPath(domain: string, path: string): [string, string] {

        domain = domain.replace(/\/$/, "");

        if (domain === LEGACY_DEFAULT_DOMAIN) {
            domain = DEFAULT_DOMAIN;
        }

        if (domain === "" && !path.includes('/')) {
            return [DEFAULT_DOMAIN, `${OFFICIAL_REPO_PREFIX}/${path}`];
        }

        if (domain === OFFICIAL_REPO_PREFIX) {
            return [DEFAULT_DOMAIN, `${OFFICIAL_REPO_PREFIX}/${path}`];
        }

        if (!domain.includes(".") && !domain.includes(":") && domain !== LOCALHOST) {
            return [DEFAULT_DOMAIN, domain + "/" + path];
        }

        if (DOMAIN_REGEXP.test(domain)) {
            return [domain, path];
        }

        return [domain, path];
    }
}

export { ImageReference };

