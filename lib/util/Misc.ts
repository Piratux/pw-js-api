import type { ColItem, ColQuery } from "../types/api.js";
import type { CustomBotEvents, MergedEvents } from "../types/events.js";

export function queryToString<T extends ColItem>(query: ColQuery<T> | undefined) {
    if (typeof query === "undefined") return "";

    let str = "";

    if (query.filter) {
        if (typeof query.filter !== "string") {
            str += "&filter=";

            const filters = Object.entries(query.filter);

            for (let i = 0, len = filters.length; i < len; i++) {
                const filt = filters[i];

                if (typeof filt[1] === "string") str += `${filt[0]}="${filt[1]}"`;
                // boolean gets toString() to true or false so eh
                else str += `${filt[0]}=${filt[1]}`;
            }
        } else str += "&filter=" + query.filter;
    }

    if (query.sort) {
        if (typeof query.filter !== "string") {
            str += "&sort=";

            // if (Array.isArray(query.sort)) {

            // } else {
                const sorts = Array.isArray(query.sort) ? query.sort : Object.entries(query.sort) as [string, "ASC"|"DESC"][];

                for (let i = 0, len = sorts.length; i < len; i++) {
                    const sort = sorts[i] as [string, "ASC"|"DESC"] | string | [string];

                    if (typeof sort === "string") str += sort + ",";
                    else if (sort[1] === undefined) str += sort[0] + ",";
                    else if (sort[1] === "ASC") str += sort[0] + ",";
                    else if (sort[1] === "DESC") str += "-" + sort[0] + ",";
                }

                if (sorts.length) str = str.slice(0, -1);
            // }
        } else str += "&sort=" + query.sort;
    }

    return str;
}

/**
 * This takes in two parameters - Object A and B.
 * 
 * Object A will be used as the object to add properties from Object B to.
 * If some of the properties in Object B are also objects, this will run recursively to ensure they are all added.
 * 
 * Annoyingly, due to how Typescript works, the only way I could get an object with combined properties is if I return it so rip mutability.
 * 
 * IGNORE THE LAST TWO PARAMETERS.
 */
export function mergeObjects<A extends Record<string, any>, B extends Record<string, any>>(objA: A, objB: B, depth = 0, prevObj?: any) : A & B {
    const keys = Object.keys(objB);
    const obj = depth > 0 ? objA : structuredClone(objA) as any;

    for (let i = 0; i < keys.length; i++) {
        const propA = objA[keys[i]];
        const propB = objB[keys[i]];

        if (typeof propB === "object" && propB !== null) {
            if (typeof propA !== "object" || propA === null) {
                obj[keys[i]] = {};
            }

            mergeObjects(obj[keys[i]], propB, depth + 1)
        } else obj[keys[i]] = propB;
    }

    return obj;
}

// console.log(queryToString<ColWorld>({ filter: { id: "a" } }));
// console.log(queryToString<ColWorld>({ filter: { id: "a", created: "nice" } }));
// console.log(queryToString<ColWorld>({ filter: "a~b,ok=lol" }));

// console.log(queryToString<ColWorld>({ sort: ["collectionId", ["id", "ASC"], "collectionName", ["created", "DESC"], ["description"]] }));

export function isCustomPacket(type: keyof MergedEvents) : type is keyof CustomBotEvents {
    return type === "debug" || type === "unknown" || type === "raw";
}