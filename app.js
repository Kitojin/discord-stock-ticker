const Discord = require('discord.js');
const client = new Discord.Client();

const Yahoo = require('yahoo-finance-webscraper');
const source = new Yahoo.Client({
    tickerCache: false, // If enabled true the bot will cache all tickers for 15 seconds
    invalidCache: true, // If enabled true the bot will cache any invalid tickers
});

require('dotenv').config();

const token = process.env.BOT_TOKEN;
const ticker = process.env.TICKER;
const frequency = process.env.FREQUENCY;

if(!token || !ticker) {
    console.error('Error: env');
    process.exit();
}

if(!frequency)
    frequency = 60;    

client.login(token);

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
            guild.me.setNickname(`${ticker} - $${val}`)        
                .then(GuildMember => console.log(`Nickname changed to ${GuildMember.nickname}`))
                .catch(console.error);
        });    
    }

    function setActivity(val) {
        client.user.setActivity(val, {type: 'WATCHING'})
            .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
            .catch(console.error);
    }

    function run() {
        source.getSingleStockInfo(ticker).then(data => {
            //console.log(data);
            setNickname(data.regularMarketPrice);

            if(data.marketState == 'REGULAR') {  
                if(data.regularMarketChange < 0) {
                    value = `-${parseFloat(data.regularMarketChange).toFixed(1)}`;
                    percent = `-${parseFloat(data.regularMarketChangePercent).toFixed(1)}`;
                }
                else {                
                    value = `+${parseFloat(data.regularMarketChange).toFixed(1)}`;
                    percent = `+${parseFloat(data.regularMarketChangePercent).toFixed(1)}%`;
                }               
                volume = numFormatter(data.regularMarketVolume); 

                setActivity(`${value} / ${percent} / ${volume}`);
            }
            else if (data.marketState == 'PRE') {
                if(data.preMarketChange < 0) {
                    value = `-${parseFloat(data.preMarketChange).toFixed(1)}`;
                    percent = `-${parseFloat(data.preMarketChangePercent).toFixed(1)}`;
                }
                else {                
                    value = `+${parseFloat(data.preMarketChange).toFixed(1)}`;
                    percent = `+${parseFloat(data.preMarketChangePercent).toFixed(1)}%`;
                }    

                setActivity(`Pre-market: ${value} / ${percent}`);            
            }
            else if (data.marketState == 'POST') {
                if(data.postMarketChange < 0) {
                    value = `-${parseFloat(data.postMarketChange).toFixed(1)}`;
                    percent = `-${parseFloat(data.postMarketChangePercent).toFixed(1)}`;
                }
                else {                
                    value = `+${parseFloat(data.postMarketChange).toFixed(1)}`;
                    percent = `+${parseFloat(data.postMarketChangePercent).toFixed(1)}%`;
                }    

                setActivity(`After-hours: ${value} / ${percent}`);            
            }
            else {
                console.error('Error: market');
                process.exit();
            }
        });        
    }

    setInterval(run, frequency);
});
