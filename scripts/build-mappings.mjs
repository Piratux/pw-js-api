import { writeFile } from "fs/promises";

/**
 * @type {Record<String, number>}
 */
const mappings = await fetch("https://game.pixelwalker.net/mappings")
    .then(res => res.json());

const entries = Object.entries(mappings);

let tsOutput = "export enum BlockNames {\n";

for (let i = 0, len = entries.length; i < len; i++) {
    tsOutput += "   " + entries[i][0].toUpperCase() + " = " + entries[i][1] + ",\n"
}

tsOutput += `};
/**
 * Despite the name, it's called BlockKeys for the sake of conflict.
 * 
 * Self explanatory.
 */
export type BlockKeys = keyof typeof BlockNames;`

writeFile("./lib/util/block.ts", tsOutput);