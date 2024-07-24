const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { token, guildId, userId, azanFile, azanSubuh } = require('./config.json');
require('libsodium-wrappers');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const player = createAudioPlayer();

client.once('ready', () => {
    console.log('Bot is online!');
    scheduleDailyAzan();
    // Schedule the function to run daily at midnight
    schedule.scheduleJob('0 0 * * *', () => {
        console.log('Scheduling azan for the new day');
        scheduleDailyAzan();
    });
});

function scheduleDailyAzan() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const year = today.getFullYear();
    const month = months[today.getMonth()];
    const day = today.getDate();
    const formattedDay = day.toLocaleString('en-US', { minimumIntegerDigits: 2 }); // eg. 2024-Dec-8 -> 2024-Dec-08
    const formattedDate = `${year}-${month}-${formattedDay}`; // YYYY-MM-DD

    fs.createReadStream('prayer_times.csv')
        .pipe(csv())
        .on('data', (row) => {
            const [day, month, year] = row['Tarikh Miladi'].split('-');
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Convert to YYYY-MM-DD format
            
            // Schedule each prayer time
            if (dateStr === formattedDate) {
                
                // Change month to number eg. Dec -> 12
                const changetonum = {
                    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
                };
                const monthNumber = changetonum[month];

                ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'].forEach(prayer => { // can add [Imsak] if u want to
                    const [hour, minute, period] = row[prayer].split(/[:\s]/);
                    const hour24 = period.toLowerCase() === 'pm' ? (parseInt(hour) % 12) + 12 : parseInt(hour);
                    const playTime = new Date(year, monthNumber-1, day, hour24, minute, 0);
                    scheduleAzan(playTime, prayer);// call the schedule function
                });
            }
        })
        .on('end', () => {
            console.log('Finished reading CSV and scheduling azan for today');
        });
}

function scheduleAzan(playTime, prayer) {
    schedule.scheduleJob(playTime, async () => {
        const guild = client.guilds.cache.get(guildId);

        if (guild) {
            const voiceChannels = guild.channels.cache.filter(channel => channel.isVoice());

            let targetChannel = null;
            for (const [channelId, channel] of voiceChannels) {
                const members = channel.members;
                if (members.has(userId)) {
                    targetChannel = channel;
                    break;
                }
            }

            if (targetChannel) {
                const connection = joinVoiceChannel({
                    channelId: targetChannel.id,
                    guildId: targetChannel.guild.id,
                    adapterCreator: targetChannel.guild.voiceAdapterCreator,
                });

                // set azan subuh mp3 //azanSubuh
                let resource;
                if (prayer === "Subuh") {
                    resource = createAudioResource(path.join(__dirname, azanSubuh), { inlineVolume: true });
                } else {
                    resource = createAudioResource(path.join(__dirname, azanFile), { inlineVolume: true });
                }

                resource.volume.setVolume(0.04); // set Volume //@discordjs/opus cannot be install --> not supported node -V20 --> install nvm to change using "nvm use 18"

                player.play(resource);
                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    connection.destroy();
                });

                console.log(`Playing azan for ${prayer} in voice channel ${targetChannel.name}`);
            } else {
                console.log(`User with ID ${userId} is not in any voice channel`);
            }
        }
    });

    console.log(`Scheduled azan for ${prayer} at ${playTime}`);
}

client.login(token);
