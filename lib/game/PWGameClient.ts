import type PWApiClient from "../api/PWApiClient.js";
import { type Ping, type PlayerChatPacket, type WorldBlockFilledPacket, type WorldBlockPlacedPacket, WorldPacketSchema } from "../gen/world_pb.js";
import type { GameClientSettings, WorldJoinData } from "../types/game.js"
import { Endpoint } from "../util/Constants.js";

import { WebSocket } from "isows";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import type { MergedEvents, WorldEvents } from "../types/events.js";
import Bucket from "../util/Bucket.js";
import type { OmitRecursively, Optional, Promisable } from "../types/misc.js";

export default class PWGameClient {
    settings: GameClientSettings;

    api?: PWApiClient;
    socket?: WebSocket;

    private prevWorldId?: string;

    protected totalBucket = new Bucket(100, 1000);
    protected chatBucket = new Bucket(10, 1000);

    /**
     * NOTE: After constructing, you must then run .init() to connect the API IF you're using email/password.
     */
    constructor(api: PWApiClient, settings?: Partial<GameClientSettings>);
    constructor(settings?: Partial<GameClientSettings>);
    constructor(api?: PWApiClient | Partial<GameClientSettings>, settings?: Partial<GameClientSettings>) {
        // I can't use instanceof cos of circular reference kms.
        if (api && "getJoinKey" in api) this.api = api;
        else if (api) {
            settings = api;
            api = undefined;
        }

        this.settings = {
            reconnectable: settings?.reconnectable ?? true,
            reconnectCount: settings?.reconnectCount ?? 3,
            reconnectInterval: settings?.reconnectInterval ?? 5500,
            handlePackets: settings?.handlePackets ?? ["PING"]
        };
    }

    get connected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    /**
     * This will connect to the world.
     * 
     * (This returns itself for chaining)
     */
    async joinWorld(roomId: string, joinData?: WorldJoinData) : Promise<PWGameClient> {
        if (!this.api) throw Error("This can only work if you've used APIClient to join the world in the first place.");

        if (this.socket?.readyState === WebSocket.CONNECTING) throw Error("Already trying to connect.");
        // if (!this.api.loggedIn) throw Error("API isn't logged in, you must use authenticate first.");

        const roomType = this.api.roomTypes?.[0] ?? await this.api.getRoomTypes().then(rTypes => rTypes[0]);

        const joinReq = await this.api.getJoinKey(roomType, roomId);

        if (!("token" in joinReq) || joinReq.token.length === 0) throw Error("Unable to secure a join key - is account details valid?");

        const connectUrl = `${Endpoint.GameWS}/room/${joinReq.token}`
            + (joinData === undefined ? "" : "?joinData=" + btoa(JSON.stringify(joinData)));

        this.prevWorldId = roomId;

        let count = this.settings.reconnectCount ?? 3;

        return new Promise((res, rej) => {
            const timer = setTimeout(() => {
                if (count-- < 0) rej(new Error("Unable to (re)connect."));
                this.invoke("debug", "Failed to reconnect, retrying.");

                this.socket = this.createSocket(connectUrl, timer, res);

                timer.refresh();
            }, this.settings.reconnectInterval ?? 5500);

            this.socket = this.createSocket(connectUrl, timer, res);
        });
    }

    /**
     * INTERNAL
     */
    private createSocket(url: string, timer: NodeJS.Timeout, res: (value: PWGameClient) => void) {
        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        socket.onclose = this.onSocketClose.bind(this);
        socket.onmessage = this.onSocketMessage.bind(this);

        socket.onopen = (evt) => {
            clearTimeout(timer);
    
            this.invoke("debug", "Connected successfully.");
            // console.log("Connected.");
            // console.log("Connected: " + new Date(ev.timeStamp));

            res(this);
        };

        return socket;
    }

    /**
     * This is a more direct route if you already have a join key acquired via Pixelwalker's API.
     * 
     * Useful for those wary of security.
     */
    static joinWorld(joinKey: string, obj?: { joinData?: WorldJoinData, gameSettings?: Partial<GameClientSettings> }) {
        const connectUrl = `${Endpoint.GameWS}/room/${joinKey}`
            + (obj?.joinData === undefined ? "" : "?joinData=" + btoa(JSON.stringify(obj.joinData)));

        const cli = new PWGameClient(obj?.gameSettings);

        let count = cli.settings.reconnectCount ?? 3;

        return new Promise((res, rej) => {
            const timer = setTimeout(() => {
                if (count-- < 0) rej(new Error("Unable to (re)connect."));
                cli.invoke("debug", "Failed to reconnect, retrying.");
                // I know this is impossible but anyway

                cli.socket = cli.createSocket(connectUrl, timer, res);

                timer.refresh();
            }, cli.settings.reconnectInterval ?? 5500);

            cli.socket = cli.createSocket(connectUrl, timer, res);
        });
    }

    protected onSocketClose(evt: CloseEvent) {
        this.invoke("debug", `Server closed connection due to code: ${evt.code}, reason: ${evt.reason}.`);

        if (this.settings.reconnectable) {
            if (this.api === undefined) return this.invoke("debug", "Not attempting to reconnect as this game client was created with a join token.");

            if (this.prevWorldId) return this.joinWorld(this.prevWorldId);
            else this.invoke("debug", "Warning: Socket closed, attempt to reconnect was made but no previous world id was kept.");
        }
    }

