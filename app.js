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
const frequency = (process.env.FREQUENCY) ? process.env.FREQUENCY*1000 : 60*1000; // 1 minute default

// check if vars exist
if(!token || !ticker) {
    console.error('Error: params');
    process.exit();
}

// login to discord
client.login(token);

// logged
client.on('ready', function() {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Currently in ${client.guilds.cache.map(guild => `"${guild.name}"`).join(', ')}`);    
    console.log(`Will run every ${frequency/1000} seconds`);

    // convert number to K or M
    function numFormatter(num) {
        if(num > 999 && num < 1000000)
            return (num/1000).toFixed(0) + 'K';
        else if(num > 1000000)
            return (num/1000000).toFixed(0) + 'M';
        else if(num < 900)
            return num;
    }

    // set bot's nickname
    function setNickname(val) {    
        client.guilds.cache.forEach((guild) => {
            if(guild.me.nickname != val) {
                guild.me.setNickname(val)        
                    .then(GuildMember => console.log(`Nickname changed to ${GuildMember.nickname}`))
                    .catch(console.error);
            }
        });    
    }

    // set bot's activity
    function setActivity(val) {
        if(client.user.presence.activities.length === 0 || client.user.presence.activities[0].name !== val) {
            client.user.setActivity(val, {type: 'WATCHING'})
            .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
            .catch(console.error);
        }
    }

    // clear bot's activity (NOTE currently not being used)
    function clearActivity() {
        if(client.user.presence.activities.length > 0) {
            client.user.setActivity()
                .then(presence => console.log('Activity cleared'))
                .catch(console.error);
        }
    }

    function run() {
        // fetch stock data
        source.getSingleStockInfo(ticker).then(data => {
            setNickname(`${ticker} - $${data.regularMarketPrice}`);

            var prefix = '', change = '', percent = '', volume = '';

            switch(data.marketState) {
                case 'REGULAR':
                    change = data.regularMarketChange;
                    percent = data.regularMarketChangePercent;
                    volume = numFormatter(data.regularMarketVolume); 
                    break;
                case 'PRE':
                    prefix = 'PM:';
                    change = data.preMarketChange;
                    percent = data.preMarketChangePercent;
                    break;
                case 'POST':
                    prefix = 'AH:';
                    change = data.postMarketChange;
                    percent = data.postMarketChangePercent;
                    break;
                default:
                    prefix = `$${data.postMarketPrice}`;
                    change = data.postMarketChange;
                    percent = data.postMarketChangePercent; 
            }

            change = parseFloat(change).toFixed(2);
            percent = `${parseFloat(percent).toFixed(2)}%`;
            
            if(change > 0) {
                change = `+${change}`;
                percent = `+${percent}`;
            }

            setActivity(`${prefix} ${change} ${percent} ${volume}`);     
        });        
    }

    setInterval(run, frequency);
});
