---
sidebar_position: 1
slug: /
title: Getting Started
---
# dacc: docker-as-code compiler

### _Cache-efficient, sandboxed, builds as code._

* Define your builds in code, not Dockerfiles
* Support for merge, diff, and nested builds
* Complete control over the  build graph
* Works natively with Docker, no extra tools
* Built on the Buildkit low-level build (LLB) API ([r2d4/llb](https://github.com/r2d4/llb))

### Installation
__dacc__ requires [Docker](https://www.docker.com).
```
npm install dacc
```
### Getting Started - Hello World
Create a new project with the `create-dacc`, which will create a new TypeScript project and install dacc in the directory provided.
```
npx create-dacc hello-dacc
```
Enter the newly created directory and run the build
```
cd hello-dacc && npm run build
```

```typescript main.ts
import { State } from 'dacc'

async function main() {
    new State().from("alpine")
        .run("echo Hello, World! > /hello.txt")
        .runImage({ run: { command: "cat", args: ["/hello.txt"] } })
}

void main()
```

```bash
 $ npm run build

> dacc-npx@1.0.0 build
> tsx src/main

Building image with tag dacc-a1fb0f8c
[+] Building 0.1s (7/7) FINISHED                                                                                                                          docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                                      0.0s
 => => transferring dockerfile: 1.10kB                                                                                                                                    0.0s
 => resolve image config for docker-image://ghcr.io/r2d4/llb:1.0.1                                                                                                        0.0s
 => docker-image://ghcr.io/r2d4/llb:1.0.1                                                                                                                          0.0s
 => llb-json-api                                                                                                                                                          0.0s
 => => transferring dockerfile: 1.10kB                                                                                                                                    0.0s
 => [from] alpine                                                                                                                                                         0.0s
 => [run] echo Hello, World! > /hello.txt                                                                                                                          0.0s
 => exporting to image                                                                                                                                                    0.0s
 => => exporting layers                                                                                                                                                   0.0s
 => => writing image sha256:6e63d7fc63b7b8022ba41ececc5dde119d7bff5b0d6fc16008fe2b19c7e23f8d                                                                              0.0s
 => => naming to docker.io/library/dacc-a1fb0f8c                                                                                                                          0.0s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/qj27d9ecmb43wlsr9y4oddx4b
Hello, World!
```