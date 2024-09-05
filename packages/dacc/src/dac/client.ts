import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type ByteUnit = 'b' | 'k' | 'm' | 'g';

export interface DockerBuildOptions {
    addHost?: string[];
    allow?: string[];
    annotation?: string[];
    attest?: string[];
    buildArg?: string[];
    buildContext?: string[];
    builder?: string;
    cacheFrom?: string[];
    cacheTo?: string[];
    call?: 'check' | 'outline' | 'targets' | 'build';
    cgroupParent?: string;
    check?: boolean;
    contextPath?: string;
    file?: string;
    iidfile?: string;
    label?: string[];
    load?: boolean;
    metadataFile?: string;
    network?: string;
    noCache?: boolean;
    noCacheFilter?: string[];
    output?: string[];
    platform?: string[];
    progress?: 'auto' | 'plain' | 'tty' | 'rawjson';
    provenance?: string;
    pull?: boolean;
    push?: boolean;
    quiet?: boolean;
    sbom?: string;
    secret?: string[];
    shmSize?: number;
    shmSizeUnit?: ByteUnit;
    ssh?: string[];
    tag?: string[];
    target?: string;
    ulimit?: string[];
}


export interface DockerRunOptions {
    addHost?: string[];
    annotation?: Record<string, string>;
    attach?: ('STDIN' | 'STDOUT' | 'STDERR')[];
    blkioWeight?: number;
    blkioWeightDevice?: string[];
    capAdd?: string[];
    capDrop?: string[];
    cgroupParent?: string;
    cgroupns?: 'host' | 'private';
    cidfile?: string;
    cpuPeriod?: number;
    cpuQuota?: number;
    cpuRtPeriod?: number;
    cpuRtRuntime?: number;
    cpuShares?: number;
    cpus?: number;
    cpusetCpus?: string;
    cpusetMems?: string;
    detach?: boolean;
    detachKeys?: string;
    device?: string[];
    deviceCgroupRule?: string[];
    deviceReadBps?: string[];
    deviceReadIops?: string[];
    deviceWriteBps?: string[];
    deviceWriteIops?: string[];
    disableContentTrust?: boolean;
    dns?: string[];
    dnsOption?: string[];
    dnsSearch?: string[];
    domainname?: string;
    entrypoint?: string;
    env?: string[];
    envFile?: string[];
    expose?: string[];
    gpus?: string;
    groupAdd?: string[];
    healthCmd?: string;
    healthInterval?: string;
    healthRetries?: number;
    healthStartInterval?: string;
    healthStartPeriod?: string;
    healthTimeout?: string;
    hostname?: string;
    init?: boolean;
    interactive?: boolean;
    ip?: string;
    ip6?: string;
    ipc?: string;
    isolation?: string;
    kernelMemory?: string;
    label?: string[];
    labelFile?: string[];
    link?: string[];
    linkLocalIp?: string[];
    logDriver?: string;
    logOpt?: string[];
    macAddress?: string;
    memory?: string;
    memoryReservation?: string;
    memorySwap?: string;
    memorySwappiness?: number;
    mount?: string[];
    name?: string;
    network?: string;
    networkAlias?: string[];
    noHealthcheck?: boolean;
    oomKillDisable?: boolean;
    oomScoreAdj?: number;
    pid?: string;
    pidsLimit?: number;
    platform?: string;
    privileged?: boolean;
    publish?: string[];
    publishAll?: boolean;
    pull?: 'always' | 'missing' | 'never';
    quiet?: boolean;
    readOnly?: boolean;
    restart?: string;
    rm?: boolean;
    runtime?: string;
    securityOpt?: string[];
    shmSize?: string;
    sigProxy?: boolean;
    stopSignal?: string;
    stopTimeout?: number;
    storageOpt?: string[];
    sysctl?: Record<string, string>;
    tmpfs?: string[];
    tty?: boolean;
    ulimit?: string[];
    user?: string;
    userns?: string;
    uts?: string;
    volume?: string[];
    volumeDriver?: string;
    volumesFrom?: string[];
    workdir?: string;

    command?: string;
    args?: string[];
}



export class DockerBuildClient {
    private buildCommand(options: DockerBuildOptions, dockerfilePath: string): string[] {
        const cmd: string[] = ['docker', 'buildx', 'build'];

        Object.entries(options).forEach(([key, value]) => {
            if (value === undefined || key === 'contextPath' || key === 'node') return;

            const flag = `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;

            if (Array.isArray(value)) {
                value.forEach(v => cmd.push(flag, v));
            } else if (typeof value === 'boolean') {
                if (value) cmd.push(flag);
            } else if (key === 'shmSize') {
                cmd.push(flag, `${value}${options.shmSizeUnit || 'b'}`);
            } else {
                cmd.push(flag, value.toString());
            }
        });

        cmd.push('-f', dockerfilePath, '.');
        return cmd;
    }

    private runCommand(image: string, options: DockerRunOptions): string[] {
        const cmd: string[] = ['docker', 'run'];
        Object.entries(options).forEach(([key, value]) => {
            if (value === undefined) return;
            if (key === 'command' || key === 'args') return; // Skip these for now

            const flag = `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
            if (Array.isArray(value)) {
                value.forEach(v => cmd.push(flag, v));
            } else if (typeof value === 'boolean') {
                if (value) cmd.push(flag);
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([k, v]) => cmd.push(flag, `${k}=${v}`));
            } else {
                cmd.push(flag, value.toString());
            }
        });
        cmd.push(image);

        if (options.command) {
            cmd.push(options.command);
        }
        if (options.args && options.args.length > 0) {
            cmd.push(...options.args);
        }
        return cmd;
    }

    async run(image: string, options: DockerRunOptions = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            const cmd = this.runCommand(image, options);

            const dockerProcess = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
            dockerProcess.on('error', reject);
            dockerProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    const stderr = dockerProcess.stderr?.read()?.toString() || '';
                    reject(new Error(`Docker run failed with exit code ${code}: ${stderr}`));
                }
            });
        });
    }


    async build(dockerfile: string, contextPath: string = '.', options: DockerBuildOptions = {}): Promise<void> {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-build-'));
        const dockerfilePath = path.join(tmpDir, 'Dockerfile');

        try {
            fs.writeFileSync(dockerfilePath, dockerfile);
            const cmd = this.buildCommand(options, dockerfilePath);
            await new Promise<void>((resolve, reject) => {
                const dockerProcess = spawn(cmd[0], cmd.slice(1), {
                    stdio: 'inherit',
                    cwd: contextPath
                });

                dockerProcess.on('error', (error) => {
                    console.error('Spawn error:', error);
                    reject(error);
                });

                dockerProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Docker build failed with exit code ${code}. Command: ${cmd.join(' ')}`));
                    }
                });
            });
        } catch (error) {
            console.error('Error during build:', error);
            throw error;
        } finally {
            try {
                fs.unlinkSync(dockerfilePath);
                fs.rmdirSync(tmpDir);
            } catch (error) {
                console.error('Error cleaning up temporary files:', error);
            }
        }

    }
}

// // Example usage:
// const client = new DockerBuildClient();
// const dockerfile = `
// FROM node:14
// WORKDIR /app
// COPY package*.json ./
// RUN npm install
// COPY . .
// CMD ["npm", "start"]
// `;
// client.build(dockerfile, {
//     tag: ['myapp:latest'],
//     platform: ['linux/arm64'],
//     buildArg: ['NODE_ENV=production'],
//     noCache: true
// })
//     .then(() => console.log('Build completed successfully'))
//     .catch((error) => console.error('Build failed:', error));