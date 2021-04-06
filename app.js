// start discord module
const Discord = require('discord.js');
const client = new Discord.Client();

// start yahoo module
const Yahoo = require('yahoo-finance-webscraper');

// start env module
require('dotenv').config();

// fetch env
const token = process.env.BOT_TOKEN;
const home = process.env.BOT_HOME;
const channel = process.env.BOT_CHANNEL;
const owner = process.env.BOT_OWNER;
const prefix = process.env.PREFIX;
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
    // get main channel from owner's server
    if(home && channel) {
        if (client.guilds.cache.get(home))
            if(client.guilds.cache.get(home).channels.cache.get(channel))
                logChannel = client.guilds.cache.get(home).channels.cache.get(channel);    
            else
                console.log(`Error: can't find home's channel`);
        else
            console.log(`Error: can't find home`);
    }
        
    // log to host and owner's server
    function log(val) {  
        console.log(val); 
        
        if(typeof logChannel !== 'undefined') {
            date = new Date(); 
            timestamp = `${date.getFullYear()}-${(`0` + parseInt(date.getMonth()+1)).slice(-2)}-${(`0` + date.getDate()).slice(-2)}T${(`0` + date.getHours()).slice(-2)}:${(`0` + date.getMinutes()).slice(-2)}`;
            logChannel.send('```' + `${timestamp} ${val}` + '```');
        }
    }

    // success
    log(`Logged in as ${client.user.tag}`);
    if(client.guilds.cache.map(g => g).length > 0)
        log(`Currently in: ${client.guilds.cache.map(g => `"${g.name} <${g.id}>"`).join(', ')}`);   
    log(`Will fetch stock data every ${frequency/1000} second(s)`);    

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
                    guild.me.setNickname(val).catch(function(err) { log(err); });
            }
            else
                log(`Missing permissions to change nickname in "${guild.name}"`);
        });    
    }

    // set bot's activity
    function setActivity(val) {
        if(val) {
            if(client.user.presence.activities.length == 0 || client.user.presence.activities[0].name != val)
                client.user.setActivity(val, {type: 'WATCHING'}).catch(function(err) { log(err); });
        }
        else if(client.user.presence.activities.length > 0)
            client.user.setActivity().catch(function(err) { log(err); });
    }

    // create role
    function createRole(guild, name, color) {          
        if(!guild.me.hasPermission('MANAGE_ROLES'))  
            return;

        if(typeof guild.roles.cache.find(r => r.name == name) === 'undefined') {
            guild.roles.create({
                data: {
                name: name,
                color: color,
                }
            })
            .catch(function(err) { log(err); });
        }
        else 
            log(`Role "${name}" already exists in "${guild.name} <${guild.id}>"`);        
    }

    // set bot's role
    function setRole(val) {   
        client.guilds.cache.forEach((guild) => {              
            if(!guild.me.hasPermission('MANAGE_ROLES'))  
                return;
            
            positive = guild.roles.cache.find(r => r.name == 'ticker-pos');
            if(!positive)
                createRole(guild, 'ticker-pos', 'GREEN');

            negative = guild.roles.cache.find(r => r.name == 'ticker-neg');
            if(!negative)
                createRole(guild, 'ticker-neg', 'RED');

            if(val) {
                role = guild.roles.cache.find(r => r.name == val);

                if(!guild.me.roles.cache.has(role.id)) {              
                    guild.me.roles.add(role).catch(function(err) { log(err); });

                    if(role == positive)
                        guild.me.roles.remove(negative).catch(function(err) { log(err); });
                    else
                        guild.me.roles.remove(positive).catch(function(err) { log(err); });
                }
            }
            else if(guild.me.roles.cache.has(positive.id) || guild.me.roles.cache.has(negative.id)) {
                guild.me.roles.remove(positive).catch(function(err) { log(err); });
                guild.me.roles.remove(negative).catch(function(err) { log(err); });
            }    
        });
    }
  
    // fetch stock data
    function fetch() {
        Yahoo.getSingleStockInfo(ticker).then(data => {
            setNickname(`${ticker} - $${data.regularMarketPrice}`);

            activity = null;
            role = null;
            leading = null;
            change = null;
            percent = null;
            volume = null;
            final = null;

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
                    leading = 'PM:';
                    change = data.preMarketChange;
                    percent = data.preMarketChangePercent;
                    break;
                case 'POST':
                    activity = true;
                    role = false;
                    leading = 'AH:';
                    change = data.postMarketChange;
                    percent = data.postMarketChangePercent;
                    break;
                default:
                    activity = true;
                    role = false;
                    leading = 'Closed:';
                    final = `$${data.postMarketPrice}`;
            }

            if(activity == true) {
                if(change) {
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

                    if(leading && !volume)
                        setActivity(`${leading} ${change} ${percent}`); 
                    else
                        setActivity(`${change} ${percent} ${volume}`); 
                } 
                else
                    setActivity(`${leading} ${final}`); 
            }
            else {
                setActivity();            
                setRole();
            }
        });  
    }
    setInterval(fetch, frequency);
    
    // interact with messages
    client.on('message', message => {
        if(!prefix || !message.content.startsWith(prefix))
            return;

        args = message.content.slice(prefix.length).trim().split(' ');
        command = args.shift().toLowerCase();

        if(owner && message.author.id == owner) {           
            if(command == 'servers')  
                message.channel.send(`Currently in: \n\`${client.guilds.cache.map(g => `${g.name} <${g.id}>`).join('\n')}\``);                             
            else if(command == 'leave') {
                if(args.length) {
                    if(typeof client.guilds.cache.get(args[0]) !== 'undefined') {
                        client.guilds.cache.get(args[0]).leave()
                            .then(function(g) {
                                message.channel.send(`Left "${g.name} <${g.id}>"`);
                            })
                            .catch(function(err) {
                                message.channel.send('An error has occurred. Please view log');
                                log(err);
                            });
                    }
                    else
                        message.channel.send(`Please provide a valid server ID. Your string: **${args[0]}**`);
                }
                else {
                    message.guild.leave().catch(function(err) {
                        message.channel.send('An error has occurred. Please view log');
                        log(err);
                    });
                }
            }         
        }    
    });

    // when bot joins a new server
    client.on('guildCreate', guild => {
        log(`Joined "${guild.name} <${guild.id}>"`);
        createRole(guild, 'ticker-pos', 'GREEN');
        createRole(guild, 'ticker-neg', 'RED');
    });

    // when bot leaves a server
    client.on('guildDelete', guild => {
        log(`Left "${guild.name} <${guild.id}>"`);
    });    
});