import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const sharedPlugins = [
    typescript({ tsconfig: "tsconfig.json" }),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
];

const input = "src/index.ts";

/** @type {import('rollup').RollupOptions} */
export default [
    // CommonJS bundle
    {
        input,
        output: {
            file: "dist/index.cjs",
            format: "cjs",
            sourcemap: true,
        },
        plugins: sharedPlugins
    },
    // ES Modules bundle
    {
        input,
        output: {
            file: "dist/index.esm.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: sharedPlugins
    },
    // Minified bundle
    {
        input,
        output: {
            file: "dist/index.min.js",
            format: "iife",
            name: "dacc",
            sourcemap: true,
        },
        plugins: [
            ...sharedPlugins,
            terser(),
        ],
    },
    // Declaration file
    {
        input,
        output: [
            { file: "dist/index.d.ts", format: "es" }
        ],
        plugins: [dts()],
    },
];