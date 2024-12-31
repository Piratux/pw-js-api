import type PWApiClient from "../api/PWApiClient.js";
import { Ping, WorldPacketSchema } from "../gen/world_pb.js";
import type { GameClientSettings, WorldJoinData } from "../types/game.js"
import { Endpoint } from "../util/Constants.js";

import { WebSocket } from "isows";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import type { MergedEvents, WorldEvents } from "../types/events.js";
import Bucket from "../util/Bucket.js";

export default class PWGameClient {
    settings: GameClientSettings;

    api: PWApiClient;
    socket?: WebSocket;

    protected totalBucket = new Bucket(100, 1000);
    protected chatBucket = new Bucket(10, 1000);

    /**
     * NOTE: After constructing, you must then run .init() to connect the API IF you're using email/password.
     */
    constructor(api: PWApiClient, settings?: Partial<GameClientSettings>) {
        this.settings = {
            reconnectable: settings?.reconnectable ?? true,
            reconnectCount: settings?.reconnectCount ?? 3,
            reconnectInterval: settings?.reconnectInterval ?? 5500,
            handlePackets: settings?.handlePackets ?? ["PING"]
        };
        
        this.api = api;
    }

    init() {
        // For now this only authenticates idk why

        return this.api.authenticate();
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
        if (this.socket?.readyState === WebSocket.CONNECTING) throw Error("Already trying to connect.");
        // if (!this.api.loggedIn) throw Error("API isn't logged in, you must use authenticate first.");

        const roomType = this.api.roomTypes?.[0] ?? await this.api.getRoomTypes().then(rTypes => rTypes[0]);

        const joinReq = await this.api.getJoinKey(roomType, roomId);

        if (!("token" in joinReq) || joinReq.token.length === 0) throw Error("Unable to secure a join key - is account details valid?");

        const connectUrl = `${Endpoint.GameWS}/room/${joinReq.token}`
            + (joinData === undefined ? "" : "?joinData=" + btoa(JSON.stringify(joinData)));

        let count = this.settings.reconnectCount ?? 3;

        return new Promise((res, rej) => {
            const timer = setTimeout(() => {
                if (count-- < 0) rej(new Error("Unable to (re)connect."))

                this.socket = this.#createSocket(connectUrl, timer, res);

                timer.refresh();
            }, this.settings.reconnectInterval ?? 5500);

            this.socket = this.#createSocket(connectUrl, timer, res);
        });
    }

    #createSocket(url: string, timer: NodeJS.Timeout, res: (value: PWGameClient) => void) {
        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        socket.onclose = this.onSocketClose.bind(this);
        socket.onmessage = this.onSocketMessage.bind(this);

        socket.onopen = (evt) => {
            clearTimeout(timer);
    
            console.log("Connected.");
            // console.log("Connected: " + new Date(ev.timeStamp));

            res(this);
        };

        return socket;
    }

    protected onSocketClose(evt: CloseEvent) {
        this.callbacks.debug?.("Server closed connection due to " + evt.reason + ", code: " + evt.code);
    }

    protected onSocketMessage(evt: MessageEvent) {
        const { packet } = fromBinary(WorldPacketSchema, evt.data instanceof ArrayBuffer ? new Uint8Array(evt.data as ArrayBuffer) : evt.data);

        this.callbacks.debug?.("Received " + packet.case);

        if (packet.case === undefined) {  
            return this.callbacks["unknown"]?.(packet.value);
        } else this.callbacks.raw?.(packet);;

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

        //@ts-expect-error
        this.callbacks[packet.case]?.(packet.value);
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
    callbacks = {

    } as Partial<{ [K in keyof MergedEvents]: (data: MergedEvents[K]) => void }>;

    /**
     * Can be used instead of setting callbacks object properties directly if preferred.
     */
    setCallBack<Event extends keyof MergedEvents>(type: Event, cb: (data: MergedEvents[Event]) => void) : PWGameClient {
        this.callbacks[type] = cb;

        return this;
    }

    /**
     * This assumes that the connection 
     * 
     * @param type Type of the packet.
     * @param value Value of the packet to send along with, note that some properties are optional.
     * @param direct If it should skip queue.
     */
    send<Event extends keyof WorldEvents>(type: Event, value?: Omit<WorldEvents[Event], "$typeName"|"$unknown">, direct = false) {
        this.callbacks.debug?.("Sent " + type + " with " + (value === undefined ? "0" : Object.keys(value).length) + " parameters.");

        const send = () => this.socket?.send(
            toBinary(WorldPacketSchema, create(WorldPacketSchema, { packet: { case: type, value } as unknown as { case: "ping", value: Ping } }))
        );

        if (direct) return send();

        this.totalBucket.queue(() => {
            if (type !== "playerChatPacket") send() 
            else this.chatBucket.queue(() => { send() });
        }, type === "playerChatPacket")
    }
}