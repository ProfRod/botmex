process.env["NTBA_FIX_319"] = 1;
const config = require('./config.json'),
      TelegramBot = require('node-telegram-bot-api'),
      SwaggerClient = require("swagger-client"),
      crypto = require('crypto'),
      _ = require('lodash'),
      db = require('diskdb'),
      BitMEXAPIKeyAuthorization = require('./lib/BitMEXAPIKeyAuthorization');

// Instantiate Telegram Bot
const bot = new TelegramBot(config.token, {polling: true});
const apiurl = config.testnet?config.bitmex.testurl:config.bitmex.produrl;
const helpkeyboard = {"reply_markup": {"keyboard": [["/help"],["/bal"],["/wallet"],["/orders"]],"one_time_keyboard":true}};
const algorithm = 'aes256';

if( config.testnet )
{
    console.log('Running BotMex in testnet mode');
}
else
{
    console.log('Running BotMex in production mode');
}

// Connect to diskdb
db.connect('./data', ['adminusers','premiumusers','accounts']);

// helper functions
function isAdmin(username)
{
    var isAdmin = db.adminusers.find({username:username});
    if( isAdmin.length )
    {
        return true;
    }

    return false;
}

function isPremiumUser(username)
{

    var isPremiumUser = db.premiumusers.find({username:username});

    if( isPremiumUser.length )
    {
        return true;
    }

    return isAdmin(username);
}

function getAdminUsernames()
{
    var admins = db.adminusers.find();
    var usernames = [];

    admins.forEach(function(admin){
        usernames.push("@"+admin.username);
    });

    return usernames.join(" OR ");
}

function encrypt(text, msg)
{
    var password = msg.from.username+msg.from.id;
    var cipher = crypto.createCipher(algorithm, password);  
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted, msg)
{
    var password = msg.from.username+msg.from.id;
    var decipher = crypto.createDecipher(algorithm, password);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

// Start
bot.onText(/\/start$/, (msg) => {

    var adminUsers = getAdminUsernames();
    var reply = "Welcome to BotMex! Thank you for your interest. Please contact "+adminUsers+" if you wish to have access to BotMex. If you already have access, type /help to see a list of available commands.";
    
    bot.sendMessage(msg.chat.id, reply, helpkeyboard);
});

// Help
bot.onText(/\/help$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /help from username:@' + msg.from.username);
    var reply = "";

    if( isPremiumUser(msg.from.username) )
    {
        reply = "Available Commands:\n";
        reply = reply + "/accounts - List of all your accounts\n";
        reply = reply + "/addaccount <account name> <api key> <api secret> - Add a BitMex API Account - USE ONLY READ ONLY KEYS FOR YOUR SAFETY!!\n";
        reply = reply + "/delaccount <account name> - Remove a BitMex API Account\n";
        reply = reply + "/positions - List of open positions for all accounts\n";
        reply = reply + "/positions <account name> - List of open positions for specified account\n";
        reply = reply + "/bal - List balance of all your accounts\n";
        reply = reply + "/bal <account name> - List balance for specified account\n";
        reply = reply + "/orders - List the last 40 orders for all accounts\n";
        reply = reply + "/orders <account name> - List the last 40 orders for specified account\n";
        reply = reply + "/wallet - List the last 40 wallet history entries for all accounts\n";
        reply = reply + "/wallet <account name> - List the last 40 wallet history entries for specified account\n";

        if( isAdmin(msg.from.username) )
        {
            reply = reply + "\nAdmin Commands:\n";
            reply = reply + "/admins - List of admin users\n";
            reply = reply + "/addadmin <username> - Add user as admin\n";
            reply = reply + "/deladmin <username> - Remove an admin user\n";
            reply = reply + "/users - List of premium users\n";
            reply = reply + "/adduser <username> - Add user as premium user\n";
            reply = reply + "/deluser <username> - Remove a premium user\n";
        }
    }
    else
    {
        var adminUsers = getAdminUsernames();
        reply = "Welcome to Phoenix - BotMex! Thank you for your interest. Please contact "+adminUsers+" if you wish to have access to this bot";
    }

    bot.sendMessage(msg.chat.id, reply);
});

/* Start of Admin Commands */

