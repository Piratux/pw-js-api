/** @module Types/Api */
export interface APIFailure {
    code: number;
    message: string;
    data?: unknown
}

export interface AuthResultSuccess {
    record: AuthResultData;
    token: string;
}

// coulda been ColOwnPlayer but idk
export interface AuthResultData {
    banned: boolean;
    collectionId: string;
    collectionName: string;
    /**
     * Date.
     */
    created: string;
    email: string;
    emailVisibility: boolean;
    face: number;
    /**
     * List of user IDs.
     */
    friends: string[];
    id: string;
    isSuspicious: boolean;
    /**
     * Date.
     */
    lastSeen: string;
    lastWorld: string;
    lastWorldTitle: string;
    role: string;
    /**
     * Date.
     */
    updated: string;
    username: string;
    verified: boolean;
}

export interface JoinKeyResult {
    token: string;
}

export interface CollectionResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: T[];
}

interface ColItem {
    collectionId: string;
    collectionName: string;
    /**
     * Date.
     */
    created: string;
}

export interface ColWorld extends ColItem {
    data: string;
    description: "";
    height: number;
    width: number;
    id: string;
    minimap: string;
    minimapEnabled: boolean;
    owner: string;
    plays: number;
    title: string;
    /**
     * Date.
     */
    updated: string;
    visibility: string;
}

export interface ColPlayer extends ColItem {
    banned: boolean;
    face: number;
    id: string;
    role: string;
    username: string;
}

export interface ColQuery<T extends ColItem> {
    /**
     * Reference: https://pocketbase.io/docs/api-collections/#list-collections
     * 
     * An object containing the filters, string value is for exact (iirc), boolean is for idk.
     * 
     * Can be passed as string, which will be treated as final, allows for more advanced filter rules as it skips parsing.
     */
    filter?: Partial<{ [K in keyof T]: string|boolean }> | string;
    
    //Record<string, string|boolean> | string;
    /**
     * Reference: https://pocketbase.io/docs/api-collections/#list-collections
     * 
     * If object, each property will have the value "ASC" or "DESC".
     * 
     * If array, it 
     * 
     * Can be passed as string, which will be treated as final, allows for more advanced filter rules as it skips parsing.
     */
    sort?: Partial<{ [K in keyof T]: "ASC"|"DESC" }> | (keyof T|[field: keyof T]|[field: keyof T, sortBy: "ASC"|"DESC"])[] | (keyof T)[]
    
    //Record<string, "ASC"|"DESC"> | ([field: string]|[field: string, sortBy: "ASC"|"DESC"])[] | string;
}

export interface LobbyResultWorldData {
    title: string,
    description: string,
    plays: number,
    minimapEnabled: boolean,
    type: number,
}

export interface LobbyResultWorld {
    id: number;
    players: number;
    max_players: number;
    data: LobbyResultWorldData;
}

export interface LobbyResult {
    onlineRoomCount: number;
    onlinePlayerCount: number;
    visibleRooms: LobbyResultWorld[];
}