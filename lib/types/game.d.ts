/** @module Types/Game */

export interface GameClientSettings {
    /**
     * If the client should try to reconnect when it disconnects.
     * 
     * Default: true
     */
    reconnectable: boolean;
    /**
     * Despite the name saying reconnect, this also applies for first time connect.
     * 
     * The amount of times the client should try to reconnect before it gives up.
     * 
     * Default: 5.
     */
    reconnectCount: number;
    /**
     * The interval (in milliseconds) it has to wait each time it's connecting before giving up and trying another one.
     * 
     * NOTE: 4000 is the maximum amount of time before the connection automatically closes if the server doesn't receive init recv back
     * 
     * Default: 4000.
     */
    reconnectInterval: number;
    /**
     * How long (in milliseconds) before the counter for reconnect should reset.
     * 
     * NOTE: The counter will carry over even if the bot has successfully joined a world, so if it joins and leaves the world a lot then it may stop reconnecting.
     * 
     * Default: 10000.
     */
    reconnectTimeGap: number;
    /**
     * There are only 2 values in this list, they will determine whether if the client should handle them automatically or not.
     * 
     * If handlePackets is full, it will automatically handle them all, for eg it will always respond back to ping so you don't have to.
     * 
     * If it's an empty list, you'll be expected to handle them etc.
     * 
     * Default: ["PING"]
     */
    handlePackets: ("PING"|"INIT")[];
}

export interface WorldJoinData {
    world_title: string;
    world_width?: number;
    world_height?: number;
}