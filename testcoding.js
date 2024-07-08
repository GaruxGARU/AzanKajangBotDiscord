const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const schedule = require('node-schedule');
const path = require('path');
const { token, guildId, channelId, audioFile } = require('./config.json');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log('Bot is online!');
});

// Schedule the bot to play sound at a specific time
const playTime = new Date(Date.now() + 5000); // 5 seconds from now

const job = schedule.scheduleJob(playTime, async () => {
    const guild = client.guilds.cache.get(guildId);
    const channel = guild.channels.cache.get(channelId);
    
    if (channel) {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(path.join(__dirname, audioFile));
        player.play(resource);

        connection.subscribe(player);
        console.log('Playing sound in voice channel');
    }
});

client.login(token);
