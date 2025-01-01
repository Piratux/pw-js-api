// Up to date as of v0.0.5
// - 2025-01-01 21:37 UTC+0

import { PWApiClient } from "pw-js-api";
import { swapObject } from "./util.mjs";

import { setTimeout } from "node:timers/promises";

const cli = new PWApiClient("<YOUR EMAIL HERE>", "<YOUR PASSWORD HERE>");

const mappings = await cli.getMappings();
const blockIdToType = swapObject(mappings);

// To fetch the token, allowing it to join a world.
await cli.authenticate();

const con = await cli.joinWorld("rfdeeb8d9d94f76", {
    gameSettings: {
        handlePackets: ["PING"]
    }
});

/**
 * Doesn't support filling
 * @param {string} blockId 
 * @param {{ x: number, y: number }[]} positions 
 * @param {0|1} layer 
 * @returns 
 */
const place = (blockId, positions, layer = 1) => {
    return con.send("worldBlockPlacedPacket", {
        blockId: mappings[blockId], layer,
        positions, isFillOperation: false
    });
}

let botId = 1; let isOwner = false;

// You can use setCallBack (which returns itself for chaining)
con.addCallback("playerInitPacket", (data) => {
    console.log("Connected as " + data.playerProperties?.username);

    if (data.playerProperties) {
        botId = data.playerProperties.playerId;
        isOwner = data.playerProperties.isWorldOwner;
    }

    con.send("playerInitReceived");
}).addCallback("playerJoinedPacket", (data) => {
    console.log(data.properties?.username + (data.properties.playerId < botId ? " is here." : " joined the world."));
});

con.addCallback("debug", console.log);

const snakeable = ["basic_", "brick_", "beveled_", "glass_", "minerals_"];

con.addCallback("worldBlockPlacedPacket", async function (data) {
    if (data.playerId === botId) return;

    if (isOwner) {
        const blockId = blockIdToType[data.blockId];

        if (data.isFillOperation) return; // fills have long cooldown.

        if (snakeable.some(v => blockId === v + "green" || blockId === v + "red")) {
            if (blockId.endsWith("green")) {
                await setTimeout(150).then(() => place(blockId.split("_")[0] + "_red", data.positions, 1));
            }
            await setTimeout(300).then(() => place("empty", data.positions, 1));
        }
    }
});

let helpTime = -1;

con.addCallback("systemMessagePacket", (data) => {
    // From /help - continuation of .ping
    if (data.message.startsWith("Available commands:")) {
        con.send("playerChatPacket", {
            message: "Pong! Response time: " + (Date.now() - helpTime) + "ms.",
        });
    }
});

// A con accepts multiple callbacks for the same type!
// If one of the callback returns a "STOP" (similar to your typical event's stop propagation). It can even return a promise resolving to STOP too.

// For example:
// All messages will get logged if and only if the person isn't the bot.
// This can be tested with the ".say .ping" command where you will notice that the bot's messages does not get logged nor will it be listened to.
con.addCallback("playerChatPacket", (data) => {
    if (data.playerId === botId) return "STOP";

    console.log(data.message);
});

con.addCallback("playerChatPacket", (data) => {
    const args = data.message.split(" ");
    
    switch (args[0].toLowerCase()) {
        case ".ping":
            helpTime = Date.now();
            con.send("playerChatPacket", {
                message: "/help"
            });
            break;
        case ".disconnect":
            if (args[1] === "-f") con.settings.reconnectable = false;

            con.socket?.close();
            break;
        case ".say":
            con.send("playerChatPacket", {
                message: args.slice(1).join(" ")
            });
            break;
    }
});