// List all premium users
bot.onText(/\/users$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /users from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var users = db.premiumusers.find();

        reply = "Premium Users:\n";

        if( users.length )
        {
            users.forEach(function(user){
                reply = reply + user.username + "\n";
            });
        }
        else
        {
            reply = reply + "<None>";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Add a premium user
bot.onText(/\/adduser ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /adduser ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var user = {username: match[1]};
        db.premiumusers.save(user);

        reply = match[1] + " successfully added";
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Delete a premium user
bot.onText(/\/deluser ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /deluser ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var query = {
            username: match[1]
        }

        var premiumUser = db.premiumusers.find(query);

        if( premiumUser.length )
        {
            db.premiumusers.remove(query,false);

            reply = match[1] + " successfully removed";
        }
        else
        {
            reply = match[1] + " not found";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

// List all admin users
bot.onText(/\/admins$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /admins from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var admins = db.adminusers.find();

        reply = "Admins:\n";

        admins.forEach(function(admin){
            reply = reply + admin.username + "\n";
        });
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Add an admin user 
bot.onText(/\/addadmin ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /addadmin ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var admin = {username: match[1]};
        db.adminusers.save(admin);

        reply = match[1] + " successfully added";
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Delete an admin user
bot.onText(/\/deladmin ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /deladmin ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isAdmin(msg.from.username) )
    {
        var query = {
            username: match[1]
        }

        var admin = db.adminusers.find(query);

        if( admin.length )
        {
            db.adminusers.remove(query,false);

            reply = match[1] + " successfully removed";
        }
        else
        {
            reply = match[1] + " not found";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

/* End of Admin Commands */

/* Start of Premium Users Commands */

// List all bitmex api accounts
bot.onText(/\/accounts$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /accounts from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";

    if( isPremiumUser(msg.from.username) )
    {
        var accounts = db.accounts.find({username:msg.from.username});

        reply = "BitMex Accounts:\n";

        if( accounts.length )
        {
            accounts.forEach(function(account){

                // Do some hiding for the account key/secret
                var pkey = decrypt(account.key,msg).substring(0,5) + "*****" + decrypt(account.key,msg).slice(-5);
                var psecret = decrypt(account.secret,msg).substring(0,5) + "*****" + decrypt(account.secret,msg).slice(-5);

                reply = reply + account.name + " (" + pkey + " : " + psecret + ")\n";
            });
        }
        else
        {
            reply = reply + "<None>";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Add bitmex api account
bot.onText(/\/addaccount ([^\s\\]+) ([^\s\\]+) ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /addaccount ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        // Check if api key/secret already exists
        var exist = db.accounts.findOne({username: msg.from.username, key: encrypt(match[2],msg),secret: encrypt(match[3],msg)});

        if( exist != undefined )
        {
            reply = "API Key/Secret already exists";
        }
        else
        {
            var account = {
                username: msg.from.username,
                name: match[1],
                key: encrypt(match[2],msg),
                secret: encrypt(match[3],msg)
            }

            db.accounts.save(account);

            reply = match[1] + " (" + match[2] + " : " + match[3] + ") successfully added";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

// Delete bitmex api account
bot.onText(/\/delaccount ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /delaccount ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username,
            name: match[1]
        }

        var account = db.accounts.find(query);

        if( account.length )
        {
            db.accounts.remove(query,false);

            reply = match[1] + " successfully removed";
        }
        else
        {
            reply = match[1] + " not found";
        }
    }

    bot.sendMessage(msg.chat.id, reply);
});

// List all open positions on all accounts
bot.onText(/\/positions$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /positions from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username
        }

        var accounts = db.accounts.find(query);

        if( accounts.length )
        {
            var msgtext = "";

            accounts.forEach(function(account){

                var bitmex = new SwaggerClient({
                    url: apiurl,
                    usePromise: true
                }).then(function(client) {

                    // Comment out if you're not requesting any user data.
                    client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));


                    client.Position.Position_get({count: 20, reverse: true})
                    .then(function(response) {

                        var positions = JSON.parse(response.data.toString());
                        var openFound = false;

                        msgtext = "BITMEX Positions for "+account.name+":\n\n";

                        positions.forEach(function(position){

                            if( position.isOpen )
                            {
                                openFound = true;

                                var percentage = Math.round(position.unrealisedRoePcnt*100*100)/100;

                                msgtext = msgtext + "Symbol: " + position.symbol + "\n";
                                msgtext = msgtext + "Size: " + position.currentQty + "\n";
                                msgtext = msgtext + "Entry Price: " + position.avgCostPrice + "\n";
                                msgtext = msgtext + "Market Price: " + position.markPrice + "\n";
                                msgtext = msgtext + "Unrealised PNL: " + position.simplePnl + " ("+percentage+"%)\n\n";
                            }
                        });

                        if( !openFound )
                        {
                            msgtext = msgtext + "&#60;None&#62;";
                        }


                        msgtext = "<pre>" + msgtext + "</pre>";

                        bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                        //bot.sendMessage(msg.chat.id,msgtext);
                    })
                    .catch(function(e) {
                        // Error handling...
                        console.log('Error:', e.statusText);
                    });
                }).catch(function(e) {
                    console.error("Unable to connect to bitmex:", e);
                });
            });
        }
        else
        {
            reply = "Please add a Bitmex API account first";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});

// List all open positions on a specific account
bot.onText(/\/positions ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /positions ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username,
            name: match[1]
        }

        var account = db.accounts.findOne(query);

        if( account != undefined )
        {
            var msgtext = "";

            var bitmex = new SwaggerClient({
                url: apiurl,
                usePromise: true
            }).then(function(client) {
                // Comment out if you're not requesting any user data.
                client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                client.Position.Position_get({count: 20, reverse: true})
                .then(function(response) {

                    var positions = JSON.parse(response.data.toString());
                    var openFound = false;

                    msgtext = "BITMEX Positions for "+account.name+":\n\n";

                    positions.forEach(function(position){

                        if( position.isOpen )
                        {
                            openFound = true;

                            var percentage = Math.round(position.unrealisedRoePcnt*100*100)/100;

                            msgtext = msgtext + "Symbol: " + position.symbol + "\n";
                            msgtext = msgtext + "Size: " + position.currentQty + "\n";
                            msgtext = msgtext + "Entry Price: " + position.avgCostPrice + "\n";
                            msgtext = msgtext + "Market Price: " + position.markPrice + "\n";
                            msgtext = msgtext + "Unrealised PNL: " + position.simplePnl + " ("+percentage+"%)\n\n";
                        }
                    });

                    if( !openFound )
                    {
                        msgtext = msgtext + "&#60;None&#62;";
                    }

                    msgtext = "<pre>" + msgtext + "</pre>";

                    bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                })
                .catch(function(e) {
                    // Error handling...
                    console.log('Error:', e.statusText);
                });
            }).catch(function(e) {
                console.error("Unable to connect to bitmex:", e);
            });
        }
        else
        {
            reply = "Account does not exist";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});

// List balance on all accounts
bot.onText(/\/bal$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /bal from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username
        }

        var accounts = db.accounts.find(query);

        if( accounts.length )
        {
            var msgtext = "";

            accounts.forEach(function(account){

                var bitmex = new SwaggerClient({
                    url: apiurl,
                    usePromise: true
                }).then(function(client) {

                    // Comment out if you're not requesting any user data.
                    client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                    client.User.User_getMargin()
                    .then(function(response) {

                        var balance = JSON.parse(response.data.toString());

                        var walletBalance = (balance.walletBalance / 1e8)
                        var unrealisedPnl = (balance.unrealisedPnl / 1e8)
                        var marginBalance = (balance.marginBalance / 1e8)
                        var positionMargin = (balance.maintMargin / 1e8);
                        var orderMargin = (balance.initMargin / 1e8);
                        var availableMargin = (balance.availableMargin / 1e8);
                        

                        msgtext = "BITMEX Balance for "+account.name+":\n\n";
                        msgtext += "Wallet Balance: "+walletBalance+"\n";
                        msgtext += "────────────────────────\n";
                        msgtext += "Unrealised PNL: "+unrealisedPnl+"\n";
                        msgtext += "Margin Balance: "+marginBalance+" ("+(balance.marginBalancePcnt*100).toFixed(2)+"%)\n";
                        msgtext += "────────────────────────\n";
                        msgtext += "Position Margin: "+positionMargin+"\n";
                        msgtext += "Order Margin: "+orderMargin+"\n";
                        msgtext += "Available Margin: "+availableMargin+"\n";
                        msgtext += "────────────────────────\n";
                        msgtext += (balance.marginUsedPcnt*100).toFixed(2) + "% Margin Used  ";
                        msgtext += (balance.marginLeverage).toFixed(2) + "x Leverage\n";

                        msgtext = "<pre>" + msgtext + "</pre>";

                        bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                    })
                    .catch(function(e) {
                        // Error handling...
                        console.log('Error:', e.statusText);
                    });
                }).catch(function(e) {
                    console.error("Unable to connect to bitmex:", e);
                });
            });
        }
        else
        {
            reply = "Please add a Bitmex API account first";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});

// List balance on a specific account
bot.onText(/\/bal ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /bal ' + match[1] + '  from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username,
            name: match[1]
        }

        var account = db.accounts.findOne(query);

        if( account != undefined )
        {
            var msgtext = "";

            var bitmex = new SwaggerClient({
                url: apiurl,
                usePromise: true
            }).then(function(client) {
                // Comment out if you're not requesting any user data.
                client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                client.User.User_getMargin()
                .then(function(response) {

                    var balance = JSON.parse(response.data.toString());

                    var walletBalance = (balance.walletBalance / 1e8)
                    var unrealisedPnl = (balance.unrealisedPnl / 1e8)
                    var marginBalance = (balance.marginBalance / 1e8)
                    var positionMargin = (balance.maintMargin / 1e8);
                    var orderMargin = (balance.initMargin / 1e8);
                    var availableMargin = (balance.availableMargin / 1e8);
                        

                    msgtext = "BITMEX Balance for "+account.name+":\n\n";
                    msgtext += "Wallet Balance: "+walletBalance+"\n";
                    msgtext += "────────────────────────\n";
                    msgtext += "Unrealised PNL: "+unrealisedPnl+"\n";
                    msgtext += "Margin Balance: "+marginBalance+" ("+(balance.marginBalancePcnt*100).toFixed(2)+"%)\n";
                    msgtext += "────────────────────────\n";
                    msgtext += "Position Margin: "+positionMargin+"\n";
                    msgtext += "Order Margin: "+orderMargin+"\n";
                    msgtext += "Available Margin: "+availableMargin+"\n";
                    msgtext += "────────────────────────\n";
                    msgtext += (balance.marginUsedPcnt*100).toFixed(2) + "% Margin Used  ";
                    msgtext += (balance.marginLeverage).toFixed(2) + "x Leverage\n";

                    msgtext = "<pre>" + msgtext + "</pre>";

                    bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                })
                .catch(function(e) {
                    // Error handling...
                    console.log('Error:', e.statusText);
                });
            }).catch(function(e) {
                console.error("Unable to connect to bitmex:", e);
            });
        }
        else
        {
            reply = "Account does not exist";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});


// List Orders on all accounts
bot.onText(/\/orders$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /orders from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username
        }

        var accounts = db.accounts.find(query);

        if( accounts.length )
        {
            var msgtext = "";

            accounts.forEach(function(account){

                var bitmex = new SwaggerClient({
                    url: apiurl,
                    usePromise: true
                }).then(function(client) {

                    // Comment out if you're not requesting any user data.
                    client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                    client.Order.Order_getOrders({count: 40, reverse: true, columns: ['symbol','side','orderQty','price','ordType','ordStatus','cumQty','avgPx','text','transactTime']})
                    .then(function(response) {

                        msgtext = "BITMEX Orders for "+account.name+":\n\n";
                        msgtext = msgtext + ":[Status] at [Time]\n";
                        msgtext = msgtext + "  Qty | Order Price | Filled | Fill Price\n";
                        msgtext = msgtext + "--------------------------------\n\n";

                        var orders = JSON.parse(response.data.toString());

			orders.forEach(function(order) {
                          var orderQty = (order.orderQty);//.toFixed(4);
                          var price = (order.price );//.toFixed(4);
                          var cumQty = (order.cumQty );//.toFixed(4);
                          var avgPx = (order.avgPx);//.toFixed(4);

                          var symbol = (order.symbol);
                          var side = (order.side);
                          var ordType = (order.ordType);
                          var ordStatus = (order.ordStatus);
                          var transactTime = (order.transactTime);
                          transactTime = transactTime.replace(/\d{2}(\d{2})[-](\d{2})[-](\d{2})[T](\d{2})[:](\d{2})[:](\d{2})[.](\d{3}[Z])/, "$3-$2-$1 $4:$5:$6");

                          msgtext += ":" + ordStatus + " at " + transactTime + "\n ";
                          msgtext += ((side=="Sell")?"-":"");
                          msgtext += orderQty + " | ";
                          msgtext += price + " | ";
                          msgtext += ((side=="Sell")?"-":"");
                          msgtext += cumQty + " | ";
                          msgtext += avgPx;
                          msgtext += "\n\n";
			});
                        
                        msgtext = "<pre>" + msgtext + "</pre>";

                        bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                    })
                    .catch(function(e) {
                        // Error handling...
                        console.log('Error:', e.statusText);
                    });
                }).catch(function(e) {
                    console.error("Unable to connect to bitmex:", e);
                });
            });
        }
        else
        {
            reply = "Please add a Bitmex API account first";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});


// List Orders on a specific account
bot.onText(/\/orders ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /orders ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username,
            name: match[1]
        }

        var account = db.accounts.findOne(query);

        if( account != undefined )
        {
            var msgtext = "";

            var bitmex = new SwaggerClient({
                url: apiurl,
                usePromise: true
            }).then(function(client) {
              // Comment out if you're not requesting any user data.
                client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                // Comment out if you're not requesting any user data.
                client.Order.Order_getOrders({count: 40, reverse: true, columns: ['symbol','side','orderQty','price','ordType','ordStatus','cumQty','avgPx','text','transactTime']})
                .then(function(response) {

                    msgtext = "BITMEX Orders for "+account.name+":\n\n";
                    msgtext = msgtext + ":[Status] at [Time]\n";
                    msgtext = msgtext + "  Qty | Order Price | Filled | Fill Price\n";
                    msgtext = msgtext + "-----------------------------------------\n\n";

                    var orders = JSON.parse(response.data.toString());

                    orders.forEach(function(order) {
                      var orderQty = (order.orderQty);//.toFixed(4);
                      var price = (order.price );//.toFixed(4);
                      var cumQty = (order.cumQty );//.toFixed(4);
                      var avgPx = (order.avgPx);//.toFixed(4);

                      var symbol = (order.symbol);
                      var side = (order.side);
                      var ordType = (order.ordType);
                      var ordStatus = (order.ordStatus);
                      var transactTime = (order.transactTime);
                      transactTime = transactTime.replace(/\d{2}(\d{2})[-](\d{2})[-](\d{2})[T](\d{2})[:](\d{2})[:](\d{2})[.](\d{3}[Z])/, "$3-$2-$1 $4:$5:$6");

                      msgtext += ":" + ordStatus + " at " + transactTime + "\n ";
                      msgtext += ((side=="Sell")?"-":"");
                      msgtext += orderQty + " | ";
                      msgtext += price + " | ";
                      msgtext += ((side=="Sell")?"-":"");
                      msgtext += cumQty + " | ";
                      msgtext += avgPx;
                      msgtext += "\n\n";
                    });
                        
                    msgtext = "<pre>" + msgtext + "</pre>";

                    bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                })
                .catch(function(e) {
                    // Error handling...
                    console.log('Error:', e.statusText);
                });
            }).catch(function(e) {
                console.error("Unable to connect to bitmex:", e);
            });
        }
        else
        {
            reply = "Account does not exist";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});


// List Wallet History on all accounts
bot.onText(/\/wallet$/, (msg) => {

    console.log('[' + new Date().toString() + '] Command /wallet from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username
        }

        var accounts = db.accounts.find(query);

        if( accounts.length )
        {
            var msgtext = "";

            accounts.forEach(function(account){

                var bitmex = new SwaggerClient({
                    url: apiurl,
                    usePromise: true
                }).then(function(client) {

                    // Comment out if you're not requesting any user data.
                    client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));

                    client.User.User_getWalletHistory({count: 40})
                    .then(function(response) {

                        msgtext = "BITMEX Wallet History for "+account.name+":\n\n";

                        var wallethistory = JSON.parse(response.data.toString());

			var wBal = [];
			wallethistory.forEach(function(wh) {
                          wBal.push(wh.walletBalance);
			});
			msgtext += "\nWallet Balance: " + wBal.shift() / 1e8 + " BTC\n";
			msgtext += "------------------------------\n\n";
			var roiTxt = "";

			wallethistory.forEach(function(wh) {
                          var transactType = (wh.transactType);
                          var transactStatus = (wh.transactStatus );
                          var transactTime = (wh.transactTime );
                          var walletBalance = (wh.walletBalance);
                          var amount = (wh.amount / 1e8);
                          if(transactType=="RealisedPNL" && wBal.length) roiTxt = " (" + parseFloat(100*((parseFloat(walletBalance) / parseFloat(wBal.shift()))-1)).toFixed(3)+"%)"; else {wBal.shift();roiTxt = "";}

                          transactTime = transactTime.replace(/\d{2}(\d{2})[-](\d{2})[-](\d{2})[T](\d{2})[:](\d{2})[:](\d{2})[.](\d{3}[Z])/, "$3-$2-$1 $4:$5:$6");

                          msgtext += ":" + transactType + "\n " + amount + " BTC" + roiTxt + ",\n " + transactStatus +  " at " + transactTime + "\n\n";
			});
                        
                        msgtext = "<pre>" + msgtext + "</pre>";

                        bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                    })
                    .catch(function(e) {
                        // Error handling...
                        console.log('Error:', e.statusText);
                    });
                }).catch(function(e) {
                    console.error("Unable to connect to bitmex:", e);
                });
            });
        }
        else
        {
            reply = "Please add a Bitmex API account first";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});


// List Wallet History on a specific account
bot.onText(/\/wallet ([^\s\\]+)$/, (msg, match) => {

    console.log('[' + new Date().toString() + '] Command /wallet ' + match[1] + ' from username:@' + msg.from.username);
    var reply = "Invalid Command. Type /help for more info.";
    if( isPremiumUser(msg.from.username) )
    {
        var query = {
            username: msg.from.username,
            name: match[1]
        }

        var account = db.accounts.findOne(query);

        if( account != undefined )
        {
            var msgtext = "";

            var bitmex = new SwaggerClient({
                url: apiurl,
                usePromise: true
            }).then(function(client) {
              // Comment out if you're not requesting any user data.
                client.clientAuthorizations.add("apiKey", new BitMEXAPIKeyAuthorization(decrypt(account.key,msg), decrypt(account.secret,msg)));
                client.User.User_getWalletHistory({count: 40})
                .then(function(response) {

                    msgtext = "BITMEX Wallet History for "+account.name+":\n\n";

                    var wallethistory = JSON.parse(response.data.toString());

                    wallethistory.forEach(function(wh) {
                      var transactType = (wh.transactType);
                      var transactStatus = (wh.transactStatus );
                      var transactTime = (wh.transactTime );
                      var walletBalance = (wh.walletBalance / 1e8 );
                      var amount = (wh.amount / 1e8);

                      transactTime = transactTime.replace(/\d{2}(\d{2})[-](\d{2})[-](\d{2})[T](\d{2})[:](\d{2})[:](\d{2})[.](\d{3}[Z])/, "$3-$2-$1 $4:$5:$6");

                      msgtext += ":" + transactType + " " + amount + " BTC,\n " + transactStatus +  " at " + transactTime + "\n\n";
                    });
                        
                    msgtext = "<pre>" + msgtext + "</pre>";

                    bot.sendMessage(msg.chat.id,text=msgtext,{parse_mode : "HTML"})
                })
                .catch(function(e) {
                    // Error handling...
                    console.log('Error:', e.statusText);
                });
            }).catch(function(e) {
                console.error("Unable to connect to bitmex:", e);
            });
        }
        else
        {
            reply = "Account does not exist";
            bot.sendMessage(msg.chat.id, reply);
        }
    }
    else
    {
        bot.sendMessage(msg.chat.id, reply);
    }
});


bot.onText(/\/close/, (msg, match) => {
    var reply = "Command is currently under development. Type /help for other commands.";
    bot.sendMessage(msg.chat.id, reply, helpkeyboard);
});

/* End of User Commands */


/* Incomplete Syntax Handlers */

bot.onText(/\/delaccount$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/addaccount$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/deladmin$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/addadmin$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/deluser$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/adduser$/, (msg, match) => {
    var reply = "Incomplete Syntax. Type /help for more info.";
    bot.sendMessage(msg.chat.id, reply);
});

