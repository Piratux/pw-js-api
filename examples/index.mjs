// Up to date as of v0.3.11
// - 2025-08-08 21:57 UTC+00

import {PWApiClient, PWGameClient } from "pw-js-api";

// Optional package, it takes care of player/world states for you, even blocks / structures.
// For more information: https://github.com/doomestee/pw-js-world
import { Block, createBlockPacket, createBlockPackets, LayerType, PWGameWorldHelper } from "pw-js-world";

// Create an API client with your email and password, or token if you wish.
const api = new PWApiClient("EMAIL@MAIL.AIL", "PASSWORD");

// You must run this if you used email/password, or if the token is expired before using authenticated requests (including joining worlds)
await api.authenticate();

// This will allow us to be able to use the world's states at any time once it's added to the game connection.
const helper = new PWGameWorldHelper();

// Creates a game client (this is one of two options, this option allows us to add hooks/callbacks before the joinWorld resolves)
const con = new PWGameClient(api, {
    handlePackets: ["PING", "INIT"]
}).addHook(helper.receiveHook);

// You can use addCallback
// If a hook is added to PWGameClient, the states will be populated (though it can be undefined if it errors during processing).
con.addCallback("playerInitPacket", (evt, states) => {
    console.log("Joined " + evt.worldMeta.title + " as " + evt.playerProperties.username);

    if (states?.player) {
        console.log("Bot can " + (states.player.rights.canEdit ? "" : "not ") + "edit the world.");
    }
}) // which can return itself for chaining
.addCallback("playerJoinedPacket", (data, states) => {
    if (states.player) {
        const p = states.player;

        if (p.playerId < helper.botPlayerId) {
            console.log(`${p.username} is here.`);
        } else console.log(`${p.username} joined the world!`);
    }
});

// Comment this out if you do not want your console to be flooded for every request received.
con.addCallback("debug", console.log);

con.addCallback("worldBlockPlacedPacket", async function (data, states) {
    if (states === undefined || states.player === undefined) return;

    const { player } = states;

    if (player.isMe || !helper.botPlayer.rights.canEdit) return;

    const positions = [];
    const block = states.newBlocks[0];

    if (block.bId !== Block.getIdByName("BASIC_GREEN")) return;

    for (let i = 0, len = data.positions.length; i < len; i++) {
        positions.push(data.positions[i]);
    }

    setTimeout(() => {
        con.send("worldBlockPlacedPacket", createBlockPacket(new Block(Block.getIdByName("BASIC_RED")), LayerType.Foreground, positions));


        setTimeout(() => {
            con.send("worldBlockPlacedPacket", createBlockPacket(new Block(Block.getIdByName("EMPTY")), LayerType.Foreground, positions));
        }, 175);

    }, 150);
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
    if (data.playerId === helper.botPlayerId) return "STOP";

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

await con.joinWorld("rfdeeb8d9d94f76");