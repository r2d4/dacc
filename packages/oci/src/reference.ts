import { Digest } from "@dacc/common";

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

type Tag = string;

class ImageReference {
    constructor(readonly domain: string, readonly path: string, readonly tag: Tag | null = null, readonly digest: Digest | null = null) {
        if (digest && !Digest.validate(digest.toString())) {
            throw new Error(`Invalid digest: ${digest}`);
        }
    }

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
        let parsedDigest = null;
        if (digest) {
            parsedDigest = Digest.fromString(digest);
        }
        let parsedTag = null;
        if (!digest && !tag) {
            parsedTag = DEFAULT_TAG;
        }
        return new ImageReference(parsedDomain, parsedPath, parsedTag, parsedDigest);
    }

    get name(): string {
        return this.domain + "/" + this.path;
    }

    get tagOrDigest(): Tag | Digest {
        return this.digest || this.tag || DEFAULT_TAG;
    }

    get suffix(): string {
        if (this.digest !== null) {
            return "@" + this.digest;
        }
        if (this.tag !== null) {
            return ":" + this.tag;
        }
        return ":" + DEFAULT_TAG;
    }

    public toString(): string {
        let ref = this.domain;
        if (ref !== "") {
            ref += "/";
        }
        ref += this.path;
        ref += this.suffix;
        return ref;
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

