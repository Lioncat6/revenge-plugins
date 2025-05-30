import { readFile, writeFile, readdir } from "fs/promises";
import { extname } from "path";
import { createHash } from "crypto";

import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

/** @type import("rollup").InputPluginOption */
const plugins = [
    nodeResolve(),
    commonjs(),
    {
        name: "swc",
        async transform(code, id) {
            const ext = extname(id);
            if (!extensions.includes(ext)) return null;

            const ts = ext.includes("ts");
            const tsx = ts ? ext.endsWith("x") : undefined;
            const jsx = !ts ? ext.endsWith("x") : undefined;

            const result = await swc.transform(code, {
                filename: id,
                jsc: {
                    externalHelpers: true,
                    parser: {
                        syntax: ts ? "typescript" : "ecmascript",
                        tsx,
                        jsx,
                    },
                },
                env: {
                    targets: "defaults",
                    include: [
                        "transform-classes",
                        "transform-arrow-functions",
                    ],
                },
            });
            return result.code;
        },
    },
    esbuild({ minify: true }),
];

const ImportMap = {
    react: "window.React",
    // Add other global mappings here if needed
};


for (let plug of await readdir("./plugins")) {
    const manifest = JSON.parse(await readFile(`./plugins/${plug}/manifest.json`));
    const outPath = `./dist/${plug}/index.js`;

    try {
        const bundle = await rollup({
            input: `./plugins/${plug}/${manifest.main}`,
            onwarn: () => {},
            plugins,
        });

        const code = await bundle
            .write({
                file: outPath,
                globals(id) {
                    if (ImportMap[id]) return ImportMap[id];

                    const replaceSlashWithDot = (s) => s.replaceAll('/', '.');

                    if (id.startsWith('@vendetta')) return replaceSlashWithDot(id.substring(1));
                    if (id.startsWith('@revenge-mod')) return `bunny${replaceSlashWithDot(id.substring(12))}`;
                    if (id.startsWith('@revenge-mod/revenge/src')) {
                        console.warn('Importing from `node_modules`, please change.');
                        const path = id.substring(25);
                        if (path.startsWith('metro')) return `bunny.${replaceSlashWithDot(path)}`;
                        if (path.startsWith('lib')) return `bunny.${replaceSlashWithDot(path.substring(3))}`;
                        console.warn(`Unable to resolve import path for "${path}"!`);
                    }

                    throw new Error(`Unable to resolve import path for: ${id}`);
                },
                format: 'iife',
                compact: true,
                exports: 'named',
            })
            .then(result => result.output[0].code);

        await bundle.close();

        manifest.main = 'index.js';
        manifest.hash = createHash("sha256").update(code).digest("hex");
        await writeFile(`./dist/${plug}/manifest.json`, JSON.stringify(manifest));

        console.log(`Successfully built ${manifest.name}!`);
    } catch (e) {
        console.error("Failed to build plugin...", e);
        process.exit(1);
    }
}
