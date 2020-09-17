require('dotenv').config()
//Telegraf
const Telegraf = require('telegraf')
const BOT_TOKEN = process.env.BOT_TOKEN
const bot = new Telegraf(BOT_TOKEN)
const session = require('telegraf/session')

//Packages
const axios = require('axios').default
const sharp = require('sharp')

//spreadsheet api
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

//Webhook
const PORT = 3000;
const URL = process.env.URL;
// bot.telegram.setWebhook(`${URL}/bot${BOT_TOKEN}`);
// bot.startWebhook(`/bot${BOT_TOKEN}, null, PORT`);

//Config Messages
const config = require('./lib/questions')

//Global Variables

//session
bot.use(session())

//start
bot.start((ctx) => {
    MainMenu(ctx)
    ctx.session.chatid = ctx.chat.id
    ctx.session.name = ctx.message.from.first_name
    ctx.session.username = ctx.message.from.username
    ctx.session.score = 0
})

//campaign start
bot.action('campaign', (ctx) => {
    ctx.deleteMessage()
    ctx.telegram.sendMessage(ctx.chat.id, "Campaign Description", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "ثبت نام با تصویر", callback_data: "pic" }],
                [{ text: "ثبت نام با اسم", callback_data: "name" }]
            ]
        }
    })
    ctx.session.campaign = "on"
})

//Campign regestir method
bot.action('pic', (ctx) => {
    ctx.deleteMessage()
    ctx.session.campaign = "pic"
    ctx.reply("Send Your Photo Please")
})
bot.action('name', (ctx) => {
    ctx.deleteMessage()
    ctx.session.campaign = "name"
    ctx.reply("Send Your Name Please")
})

bot.on('text', (ctx, next) => {
    if (ctx.session.campaign == "name") {
        //canvas
        const { registerFont, createCanvas, loadImage } = require('canvas')
        registerFont('BNazanin.ttf', { family: 'BNazanin' })
        const canvas = createCanvas(1000, 1000)
        const ccx = canvas.getContext('2d')
        //write
        ctx.session.input = ctx.message.text
        ccx.font = '90px BNazanin'
        ccx.fillText(ctx.session.input, 500, 500)
        CampaignName(ctx, canvas)
        ctx.session.campaign = "off"
    }
    next()
})

//merge
bot.on('photo', (ctx) => {
    if (ctx.session.campaign == "pic") {
        var position = ctx.message.photo.length - 1
        ctx.telegram.getFileLink(ctx.message.photo[position].file_id).then(url => {
            // console.log(url) 
            axios.get(url, { responseType: "arraybuffer" }).then(image => {
                sharp(Buffer.from(image.data, "binary"))
                    .composite([{ input: "./img/foreground.png", gravity: 'center' }])
                    .resize({ width: 500 })
                    .jpeg({ quality: 100 })
                    .toBuffer()
                    .then(async buffer => {
                        await ctx.replyWithPhoto({ source: buffer })
                        await ctx.reply("Thanks For Joining Our Campaign")
                        MainMenu(ctx)
                        ctx.session.campaign = "off"
                    })
            })
        })
    } else {
        ctx.reply("لطفاً برای شرکت در کمپین، از منوی اصلی اقدام کنید")
        MainMenu(ctx)
    }
})

//competition start
bot.action('competition', (ctx) => {
    ctx.deleteMessage()
    ctx.reply("competition Description")
    ctx.session.QuestionNumber = 0
    ctx.session.score = 0
    ctx.telegram.sendMessage(ctx.chat.id, config.questionList[ctx.session.QuestionNumber][0], config.questionList[ctx.session.QuestionNumber][1])
})

//check answer
bot.action('correct', (ctx) => {
    ctx.deleteMessage()
    ctx.session.QuestionNumber++
    ctx.session.score++
    if (ctx.session.QuestionNumber == config.questionList.length) {
        showResult(ctx)
    } else {
        ctx.telegram.sendMessage(ctx.chat.id, config.questionList[ctx.session.QuestionNumber][0], config.questionList[ctx.session.QuestionNumber][1])
    }
})

bot.action('wrong', (ctx) => {
    ctx.deleteMessage()
    ctx.session.QuestionNumber++
    if (ctx.session.QuestionNumber == config.questionList.length) {
        showResult(ctx)
    } else {
        ctx.telegram.sendMessage(ctx.chat.id, config.questionList[ctx.session.QuestionNumber][0], config.questionList[ctx.session.QuestionNumber][1])
    }
})

//Bot Launch
bot.launch()

//functions
function MainMenu(ctx) {
    ctx.telegram.sendMessage(ctx.chat.id, "Start Message", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "شرکت در کمپین", callback_data: "campaign" }],
                [{ text: "شرکت در مسابقه", callback_data: "competition" }]
            ]
        }
    })
}

async function showResult(ctx) {
    await ctx.reply("Thanks For Your Time!")
    await ctx.reply(`Your Score: ${ctx.session.score}`)
    MainMenu(ctx)

    var output = [[ctx.session.chatid, ctx.session.name, ctx.session.username, new Date(), ctx.session.score]]
    gsupdate(client, ctx, output)
}

async function CampaignName(ctx, canvas) {
    await ctx.replyWithPhoto({ source: canvas.toBuffer('image/png') })
    await ctx.reply("Thanks For Joining Our Campaign")
    MainMenu(ctx)
}

async function gsupdate(client, ctx, output) {
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const updateOptions = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `Export!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: output }
    }
    await gsapi.spreadsheets.values.append(updateOptions)
}