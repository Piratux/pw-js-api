import type { ColItem, ColQuery } from "../types/api.js";

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

// console.log(queryToString<ColWorld>({ filter: { id: "a" } }));
// console.log(queryToString<ColWorld>({ filter: { id: "a", created: "nice" } }));
// console.log(queryToString<ColWorld>({ filter: "a~b,ok=lol" }));

// console.log(queryToString<ColWorld>({ sort: ["collectionId", ["id", "ASC"], "collectionName", ["created", "DESC"], ["description"]] }));