---
sidebar_position: 2
---
# API Reference

# IState

The `IState` interface represents the state of a Docker build process and provides methods for manipulating and querying that state.

## Methods

### buildImage

Builds a Docker image from the current state.

```typescript
buildImage(opts?: DockerBuildOptions & { node?: StateNode }): Promise<string>
```

**Parameters:**
- `opts` (optional): Options for the Docker build process.

**Returns:** A Promise that resolves to the tag of the built image.

### runImage

Builds and runs a Docker image from the current state.

```typescript
runImage(opts?: {
    run?: DockerRunOptions,
    build?: DockerBuildOptions & { node?: StateNode }
}): Promise<void>
```

**Parameters:**
- `opts` (optional): Options for building and running the Docker image.

### clone

Creates a deep copy of the current State.

```typescript
clone(): IState
```

**Returns:** A new State instance with the same properties as the current one.

### toConfig

Converts the current state to a docker-buildable file.

```typescript
toConfig(node?: StateNode): string
```

**Parameters:**
- `node` (optional): The node to use as the output. If not provided, uses the current head.

**Returns:** The BuildKit configuration as a string.

### toJSON

Converts the current state to a JSON representation.

```typescript
toJSON(node?: StateNode): any
```

**Parameters:**
- `node` (optional): The node to use as the output. If not provided, uses the current head.

**Returns:** The JSON representation of the state.

### toDot

Generates a DOT graph representation of the current state.

```typescript
toDot(node?: StateNode, config?: GraphDotConfig<BKNode>): string
```

**Parameters:**
- `node` (optional): The node to use as the output. If not provided, uses the current head.
- `config` (optional): Configuration options for the DOT graph generation.

**Returns:** The DOT graph representation as a string.

### do

Applies a state operation to the current state.

```typescript
do(op: StateOp): IState
```

**Parameters:**
- `op`: The state operation to apply.

**Returns:** The current State instance.

### add

Adds a new node to the build graph.

```typescript
add(node: StateNode, setHead?: boolean): IState
```

**Parameters:**
- `node`: The node to add.
- `setHead` (optional): Whether to set the new node as the head. Defaults to true.

**Returns:** The current State instance.

### from

Adds a new 'FROM' instruction to the build graph.

```typescript
from(identifier: string, platform?: PlatformJson): IState
```

**Parameters:**
- `identifier`: The Docker image identifier to use as the base.
- `platform` (optional): The platform to use for the image. Defaults to the current platform.

**Returns:** The current State instance.

### nested

Nests another State instance within the current one.

```typescript
nested(other: IState): IState
```

**Parameters:**
- `other`: The State instance to nest.

**Returns:** The current State instance.

### parallel

Executes multiple operations in parallel and returns the resulting nodes.

```typescript
parallel(...ops: StateOp[]): StateNode[]
```

**Parameters:**
- `ops`: The operations to execute in parallel.

**Returns:** An array of the resulting nodes from each parallel operation.

### branch

Creates a new branch in the build graph.

```typescript
branch(node?: StateNode): IState
```

**Parameters:**
- `node` (optional): The node to set as the head of the new branch. If not provided, creates a new branch from the current head.

**Returns:** The current State instance.

### env

Sets an environment variable for subsequent operations.

```typescript
env(key: string, value: string): IState
```

**Parameters:**
- `key`: The name of the environment variable.
- `value`: The value of the environment variable.

**Returns:** The current State instance.

### workdir

Sets the working directory for subsequent operations.

```typescript
workdir(path: string): IState
```

**Parameters:**
- `path`: The path to set as the working directory.

**Returns:** The current State instance.

### run

Adds a RUN instruction to the build graph.

```typescript
run(command: string): IState
```

**Parameters:**
- `command`: The command to run.

**Returns:** The current State instance.

### script

Adds a script to be executed in the build process.

```typescript
script(script: string[] | string): IState
```

**Parameters:**
- `script`: The script or array of script lines to execute.

**Returns:** The current State instance.

### merge

Merges multiple input nodes into a single node.

```typescript
merge(inputs: StateNode[]): IState
```

**Parameters:**
- `inputs`: The nodes to merge.

**Returns:** The current State instance.

### diff

Computes the difference between the current state and the state after applying an operation.

```typescript
diff(op: StateOp): IState
```

**Parameters:**
- `op`: The state operation to apply for the diff.

**Returns:** The current State instance.

### copy

Copies files or directories from either the build context or a source node to the current working directory.

```typescript
copy(src: string[] | string, dest: string, from?: StateNode): IState
```

**Parameters:**
- `src`: The source path(s) to copy from.
- `dest`: The destination path to copy to.
- `from` (optional): The source node to copy from. If not provided, uses the current context.

**Returns:** The current State instance.

### with

Applies one or more operation options to the current head node.

```typescript
with(...opts: OpOption[]): IState
```

**Parameters:**
- `opts`: The operation options to apply.

**Returns:** The current State instance.

## Properties

### current

The current head node of the build graph.

```typescript
current: StateNode | undefined
```