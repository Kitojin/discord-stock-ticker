// start discord module
const Discord = require('discord.js');
const client = new Discord.Client();

// start yahoo module
const Yahoo = require('yahoo-finance-webscraper');

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
    if(client.guilds.cache.map(g => g).length > 0)
        console.log(`Currently in ${client.guilds.cache.map(g => `"${g.name}"`).join(', ')}`);   
    console.log(`Will run every ${frequency/1000} second(s)`);

    // convert number to K or M
    function numFormatter(num) {
        if(num > 999 && num < 1000000)
            return (num/1000).toFixed(2) + 'K';
        else if(num > 1000000)
            return (num/1000000).toFixed(2) + 'M';
        else
            return num;
    }

    // set bot's nickname
    function setNickname(val) {    
        client.guilds.cache.forEach((guild) => {            
            if(guild.me.hasPermission('CHANGE_NICKNAME')) {
                if(guild.me.nickname != val)
                    guild.me.setNickname(val).catch(console.error);
            }
            else
                console.log(`Missing permission to change nickname in "${guild.name}"`);
        });    
    }

    // set bot's activity
    function setActivity(val) {
        if(val) {
            if(client.user.presence.activities.length == 0 || client.user.presence.activities[0].name != val)
                client.user.setActivity(val, {type: 'WATCHING'}).catch(console.error);
        }
        else if(client.user.presence.activities.length > 0)
            client.user.setActivity().catch(console.error);
    }

    // set bot's role
    function setRole(val) {   
        client.guilds.cache.forEach((guild) => {              
            if(guild.me.hasPermission('MANAGE_ROLES')) {             
                if(val) {
                    role = guild.roles.cache.find(r => r.name == val);

                    if(!guild.me.roles.cache.has(role.id)) {              
                        guild.me.roles.add(role).catch(console.error);

                        if(role.name == 'ticker-pos')
                            guild.me.roles.remove(guild.roles.cache.find(r => r.name == 'ticker-neg')).catch(console.error);
                        else
                            guild.me.roles.remove(guild.roles.cache.find(r => r.name == 'ticker-pos')).catch(console.error);
                    }
                }
                else {
                    guild.me.roles.remove(guild.roles.cache.find(r => r.name == 'ticker-pos')).catch(console.error);
                    guild.me.roles.remove(guild.roles.cache.find(r => r.name == 'ticker-neg')).catch(console.error);
                }            
            }
        });
    }

    function run() {
        // fetch stock data
        Yahoo.getSingleStockInfo(ticker).then(data => {
            setNickname(`${ticker} - $${data.regularMarketPrice}`);

            activity = null;
            role = null;
            prefix = null;
            change = null;
            percent = null;
            volume = null;

            switch(data.marketState) {
                case 'REGULAR':
                    activity = true;
                    role = true;
                    change = data.regularMarketChange;
                    percent = data.regularMarketChangePercent;
                    volume = numFormatter(data.regularMarketVolume); 
                    break;
                case 'PRE':
                    activity = true;
                    role = false;
                    prefix = 'PM:';
                    change = data.preMarketChange;
                    percent = data.preMarketChangePercent;
                    break;
                case 'POST':
                    activity = true;
                    role = false;
                    prefix = 'AH:';
                    change = data.postMarketChange;
                    percent = data.postMarketChangePercent;
                    break;
                default:
                    activity = false;
                    role = false;
            }

            if(activity == true) {
                change = parseFloat(change).toFixed(2);
                percent = `${parseFloat(percent).toFixed(2)}%`;

                if(change >= 0) {
                    if(role == true)
                        setRole('ticker-pos');
                    else
                        setRole();

                    if(change > 0) {
                        change = `+${change}`;
                        percent = `+${percent}`;
                    }
                }
                else if(role == true)
                    setRole('ticker-neg');
                else
                    setRole();            

                // need this conditional because of a mobile bug showing !!; covering only existing possibilities
                if(prefix != null && volume == null)
                    setActivity(`${prefix} ${change} ${percent}`); 
                else
                    setActivity(`${change} ${percent} ${volume}`); 
            }
            else {
                setActivity();
                setRole();
            }
        });  
    }

    setInterval(run, frequency);
});

// when bot joins a new server
client.on("guildCreate", guild => {
    console.log(`Joined "${guild.name}"`);

    // create role for green
    if(typeof guild.roles.cache.find(r => r.name == 'ticker-pos') == 'undefined') {
        guild.roles.create({
            data: {
            name: 'ticker-pos',
            color: 'GREEN',
            }
        })
        .catch(console.error);
    }
    else 
        console.log('Role "ticker-pos" already exists in this server');

    // create role for red
    if(typeof guild.roles.cache.find(r => r.name == 'ticker-neg') == 'undefined') {
        guild.roles.create({
            data: {
            name: 'ticker-neg',
            color: 'RED',
            }
        })
        .catch(console.error);
    }
    else 
        console.log('Role "ticker-neg" already exists in this server');
 });

 // when bot leaves a server
 client.on("guildDelete", guild => {
     console.log(`Left "${guild.name}"`);
  });