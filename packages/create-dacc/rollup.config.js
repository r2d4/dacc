import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';

const sharedPlugins = [
    typescript({ tsconfig: "tsconfig.json" }),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    copy({
        targets: [
            { src: 'template', dest: 'dist' },
            { src: 'package.json', dest: 'dist' },
        ]
    })
];

const input = "src/index.ts";

/** @type {import('rollup').RollupOptions} */
export default [
    // ES Modules bundle
    {
        input,
        output: {
            file: "dist/index.esm.js",
            format: "esm",
        },
        plugins: sharedPlugins
    },
];