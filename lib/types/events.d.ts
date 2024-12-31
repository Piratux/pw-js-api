/** @module Types/Events */
import { WorldPacket } from "../gen/world_pb.js";

type WorldEvent = WorldPacket["packet"];
export type WorldEventNames = NonNullable<WorldEvent["case"]>;
export type WorldEventData<N extends WorldEventNames> = WorldPacket["packet"] & { name: N };

export type WorldEvents = { [K in WorldEventNames]: ((WorldEventData<K> & { case: K })["value"]) }
export type CustomBotEvents = {
    /**
     * CUSTOM: this will include ALL packets, including some that are not pregenerated.
     */
    raw: ({ case: string, value?: unknown });
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