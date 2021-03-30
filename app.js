// start discord module
const Discord = require('discord.js');
const client = new Discord.Client();

// start yahoo module
const Yahoo = require('yahoo-finance-webscraper');
const source = new Yahoo.Client({
    tickerCache: false, // if true, the bot will cache all tickers for 15 seconds
    invalidCache: true // if true, the bot will cache any invalid tickers
});

// start env module
require('dotenv').config();

// fetch env
const token = process.env.BOT_TOKEN;
const ticker = process.env.TICKER;
const frequency = process.env.FREQUENCY;

//check if vars exist
if(!token || !ticker) {
    console.error('Error: env');
    process.exit();
}
if(!frequency)
    frequency = 60000; // 1 minute 

// login to discord
client.login(token);

// logged
client.on('ready', function() {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Currently in ${client.guilds.cache.map(guild => `"${guild.name}"`).join(', ')}`);

    function numFormatter(num) {
        if(num > 999 && num < 1000000)
            return (num/1000).toFixed(0) + 'K';
        else if(num > 1000000)
            return (num/1000000).toFixed(0) + 'M';
        else if(num < 900)
            return num;
    }

    function setNickname(val) {    
        client.guilds.cache.forEach((guild) => {
            //console.log(guild);  
            if(guild.me.nickname != val) {
                guild.me.setNickname(val)        
                    .then(GuildMember => console.log(`Nickname changed to ${GuildMember.nickname}`))
                    .catch(console.error);
            }
        });    
    }

    function setActivity(val) {
        if(client.user.presence.activities.length === 0 || client.user.presence.activities[0].name !== val) {
            client.user.setActivity(val, {type: 'WATCHING'})
            .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
            .catch(console.error);
        }
    }

    function run() {
        source.getSingleStockInfo(ticker).then(data => {
            //console.log(data);
            setNickname(`${ticker} - $${data.regularMarketPrice}`);

            if(data.marketState == 'REGULAR') {  
                if(data.regularMarketChange < 0) {
                    value = `-${parseFloat(data.regularMarketChange).toFixed(2)}`;
                    percent = `-${parseFloat(data.regularMarketChangePercent).toFixed(1)}`;
                }
                else {                
                    value = `+${parseFloat(data.regularMarketChange).toFixed(2)}`;
                    percent = `+${parseFloat(data.regularMarketChangePercent).toFixed(1)}%`;
                }               
                volume = numFormatter(data.regularMarketVolume); 

                setActivity(`${value} / ${percent} / ${volume}`);
            }
            else if (data.marketState == 'PRE') {
                if(data.preMarketChange < 0) {
                    value = `${parseFloat(data.preMarketChange).toFixed(2)}`;
                    percent = `${parseFloat(data.preMarketChangePercent).toFixed(1)}%`;
                }
                else {                
                    value = `+${parseFloat(data.preMarketChange).toFixed(2)}`;
                    percent = `+${parseFloat(data.preMarketChangePercent).toFixed(1)}%`;
                }    

                setActivity(`PM: ${value} / ${percent}`);            
            }
            else if (data.marketState == 'POST') {
                if(data.postMarketChange < 0) {
                    value = `${parseFloat(data.postMarketChange).toFixed(2)}`;
                    percent = `${parseFloat(data.postMarketChangePercent).toFixed(1)}%`;
                }
                else {                
                    value = `+${parseFloat(data.postMarketChange).toFixed(2)}`;
                    percent = `+${parseFloat(data.postMarketChangePercent).toFixed(1)}%`;
                }    

                setActivity(`AH: ${value} / ${percent}`);            
            }
            else {
                console.error('Error: market');
                process.exit();
            }

            console.log(`Running again after ${frequency}`);
        });        
    }

    setInterval(run, frequency);
});
