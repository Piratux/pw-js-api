import PWGameClient from "../game/PWGameClient.js";
import type { APIFailure, AuthResultSuccess, CollectionResult, ColPlayer, ColQuery, ColWorld, JoinKeyResult, LobbyResult } from "../types/api.js";
import type { GameClientSettings, WorldJoinData } from "../types/game.js";
import { Endpoint } from "../util/Constants.js";
import { queryToString } from "../util/Misc.js";

/**
 * Note if you want to join a world, use new PWGameClient() then run .init()
 */
export default class PWApiClient {
    /**
     * The account token, this is private to prevent tampering.
     */
    #token?: string;

    /**
     * Account details with email and password, if applicable.
     */
    #account = {
        email: "",
        password: ""
    }

    loggedIn = false;

    /**
     * This will create an instance of the class, as you're using the token, it will automatically be marked as loggedIn.
     * @param token Must be a valid account token.
     */
    constructor(token: string);
    /**
     * This will create an instance of the class, as you're putting the account details, you must manually authenticate before invoking restricted calls including joinRoom.
     * If populating email and password, you must manually authenticate yourself.
     */
    constructor(email: string, password: string);
    constructor(email: string, password?: string) {
        if (password === undefined) {
            this.#token = email;
            this.loggedIn = true;
            return;
        }

        this.#account.email = email;
        this.#account.password = password;

        // this.#token = token;
    }

    /**
     * Connects the API instance to the server.
     * This will enable the client to join the room, or access to restricted collections.
     */
    authenticate() : Promise<AuthResultSuccess | APIFailure>;
    /**
     * Overrides local account details, the parameters are not needed if PW Api was already created with email/password in the first place.
     */
    authenticate(email?: string, password?: string) : Promise<AuthResultSuccess | APIFailure>;
    authenticate(email?: string, password?: string) {
        if (email === undefined) {
            if (this.#account.email.length === 0 || this.#account.password.length === 0) throw Error("No email/password given.");

            email = this.#account.email;
            password = this.#account.password;
        }

        return this.request<AuthResultSuccess | APIFailure>(`${Endpoint.Api}/api/collections/users/auth-with-password`,
            { identity: email, password }
        ).then(res => {
            if ("token" in res) {
                this.#token = res.token;
                this.loggedIn = true;
            }

            return res;
        });//.then(console.log);
    }

    /**
     * Internal.
     */
    getJoinKey(roomType: string, roomId: string) {
        return this.request<JoinKeyResult>(`${Endpoint.Api}/api/joinkey/${roomType}/${roomId}`, undefined, true);
    }

    /**
     * This route is available to take if you chose to create an API client to then join a world, in which case this returns the Game Client instance.
     * 
     * Make sure the API client is already authenticated before calling this.
     * 
     * The 3rd parameter is for if you wish to customise the reconnectability of the game client.
     */
    joinWorld(roomId: string, joinData?: WorldJoinData, gameSettings?: GameClientSettings) {
        const game = new PWGameClient(this, gameSettings);

        return game.joinWorld(roomId, joinData);
    }
    
    /**
     * This will be an empty array if getRoomTypes has never been used successfully at least once.
     */
    static roomTypes:string[] = [];

    // I feel like this is cursed.
    /**
     * This will be an empty array if getRoomTypes has never been used successfully at least once.
     */
    get roomTypes() {
        return PWApiClient.roomTypes;
    }

    /**
     * Non-authenticated. This will refresh the room types each time, so make sure to check if roomTypes is available.
     */
    getRoomTypes() {
        return this.request<string[]>(`${Endpoint.GameHTTP}/listroomtypes`)
            .then(res => {
                PWApiClient.roomTypes = res;

                return res;
            })
    }

    /**
     * Non-authenticated. Returns the mappings from the game API.
     */
    getMappings() {
        return this.request<Record<string, number>>(`${Endpoint.GameHTTP}/mappings`);
    }

    /**
     * Returns the collection result of the query - your own worlds.
     * Default: page - 1, perPage - 10
     */
    getOwnedWorlds(page: number, perPage: number, query?: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getOwnedWorlds(query: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getOwnedWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number = 10, query?: ColQuery<ColWorld>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColWorld>>(`${Endpoint.Api}/api/collections/worlds/records?page=${page}&perPage=${perPage}${queryToString(query)}`, undefined, true);
    }

    /**
     * Returns the collection result of the query - players.
     * Default: page - 1, perPage - 10
     */
    getPlayers(page: number, perPage: number, query?: ColQuery<ColPlayer>) : Promise<CollectionResult<ColPlayer>>;
    getPlayers(query: ColQuery<ColPlayer>) : Promise<CollectionResult<ColPlayer>>;
    getPlayers(page: number | ColQuery<ColPlayer> = 1, perPage: number = 10, query?: ColQuery<ColPlayer>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColPlayer>>(`${Endpoint.Api}/api/collections/public_profiles/records?page=${page}&perPage=${perPage}${queryToString(query)}`);
    }

    /**
     * Returns the collection result of the query - public worlds.
     * Default: page - 1, perPage - 10
     */
    getPublicWorlds(page: number, perPage: number, query?: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getPublicWorlds(query: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getPublicWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number = 10, query?: ColQuery<ColWorld>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColWorld>>(`${Endpoint.Api}/api/collections/public_worlds/records?page=${page}&perPage=${perPage}${queryToString(query)}`);
    }

    /**
     * Returns the lobby result.
     */
    getVisibleWorlds() {
        if (this.roomTypes.length === 0) throw Error("roomTypes is empty - use getRoomTypes first!");

        return this.request<LobbyResult>(`${Endpoint.GameHTTP}/room/list/${this.roomTypes[0]}`)
    }

    /**
     * Returns the world, if it exists and is public.
     */
    getPublicWorld(id: string) : Promise<ColWorld | undefined> {
        return this.getPublicWorlds(1, 1, { filter: { id } })
            .then(res => res.items[0]);
    }

    /**
     * Gets the raw minimap bytes, the format may differ depending on the environment (Bun, NodeJS, Browser etc).
     */
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL?: false) : Promise<Buffer>
    /**
     * Gives the URL pointing to the minimap image.
     */
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL: true) : string;
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL = false) {
        if (toURL) return `${Endpoint.Api}/api/files/rhrbt6wqhc4s0cp/${world.id}/${world.minimap}`;

        return this.request<ArrayBuffer|APIFailure>(this.getMinimap(world, true))
            .then(res => {
                if ("message" in res) throw Error("Minimap doesn't exist, the world may be unlisted.");

                return res;
            });
    }

    /**
     * Note that username is cap sensitive, and may require you to use toUppercase
     */
    getPlayerByName(username: string) {
        return this.getPlayers(1, 1, { filter: { username } });
    }

    // This doesn't seem to work so I commented it out, not removing it as there might be an oversight idk
    // getMessageTypes() {
    //     return this.request<string[]>(`${Endpoint.GameHTTP}/message_types`)
    //         .then(res => res instanceof Uint8Array ? [] : res ?? []);
    // }

    // TODO: QUERY FILTER AND STUFF!
    // https://github.com/MartenM/PixelPilot/blob/main/src/PixelPilot.Core/Api/PixelApiClient.cs very helpful yummy

    /**
     * IMPORTANT: This will return JSON for any responses that have the content-type of json, anything else will be sent back as Uint8array.
     * If you're expecting raw bytes, make sure the endpoint is guaranteed to give you that otherwise there isn't a reason.
     * 
     * This requires the manager to be authenticated, it will error if otherwise.
     * @param url Requires to be a full URL with endpoint unfortunately. It will throw error if it doesn't match any of the 2 HTTP endpoint URLs.
     * @param body If this is passed, the request will become a POST. (If you need to send a POST but has no data, just send an empty object).
     * @param isAuthenticated If true, this will send the token as the header.
     */
    protected request<T>(url: string, body?: Record<string, any>|string, isAuthenticated = false) : Promise<T> {
        if (!(url.startsWith(Endpoint.Api) || url.startsWith(Endpoint.GameHTTP))) throw Error("URL given does not have the correct endpoint URL, this is for safety.");

        const headers:Record<string, string> = {
            // "user-agent": "PW-TS-API/0.0.1"
        };

        if (this.#token && isAuthenticated) headers["authorization"] = this.#token;

        if (typeof body === "object") body = JSON.stringify(body);

        let method = "GET";

        if (typeof body !== "undefined") {
            headers["content-type"] = "application/json";
            method = "POST";
        }

        return fetch(url, {
            headers, method,
            body: body
        }).then(res => {
            if (res.status === 403) throw Error("Forbidden access - token invalid or unauthorised.");
            // else if (res.status !== 200) throw Error("")

            if (res.headers.get("content-type")?.startsWith("application/json")) return res.json() as T;
            else return res.arrayBuffer() as T;
        });
    }
}