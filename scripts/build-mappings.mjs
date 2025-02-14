import { writeFile } from "fs/promises";

/**
 * @type {import("../lib/types/api").ListBlockResult[]}
 */
const mappings = await fetch("https://game.pixelwalker.net/listblocks")
    .then(res => res.json());

// const entries = Object.entries(mappings);

let tsOutput = "export enum BlockNames {\n";

for (let i = 0, len = mappings.length; i < len; i++) {
    tsOutput += "   " + mappings[i].name.toUpperCase() + " = " + mappings[i].id + ",\n"
}

tsOutput += `};
/**
 * Despite the name, it's called BlockKeys for the sake of conflict.
 * 
 * Self explanatory.
 */
export type BlockKeys = keyof typeof BlockNames;`

writeFile("./lib/util/block.ts", tsOutput);