---
sidebar_position: 1
slug: /
title: Getting Started
---
# dacc: docker-as-code compiler

#### _Cache-efficient, sandboxed, builds as code._

* <ins>Native</ins> support with any Docker installation, no extra tools needed
* <ins>Infrastructure-as-code</ins> for container images
* <ins>Cache-efficient</ins>: Represent any build graph in dacc
* <ins>Extend</ins>: [__merge__](examples/merge.ts), [__diff__](examples/diff.ts), and [__nested builds__](examples/nested-builds.ts) operations

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
cd hello-dacc && npm start
```
