import { Digest } from "../common/digest";

/**
 * ImageConfig defines the execution parameters which should be used as a base when running a container using an image.
 */
interface ImageConfig {
    /** User defines the username or UID which the process in the container should run as. */
    User?: string;

    /** ExposedPorts a set of ports to expose from a container running this image. */
    ExposedPorts?: { [port: string]: {} };

    /** Env is a list of environment variables to be used in a container. */
    Env?: string[];

    /** Entrypoint defines a list of arguments to use as the command to execute when the container starts. */
    Entrypoint?: string[];

    /** Cmd defines the default arguments to the entrypoint of the container. */
    Cmd?: string[];

    /** Volumes is a set of directories describing where the process is likely write data specific to a container instance. */
    Volumes?: { [path: string]: {} };

    /** WorkingDir sets the current working directory of the entrypoint process in the container. */
    WorkingDir?: string;

    /** Labels contains arbitrary metadata for the container. */
    Labels?: { [key: string]: string };

    /** StopSignal contains the system call signal that will be sent to the container to exit. */
    StopSignal?: string;

    /**
     * ArgsEscaped
     * 
     * @deprecated This field is present only for legacy compatibility with
     * Docker and should not be used by new image builders. It is used by Docker
     * for Windows images to indicate that the `Entrypoint` or `Cmd` or both,
     * contains only a single element array, that is a pre-escaped, and combined
     * into a single string `CommandLine`. If `true` the value in `Entrypoint` or
     * `Cmd` should be used as-is to avoid double escaping.
     * https://github.com/opencontainers/image-spec/pull/892
     */
    ArgsEscaped?: boolean;
}

/**
 * RootFS describes a layer content addresses
 */
interface RootFS {
    /** Type is the type of the rootfs. */
    type: string;

    /** DiffIDs is an array of layer content hashes (DiffIDs), in order from bottom-most to top-most. */
    diff_ids: Digest[];
}

/**
 * Platform describes the platform which the image in the manifest runs on.
 */
interface Platform {
    /** Architecture field specifies the CPU architecture, for example `amd64` or `ppc64le`. */
    architecture?: string;

    /** OS specifies the operating system, for example `linux` or `windows`. */
    os?: string;

    /** OSVersion is an optional field specifying the operating system version, for example on Windows `10.0.14393.1066`. */
    "os.version"?: string;

    /** OSFeatures is an optional field specifying an array of strings, each listing a required OS feature (for example on Windows `win32k`). */
    "os.features"?: string[];

    /** Variant is an optional field specifying a variant of the CPU, for example `v7` to specify ARMv7 when architecture is `arm`. */
    variant?: string;
}

/**
 * History describes the history of a layer.
 */
interface History {
    /** Created is the combined date and time at which the layer was created, formatted as defined by RFC 3339, section 5.6. */
    created?: Date;

    /** CreatedBy is the command which created the layer. */
    created_by?: string;

    /** Author is the author of the build point. */
    author?: string;

    /** Comment is a custom message set when creating the layer. */
    comment?: string;

    /** EmptyLayer is used to mark if the history item created a filesystem diff. */
    empty_layer?: boolean;
}


/**
 * Image is the JSON structure which describes some basic information about the image.
 * This provides the `application/vnd.oci.image.config.v1+json` mediatype when marshalled to JSON.
 */
interface OCIImage extends Platform {
    /** Created is the combined date and time at which the image was created, formatted as defined by RFC 3339, section 5.6. */
    created?: Date;

    /** Author defines the name and/or email address of the person or entity which created and is responsible for maintaining the image. */
    author?: string;

    /** Config defines the execution parameters which should be used as a base when running a container using the image. */
    config?: ImageConfig;

    /** RootFS references the layer content addresses used by the image. */
    rootfs?: RootFS;

    /** History describes the history of each layer. */
    history?: History[];
}

export {
    History, ImageConfig, OCIImage, Platform, RootFS
};

