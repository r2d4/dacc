export enum MetadataDescriptionKey {
    CustomName = "llb.customname",
}

export const LLBDefinitionFilename = "buildkit.llb.definition";

export enum CapID {
    // Source Image
    SourceImage = "source.image",
    SourceImageResolveMode = "source.image.resolvemode",
    SourceImageLayerLimit = "source.image.layerlimit",

    // Source Local
    SourceLocal = "source.local",
    SourceLocalUnique = "source.local.unique",
    SourceLocalSessionID = "source.local.sessionid",
    SourceLocalIncludePatterns = "source.local.includepatterns",
    SourceLocalFollowPaths = "source.local.followpaths",
    SourceLocalExcludePatterns = "source.local.excludepatterns",
    SourceLocalSharedKeyHint = "source.local.sharedkeyhint",
    SourceLocalDiffer = "source.local.differ",

    // Source Git
    SourceGit = "source.git",
    SourceGitKeepDir = "source.git.keepgitdir",
    SourceGitFullURL = "source.git.fullurl",
    SourceGitHTTPAuth = "source.git.httpauth",
    SourceGitKnownSSHHosts = "source.git.knownsshhosts",
    SourceGitMountSSHSock = "source.git.mountsshsock",
    SourceGitSubdir = "source.git.subdir",

    // Source HTTP
    SourceHTTP = "source.http",
    SourceHTTPChecksum = "source.http.checksum",
    SourceHTTPPerm = "source.http.perm",
    SourceHTTPUIDGID = "soruce.http.uidgid",

    // Source OCI Layout
    SourceOCILayout = "source.ocilayout",

    // Build Op
    BuildOpLLBFileName = "source.buildop.llbfilename",

    // Exec Meta
    ExecMetaBase = "exec.meta.base",
    ExecMetaCgroupParent = "exec.meta.cgroup.parent",
    ExecMetaNetwork = "exec.meta.network",
    ExecMetaProxy = "exec.meta.proxyenv",
    ExecMetaSecurity = "exec.meta.security",
    ExecMetaSecurityDeviceWhitelistV1 = "exec.meta.security.devices.v1",
    ExecMetaSetsDefaultPath = "exec.meta.setsdefaultpath",
    ExecMetaUlimit = "exec.meta.ulimit",
    ExecMetaRemoveMountStubsRecursive = "exec.meta.removemountstubs.recursive",
    ExecMountBind = "exec.mount.bind",
    ExecMountBindReadWriteNoOutput = "exec.mount.bind.readwrite-nooutput",
    ExecMountCache = "exec.mount.cache",
    ExecMountCacheSharing = "exec.mount.cache.sharing",
    ExecMountSelector = "exec.mount.selector",
    ExecMountTmpfs = "exec.mount.tmpfs",
    ExecMountTmpfsSize = "exec.mount.tmpfs.size",
    ExecMountSecret = "exec.mount.secret",
    ExecMountSSH = "exec.mount.ssh",
    ExecMountContentCache = "exec.mount.cache.content",
    ExecCgroupsMounted = "exec.cgroup",
    ExecSecretEnv = "exec.secretenv",

    // File Operations
    FileBase = "file.base",
    FileRmWildcard = "file.rm.wildcard",
    FileCopyIncludeExcludePatterns = "file.copy.includeexcludepatterns",
    FileRmNoFollowSymlink = "file.rm.nofollowsymlink",
    FileCopyAlwaysReplaceExistingDestPaths = "file.copy.alwaysreplaceexistingdestpaths",

    // Constraints and Platform
    Constraints = "constraints",
    Platform = "platform",

    // Meta
    MetaIgnoreCache = "meta.ignorecache",
    MetaDescription = "meta.description",
    MetaExportCache = "meta.exportcache",

    // Remote Cache
    RemoteCacheGHA = "cache.gha",
    RemoteCacheS3 = "cache.s3",
    RemoteCacheAzBlob = "cache.azblob",

    // Merge and Diff Operations
    MergeOp = "mergeop",
    DiffOp = "diffop",

    // Exporter
    Annotations = "exporter.image.annotations",
    Attestations = "exporter.image.attestations",
    SourceDateEpoch = "exporter.sourcedateepoch",
    MultipleExporters = "exporter.multiple",

    // Source Policy
    SourcePolicy = "source.policy"
}

// Enum for attribute keys
export enum OpAttr {
    // Git attributes
    KeepGitDir = "git.keepgitdir",
    FullRemoteURL = "git.fullurl",
    AuthHeaderSecret = "git.authheadersecret",
    AuthTokenSecret = "git.authtokensecret",
    KnownSSHHosts = "git.knownsshhosts",
    MountSSHSock = "git.mountsshsock",
    // Local attributes
    LocalSessionID = "local.session",
    LocalUniqueID = "local.unique",
    IncludePatterns = "local.includepattern",
    FollowPaths = "local.followpaths",
    ExcludePatterns = "local.excludepatterns",
    SharedKeyHint = "local.sharedkeyhint",
    LocalDiffer = "local.differ",
    // LLB attributes
    LLBDefinitionFilename = "llbbuild.filename",
    // HTTP attributes
    HTTPChecksum = "http.checksum",
    HTTPFilename = "http.filename",
    HTTPPerm = "http.perm",
    HTTPUID = "http.uid",
    HTTPGID = "http.gid",
    // Image attributes
    ImageResolveMode = "image.resolvemode",
    ImageRecordType = "image.recordtype",
    ImageLayerLimit = "image.layerlimit",
    // OCI Layout attributes
    OCILayoutSessionID = "oci.session",
    OCILayoutStoreID = "oci.store",
    OCILayoutLayerLimit = "oci.layerlimit"
}

// Enum for specific attribute values
export enum AttrValues {
    ImageResolveModeDefault = "default",
    ImageResolveModeForcePull = "pull",
    ImageResolveModePreferLocal = "local",
    LocalDifferNone = "none",
    LocalDifferMetadata = "metadata"
}

// Type for attribute keys (unchanged)
export type OpAttrKey = keyof typeof OpAttr;

// Type for attribute values (updated to use enums)
export type OpAttrValue = OpAttr | AttrValues;
export const ContextIdentifier = "local://context";

export const DefaultLinuxEnv = { "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" }
