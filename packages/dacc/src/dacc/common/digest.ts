import { createHash } from 'crypto';

export class Digest {
    private algorithm: string;
    private checksum: Uint8Array;

    private constructor(algorithm: string, checksum: Uint8Array) {
        this.algorithm = algorithm;
        this.checksum = checksum;
    }

    toString(): string {
        return `${this.algorithm}:${this.toHex()}`;
    }

    toHex(): string {
        return Array.from(this.checksum)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    getAlgorithm(): string {
        return this.algorithm;
    }

    getChecksum(): Uint8Array {
        return this.checksum;
    }

    equals(other: Digest): boolean {
        return this.algorithm === other.algorithm &&
            this.checksum.length === other.checksum.length &&
            this.checksum.every((byte, index) => byte === other.checksum[index]);
    }

    static create(algorithm: string, data: Uint8Array): Digest {
        const cryptoAlgorithm = this.mapToCryptoAlgorithm(algorithm);
        const hash = createHash(cryptoAlgorithm);
        hash.update(data);
        const hashBuffer = hash.digest();
        const hashArray = new Uint8Array(hashBuffer);
        return new Digest(algorithm, hashArray);
    }

    static fromString(digestString: string): Digest {
        const [algorithm, hexChecksum] = digestString.split(':');
        if (!algorithm || !hexChecksum) {
            throw new Error('Invalid digest string format');
        }
        const bytes = new Uint8Array(hexChecksum.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        return new Digest(algorithm, bytes);
    }

    clone(): Digest {
        return new Digest(this.algorithm, new Uint8Array(this.checksum));
    }

    private static mapToCryptoAlgorithm(algorithm: string): string {
        switch (algorithm.toLowerCase()) {
            case 'sha256':
                return 'sha256';
            case 'sha384':
                return 'sha384';
            case 'sha512':
                return 'sha512';
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    static validate(digestString: string): boolean {
        try {
            const [algorithm, hexChecksum] = digestString.split(':');

            // Check if both algorithm and hexChecksum are present
            if (!algorithm || !hexChecksum) {
                return false;
            }

            // Check if the algorithm is supported
            const supportedAlgorithms = ['sha256', 'sha384', 'sha512'];
            if (!supportedAlgorithms.includes(algorithm.toLowerCase())) {
                return false;
            }

            // Check if the hexChecksum is a valid hex string
            const hexRegex = /^[0-9A-Fa-f]+$/;
            if (!hexRegex.test(hexChecksum)) {
                return false;
            }

            // Check if the hexChecksum has the correct length
            const expectedLength = algorithm.toLowerCase() === 'sha256' ? 64 :
                algorithm.toLowerCase() === 'sha384' ? 96 : 128;
            if (hexChecksum.length !== expectedLength) {
                return false;
            }

            // If all checks pass, consider the digest string valid
            return true;
        } catch (error) {
            // If any error occurs during validation, consider the digest string invalid
            return false;
        }
    }
}
