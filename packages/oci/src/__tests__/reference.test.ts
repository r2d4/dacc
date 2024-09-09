import { describe, expect, test } from '@jest/globals';
import { ImageReference } from '../reference';


describe('Docker Image Reference Parser', () => {
    // Helper function to test parsing and familiarization
    const testParse = (input: string, expectedParsed: string, expectedFamiliar: string) => {
        const parsed = ImageReference.parse(input);
        expect(parsed.string()).toBe(expectedParsed);
    };

    // Test cases for various reference formats
    test.each([
        ['ubuntu', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['ubuntu:latest', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['ubuntu:18.04', 'docker.io/library/ubuntu:18.04', 'ubuntu:18.04'],
        ['library/ubuntu', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['library/ubuntu:latest', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['docker.io/library/ubuntu', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['docker.io/library/ubuntu:latest', 'docker.io/library/ubuntu:latest', 'ubuntu:latest'],
        ['docker.io/library/ubuntu:18.04', 'docker.io/library/ubuntu:18.04', 'ubuntu:18.04'],
    ])('should parse official images: %s', testParse);

    test.each([
        ['user/repo', 'docker.io/user/repo:latest', 'user/repo:latest'],
        ['user/repo:latest', 'docker.io/user/repo:latest', 'user/repo:latest'],
        ['user/repo:v1.0', 'docker.io/user/repo:v1.0', 'user/repo:v1.0'],
        ['docker.io/user/repo', 'docker.io/user/repo:latest', 'user/repo:latest'],
        ['docker.io/user/repo:latest', 'docker.io/user/repo:latest', 'user/repo:latest'],
        ['docker.io/user/repo:v1.0', 'docker.io/user/repo:v1.0', 'user/repo:v1.0'],
    ])('should parse user repositories: %s', testParse);

    test.each([
        ['gcr.io/project/image', 'gcr.io/project/image:latest', 'gcr.io/project/image:latest'],
        ['gcr.io/project/image:latest', 'gcr.io/project/image:latest', 'gcr.io/project/image:latest'],
        ['gcr.io/project/image:v1.0', 'gcr.io/project/image:v1.0', 'gcr.io/project/image:v1.0'],
        ['quay.io/user/repo', 'quay.io/user/repo:latest', 'quay.io/user/repo:latest'],
        ['quay.io/user/repo:latest', 'quay.io/user/repo:latest', 'quay.io/user/repo:latest'],
        ['quay.io/user/repo:v1.0', 'quay.io/user/repo:v1.0', 'quay.io/user/repo:v1.0'],
    ])('should parse images from other registries: %s', testParse);

    test.each([
        [
            'ubuntu@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'docker.io/library/ubuntu@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'ubuntu@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
        [
            'user/repo@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'docker.io/user/repo@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'user/repo@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
        [
            'gcr.io/project/image@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'gcr.io/project/image@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'gcr.io/project/image@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
    ])('should parse digested references: %s', testParse);

    test.each([
        [
            'ubuntu:latest@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'docker.io/library/ubuntu@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'ubuntu@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
        [
            'user/repo:v1.0@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'docker.io/user/repo@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'user/repo@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
        [
            'gcr.io/project/image:v1.0@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'gcr.io/project/image@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
            'gcr.io/project/image@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa',
        ],
    ])('should parse references with both tag and digest: %s', testParse);

    // Test error cases
    test.each([
        [''],
        [' '],
        ['invalid/url/'],
        ['UPPERCASE/repo'],
        ['docker.io/UPPERCASE/repo'],
        ['../../path/traversal'],
        ['docker.io/../../path/traversal'],
        ['repo@invaliddigest'],
        ['repo@sha256:invalidhash'],
    ])('should throw an error for invalid reference: %s', (input) => {
        expect(() => ImageReference.parse(input)).toThrow();
    });

    // Test specific properties
    test('should correctly parse name, tag, and digest', () => {
        const ref = ImageReference.parse('docker.io/user/repo:v1.0@sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa');
        expect(ref.name).toBe('docker.io/user/repo');
        expect(ref.tag).toBe("v1.0");
        expect(ref.digest).toBe('sha256:7cc4b5aefd1d0cadf8d97d4350462ba51c694ebca145b08d7d41b41acc8db5aa');
    });

    // Test localhost references
    test.each([
        ['localhost/repo', 'localhost/repo:latest', 'localhost/repo:latest'],
        ['localhost:5000/repo', 'localhost:5000/repo:latest', 'localhost:5000/repo:latest'],
        ['localhost:5000/repo:tag', 'localhost:5000/repo:tag', 'localhost:5000/repo:tag'],
    ])('should parse localhost references: %s', testParse);

    // Test IP address references
    test.each([
        ['127.0.0.1/repo', '127.0.0.1/repo:latest', '127.0.0.1/repo:latest'],
        ['127.0.0.1:5000/repo', '127.0.0.1:5000/repo:latest', '127.0.0.1:5000/repo:latest'],
        ['[::1]/repo', '[::1]/repo:latest', '[::1]/repo:latest'],
        ['[::1]:5000/repo', '[::1]:5000/repo:latest', '[::1]:5000/repo:latest'],
    ])('should parse IP address references: %s', testParse);

    // Test legacy index.docker.io domain
    test('should handle legacy index.docker.io domain', () => {
        const ref = ImageReference.parse('index.docker.io/user/repo');
        expect(ref.string()).toBe('docker.io/user/repo:latest');
    });
});