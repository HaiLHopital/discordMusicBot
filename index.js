const { Client, Intents } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
require("dotenv").config();
const ytdl = require("ytdl-core");
const playdl = require("play-dl");
const ytpl = require("ytpl");
const yts = require("yt-search");

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const queue = new Map();

const commandList = [
  "skip", //
  "play", //
  "volume", //
  "stop", //
  "search", //
  "playlist", //
  "pause",
  "resume",
];

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

  const commandBody = message.content.slice(1);
  const args = commandBody.split(" ");
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

  executeCommand(command, args);

  async function executeCommand(command, args = null) {
    if ((command == "play" || command == "playlist") && args) {
      let song, playlist;
      if (command == "play") {
        try {
          const songInfo = await ytdl.getInfo(args[0]);
          console.log("after get info");
          song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
          };
        } catch (error) {
          message.channel.send(`Something went wrong`);
        }
      } else {
        //console.log("playlist");
        playlist = await ytpl(args[0]);
        //console.log(playlist);
      }

      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          player: null,
          resource: null,
          songs: [],
          volume: 5,
          playing: true,
        };

        queue.set(message.guild.id, queueContruct);

        command == "play"
          ? queueContruct.songs.push(song)
          : playlist.items.forEach((el) => {
              queueContruct.songs.push(el);
            });

        try {
          connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
          });
          queueContruct.connection = connection;
          //console.log(song.url);

          const player = createAudioPlayer();

          queueContruct.player = player;
          play(message.guild, queueContruct);
          player.on("error", (error) => {
            console.log("error");
            console.error(
              `Error ${error.message}` /*:  with resource ${error.resource.metadata.title}`*/
            );
          });

          player.on(AudioPlayerStatus.Idle, () => {
            console.log("idle");
            queueContruct.songs.shift();
            play(message.guild, queueContruct);
          });
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        if (song) {
          serverQueue.songs.push(song);
          return message.channel.send(
            `${song.title} has been added to the queue!`
          );
        }
      }
    } else if (command == "stop") {
      console.log("stop");
      serverQueue.songs = [];
      serverQueue.player.stop();
    } else if (command == "skip") {
      serverQueue.songs.shift();
      play(message.guild, serverQueue);
    } else if (command == "volume" && args) {
      console.log("volume");
      serverQueue.resource.volume.setVolume(args[0] / 100);
    } else if (command == "search" && args) {
      console.log("search ", args);
      query = args.join(" ");
      console.log(query);
      const info = await playdl.search(query, {
        limit: 1,
      });
      console.log(info);
      executeCommand("play", [info[0].url]);
    }
  }
});
function stop() {
  //console.log(player);
}
function skip() {
  console.log("skip");
}
function volume(volume) {
  console.log(serverQueue.resource);
}

async function play(guild, queueContruct) {
  console.log("play");
  const { songs, player, connection } = queueContruct;
  const song = songs[0];
  const serverQueue = queue.get(guild.id);

  if (!song) {
    //getVoiceConnection()
    console.log("destroy");
    try {
      connection.destroy();
    } catch (error) {
      console.log(error.message);
    }

    console.log("destroyed");
    //serverQueue.voiceChannel;
    queue.delete(guild.id);
    return;
  }

  console.log("before stream");
  const stream = await playdl.stream(song.url);
  console.log("after stream");
  console.log(stream);

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
    inlineVolume: true,
  });
  serverQueue.resource = resource;
  resource.volume.setVolume(0.2);

  player.play(resource);

  connection.subscribe(player);

  //console.log(queueContruct);
}

client.login(process.env.BOT_TOKEN);
