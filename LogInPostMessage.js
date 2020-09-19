require('dotenv').config()

//Telegraf
const Telegraf = require('telegraf')
const BOT_TOKEN = process.env.BOT_TOKEN
const bot = new Telegraf(BOT_TOKEN)

//spread sheet
const { google } = require('googleapis')
const keys = require('./keys.json')
const client = new google.auth.JWT(keys.client_email, null, keys.private_key, ['https://www.googleapis.com/auth/spreadsheets'])
client.authorize(function (err) {
    if (err) {
        console.log(err)
    } else {
        console.log("Connected To Spread Sheet!")
    }
})

//body
bot.start(ctx => {
    loginCheck(client, ctx)
})

bot.command('send', (ctx) => {
        postMessage(client, ctx)
})
bot.launch()

//funcrions
async function idUp(client, output) {
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const idOpt = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `test!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: output }
    }
    await gsapi.spreadsheets.values.append(idOpt)
}

async function postMessage(client, ctx) {
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const opt = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `test!A1:A16`
    }
    let res = await gsapi.spreadsheets.values.get(opt)
    let values = res.data.values
    values.splice(0, 1, -99999999)
    values.sort()
    for (i = 1; i < values.length; i++) {
        if (values[i][0] != values[i - 1][0]) {
            ctx.telegram.sendMessage(values[i][0], "Post Message")
        }
    }
}

async function loginCheck(client, ctx) {
    let logged = 0
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const checkOpt = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `test!A1:A20`
    }
    let res = await gsapi.spreadsheets.values.get(checkOpt)
    let values = res.data.values
    for (i = 1; i < values.length; i++) {
        if (ctx.chat.id == values[i]) {
            ctx.reply("You have submitted already!")
            logged = 1
            break
        }
    }
    if (logged == 0) {
        ctx.reply("Submitted!")
        idUp(client, [[ctx.chat.id, ctx.message.from.username]])
    }
}