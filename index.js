const { Client, Intents } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
require('dotenv').config()
const ytdl = require('ytdl-core');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

const queue = new Map();

const commandList = ["skip", "play", "volume", "stop", "search", "playlist"]

/*
function executeCommand(command, song = "") {
    channel.send(`shut up`)
    if (!voiceChannel)
        return channel.send(
            "You need to be in a voice channel to play music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }
}*/

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(`${process.env.PREFIX}`)) return;


    const serverQueue = queue.get(message.guild.id);
    // channel = client.channels.cache.get(message.channel.id);
    // voiceChannel = message.member.voice.channel

    const commandBody = message.content.slice(1);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (!commandList.includes(command)) return;

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }
    const songInfo = await ytdl.getInfo(args[0]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {

            connection = joinVoiceChannel(
                {
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });
            queueContruct.connection = connection;
            //console.log(song.url);


            play(message.guild, queueContruct.songs[0], queueContruct);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }

    function stop() {

    }

    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const stream = ytdl(song.url, { filter: "audioonly" })

        //console.log(stream);

        const player = createAudioPlayer();
        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume.setVolume(0.2);
        console.log(resource);
        player.play(resource);
        connection.subscribe(player);
        player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        });
        player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })

        //queueContruct
    }
    // executeCommand(command, args[1])
})

client.login(process.env.BOT_TOKEN);