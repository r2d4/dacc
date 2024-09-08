// Docker-specific Media Type Enums
enum DockerManifestMediaType {
    V1 = "application/vnd.docker.distribution.manifest.v1+json",
    V2 = "application/vnd.docker.distribution.manifest.v2+json",
    V2List = "application/vnd.docker.distribution.manifest.list.v2+json"
}

enum DockerConfigMediaType {
    ContainerConfig = "application/vnd.docker.container.image.v1+json"
}

enum DockerLayerMediaType {
    LayerGzip = "application/vnd.docker.image.rootfs.diff.tar.gzip",
    LayerForeignGzip = "application/vnd.docker.image.rootfs.foreign.diff.tar.gzip"
}

enum DockerPluginMediaType {
    PluginConfig = "application/vnd.docker.plugin.v1+json"
}

// OCI Image Media Type Enums
enum OCIMediaType {
    Descriptor = "application/vnd.oci.descriptor.v1+json",
    LayoutHeader = "application/vnd.oci.layout.header.v1+json",
    ImageIndex = "application/vnd.oci.image.index.v1+json",
    ImageManifest = "application/vnd.oci.image.manifest.v1+json",
    ImageConfig = "application/vnd.oci.image.config.v1+json",
    ImageLayerTar = "application/vnd.oci.image.layer.v1.tar",
    ImageLayerGzip = "application/vnd.oci.image.layer.v1.tar+gzip",
    ImageLayerZstd = "application/vnd.oci.image.layer.v1.tar+zstd",
    Empty = "application/vnd.oci.empty.v1+json"
}

// Deprecated OCI Media Types
enum DeprecatedOCIMediaType {
    NonDistributableLayerTar = "application/vnd.oci.image.layer.nondistributable.v1.tar",
    NonDistributableLayerGzip = "application/vnd.oci.image.layer.nondistributable.v1.tar+gzip",
    NonDistributableLayerZstd = "application/vnd.oci.image.layer.nondistributable.v1.tar+zstd"
}

// Common types
interface Descriptor {
    mediaType: OCIMediaType | DockerManifestMediaType | DockerConfigMediaType | DockerLayerMediaType | DeprecatedOCIMediaType;
    digest: string;
    size: number;
    urls?: string[];
    annotations?: { [key: string]: string };
    platform?: Platform;
}

interface Platform {
    architecture: string;
    os: string;
    "os.version"?: string;
    "os.features"?: string[];
    variant?: string;
    features?: string[];
}

// OCI Image Index
interface OCIImageIndex {
    schemaVersion: 2;
    mediaType: OCIMediaType.ImageIndex;
    manifests: Descriptor[];
    annotations?: { [key: string]: string };
}

// OCI Image Manifest
interface OCIImageManifest {
    schemaVersion: 2;
    mediaType: OCIMediaType.ImageManifest;
    config: Descriptor;
    layers: Descriptor[];
    annotations?: { [key: string]: string };
}

// OCI Image Configuration
interface OCIImageConfig {
    created?: string;
    author?: string;
    architecture: string;
    os: string;
    "os.version"?: string;
    "os.features"?: string[];
    variant?: string;
    config?: {
        User?: string;
        ExposedPorts?: { [port: string]: {} };
        Env?: string[];
        Entrypoint?: string[];
        Cmd?: string[];
        Volumes?: { [path: string]: {} };
        WorkingDir?: string;
        Labels?: { [key: string]: string };
        StopSignal?: string;
        ArgsEscaped?: boolean;
        Memory?: number;
        MemorySwap?: number;
        CpuShares?: number;
        Healthcheck?: {
            // Note: Specific Healthcheck properties are not defined in the spec
            // You may want to define these based on your specific needs
        };
    };
    rootfs: {
        type: "layers";
        diff_ids: string[];
    };
    history?: Array<{
        created?: string;
        author?: string;
        created_by?: string;
        comment?: string;
        empty_layer?: boolean;
    }>;
}

// Docker Manifest List (for comparison with OCI Image Index)
interface DockerManifestList {
    schemaVersion: 2;
    mediaType: DockerManifestMediaType.V2List;
    manifests: Descriptor[];
}

// Docker Image Manifest (for comparison with OCI Image Manifest)
interface DockerImageManifest {
    schemaVersion: 2;
    mediaType: DockerManifestMediaType.V2;
    config: Descriptor;
    layers: Descriptor[];
}

export {
    DeprecatedOCIMediaType,
    Descriptor, DockerConfigMediaType, DockerImageManifest, DockerLayerMediaType, DockerManifestList, DockerManifestMediaType, DockerPluginMediaType, OCIImageConfig, OCIImageIndex,
    OCIImageManifest, OCIMediaType, Platform
};
