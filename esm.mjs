const PWGameClient = ((await import("./dist/game/PWGameClient.js")).default).default;
const PWApiClient = ((await import("./dist/api/PWApiClient.js")).default).default;

const Constants = (await import("./dist/util/Constants.js")).default;

// export * from "./dist/api/PWApiClient.js";

export default {
    PWGameClient, PWApiClient, Constants
};

export {
    PWGameClient, PWApiClient, Constants
};

// const PWGameClient = (await import("./dist/game/PWGameClient.js")).default;

// export {
//     PWGameClient
// }

// export type * from "./types/index";
// export { default as PWApiClient } from "./api/PWApiClient.js";
// export { default as PWGameClient } from "./game/PWGameClient.js";
// export * as Constants from "./util/Constants.js";