    protected onSocketMessage(evt: MessageEvent) {
        const { packet } = fromBinary(WorldPacketSchema, evt.data instanceof ArrayBuffer ? new Uint8Array(evt.data as ArrayBuffer) : evt.data);

        this.invoke("debug", "Received " + packet.case);

        if (packet.case === undefined) {  
            return this.invoke("unknown", packet.value)
        } else this.invoke("raw", packet);//this.callbacks.raw?.(packet);;

        switch (packet.case) {
            case "playerInitPacket":
                if (this.settings.handlePackets.findIndex(v => v === "INIT") !== -1)
                    this.send("playerInitReceived");

                if (packet.value.playerProperties?.isWorldOwner) this.totalBucket.interval = 250;
                else this.totalBucket.interval = 100;
                break;
            case "ping":
                if (this.settings.handlePackets.findIndex(v => v === "PING") !== -1)
                    this.send("ping", undefined, true);
                break;
        }

        this.invoke(packet.case, packet.value);
    }

    // listen<Event extends keyof WorldEvents>(type: Event) {
    //     type === ""
    // }

    /**
     * For faster performance (even if it seems insignificant),
     * direct functions are used instead of events which are also inconsistent with browsers/nodejs etc.
     * 
     * NOTE: the "this" won't be the client itself. You will need to bind yourself if you want to keep this.
     */
    protected callbacks = {

    } as Partial<{ [K in keyof MergedEvents]: Array<(data: MergedEvents[K]) => Promisable<void | "STOP">> }>;

    /**
     * Adds a listener for the event type, it can even be a promise too.
     * 
     * If the callback returns a specific string "STOP", it will prevent further listeners from being invoked.
     */
    addCallback<Event extends keyof MergedEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event]) => Promisable<void | "STOP">>) : PWGameClient {
        // this.callbacks[type] = cb;

        if (this.callbacks[type] === undefined) this.callbacks[type] = [];

        if (cbs.length === 0) return this;

        this.callbacks[type].push(...cbs);

        return this;
    }

    /**
     * @param type The type of the event
     * @param cb It can be the function itself (to remove that specific function). If undefined, it will remove ALL functions from that list, it will return undefined.
     */
    removeCallback<Event extends keyof MergedEvents>(type: Event, cb?: (data: MergedEvents[Event]) => Promisable<void | "STOP">) : undefined | ((data: MergedEvents[Event]) => Promisable<void | "STOP">) {
        const callbacks = this.callbacks[type];

        if (callbacks === undefined || cb === undefined) { callbacks?.splice(0); return; }
        else {
            for (let i = 0, len = callbacks.length; i < len; i++) {
                if (callbacks[i] === cb) {
                    return callbacks.splice(i, 1)[0];
                }
            }
        }

        return;
    }

    /**
     * INTERNAL. Invokes all functions of a callback type, unless one of them prohibits in transit.
     */
    protected async invoke<Event extends keyof MergedEvents>(type: Event, data: MergedEvents[Event]) : Promise<number> {
        const cbs = this.callbacks[type];
        
        let count = 0;

        if (cbs === undefined) return count;

        for (let i = 0, len = cbs.length; i < len; i++) {
            const res = await cbs[i](data);

            count++;

            if (res === "STOP") return count; 
        }

        return count;
    }

    /**
     * This assumes that the connection 
     * 
     * @param type Type of the packet.
     * @param value Value of the packet to send along with, note that some properties are optional.
     * @param direct If it should skip queue.
     */
    send<Event extends keyof WorldEvents>(type: Event, value?: OmitRecursively<Sendable<Event, WorldEvents>, "$typeName"|"$unknown">, direct = false) {
        this.invoke("debug", "Sent " + type + " with " + (value === undefined ? "0" : Object.keys(value).length) + " parameters.");

        const send = () => this.socket?.send(
            toBinary(WorldPacketSchema, create(WorldPacketSchema, { packet: { case: type, value } as unknown as { case: "ping", value: Ping } }))
        );

        if (direct) return send();

        this.totalBucket.queue(() => {
            if (type !== "playerChatPacket") send() 
            else this.chatBucket.queue(() => { send() });
        }, type === "playerChatPacket")
    }

    /**
     * By default this will set the game client settings reconnectable to false.
     * 
     * If reconnect is true, an additionl parameter can be passed which is the amount of time to wait before it attempts to reconnect (DEFAULT: none)
     */
    disconnect(reconnect: number | boolean =false) {
        // Accept the possibility that people may try to 
        if (reconnect === true) this.settings.reconnectable = true;
        else this.settings.reconnectable = false;

        this.socket?.close();

        return this.socket?.readyState === WebSocket.CLOSED;
    }
}

// "WorldBlockFilledPacket" doesn't even bloody work, but I cba as this will make do since block place is the only thing matters.
type Sendable<E extends keyof WorldEvents, WE extends WorldEvents>
    = E extends "worldBlockPlacedPacket" ? Optional<WorldBlockPlacedPacket, "extraFields"> 
    : E extends "WorldBlockFilledPacket" ? Optional<WorldBlockFilledPacket, "extraFields">
    : E extends "playerChatPacket" ? Omit<PlayerChatPacket, "playerId"> : WE[E];