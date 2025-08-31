/** @module Types/Events */
import type { WorldPacket } from "../gen/world_pb.js";

export type WorldEventNames = NonNullable<WorldPacket["packet"]["case"]>;
export type WorldEventData<N extends WorldEventNames> = WorldPacket["packet"] & { name: N };

export type WorldEvents = { [K in WorldEventNames]: ((WorldEventData<K> & { case: K })["value"]) }
export type CustomBotEvents = {
    /**
     * CUSTOM: this will include ALL packets, including some that are not pregenerated.
     */
    raw: WorldPacket;
    /**
     * CUSTOM: events whose types are unknown.
     */
    unknown: (any);
    /**
     * CUSTOM: 
     */
    debug: (string);

    /**
     * CUSTOM: this throws if there are errors thrown during the internal processing of packets.
     */
    error: {
        /**
         * Packet case, for eg "ping" or "playerInitPacket" etc
         */
        type?: string,
        /**
         * Most typically it's an Error object
         */
        error: unknown,
    }
}

export type MergedEvents = WorldEvents & CustomBotEvents;