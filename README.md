# BotMex #


### What is BotMex? ###

BotMex is a quick way to monitor your BitMex trading portfolio using a Telegram bot.

It currently supports:
* Using multiple BitMex API accounts
* Listing open positions on all accounts or only on a specified one

The following features are planned to be added in the near future:
* Close open positions for a specified trading pair on all accounts or only on a specified one

## How do I get set up? ###

Download and install Node.js

https://nodejs.org/en/download/

Clone or download this repository

### Configuring config.json ###

Open `config.json` with your favorite text editor

Specify your Telegram Bot's token (See steps below how to create a Telegram Bot) and whether using testnet or production:

```
"token": "<INSERT TOKEN HERE>"
"testnet": true
```

### How to get Telegram Token

Talk to the BotFather https://telegram.me/botfather

Write /newbot and follow the instructions

You should get your token like this:
```
Use this token to access the HTTP API:
488814350:AAFxmfas0zOKSmDaAgAierd90-v8h_LKeF8
```

### First time run

Don't forget to install Node.js

Open up your command prompt or terminal and navigate to your directory

Navigate to your directory using 

```
cd *your directory*
for example:
cd /home/user/botmex
```

Then, run these commands

```
npm install
npm start
```

npm install will install required dependancies for this script and npm start will run it.


Add your telegram username in the adminusers.json file in the data folder in order to start using the Bot. At least 1 user should be an admin to be able to manage the bot. Unauthorized users will not be able to access the Bot's features and only Admins can give other users access.


## Available commands ###

```
Generic commands:
/help - Display all the available commands
/accounts - List of all your accounts
/addaccount <account name> <api key> <api secret> - Add a BitMex API Account
/delaccount <account name> - Remove a BitMex API Account
/positions - List of open positions for all accounts
/positions <account name> - List of open positions for specified account
/orders - List the last 40 orders for all accounts
/orders <account name> - List the last 40 orders for specified account
/wallet - List the last 40 wallet history entries for all accounts
/wallet <account name> - List the last 40 wallet history entries for specified account

Admin commands:
/admins - List of admin users
/addadmin <username> - Add user as admin
/deladmin <username> - Remove an admin user
/users - List of premium users
/adduser <username> - Add user as premium user
/deluser <username> - Remove a premium user
```
