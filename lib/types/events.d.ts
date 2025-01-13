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
}

export type MergedEvents = WorldEvents & CustomBotEvents;