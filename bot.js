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
const QCon = require('./lib/questions')
const MCon = require('./lib/messages')

//Global Variables
const pattPP = /[^ضشظصسطثیزقبرفلذغادعتئهنخمحجچگک]/g
//session
bot.use(session())

//start
bot.start((ctx) => {
    MainMenu(ctx)
    StoreOutput(ctx)
    TelAllExp(ctx)
})

//campaign start
bot.action('campaign', (ctx) => {
    DelMessage(ctx)
    ctx.telegram.sendMessage(ctx.chat.id, MCon.CampDesc, {
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
    if (ctx.session.campaign == "on") {
        DelMessage(ctx)
        ctx.session.campaign = "pic"
        ctx.reply("Send Your Photo Please")
    } else {
        ctx.reply("لطفاً برای شرکت در کمپین، از منوی اصلی اقدام کنید")
        MainMenu(ctx)
    }
})
bot.action('name', (ctx) => {
    if (ctx.session.campaign == "on") {
        DelMessage(ctx)
        ctx.session.campaign = "name"
        ctx.reply("Please Send Your Name In Persian")
    } else {
        ctx.reply("لطفاً برای شرکت در کمپین، از منوی اصلی اقدام کنید")
        MainMenu(ctx)
    }
})

bot.on('text', (ctx, next) => {
    TelAllExp(ctx)
    ctx.session.input = ctx.message.text
    if (ctx.session.campaign == "name") {
        if (/\n/.test(ctx.session.input)){
            ctx.reply("لطفا نام خود را در یک خط وارد کنید")
        } else if (pattPP.test(ctx.session.input)) {
            ctx.reply("لطفا نام خود را به فارسی وارد کنید")
        } else {
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
            gsCampUpdate(client, ctx, [[ctx.session.chatid, ctx.session.name, ctx.session.username, new Date(), "Name"]])
        }
    }
    next()
})

//merge
bot.on('photo', (ctx) => {
    TelAllExp(ctx)
    if (ctx.session.campaign == "pic") {
        ctx.session.position = ctx.message.photo.length - 1
        ctx.telegram.getFileLink(ctx.message.photo[ctx.session.position].file_id).then(url => {
            // console.log(url) 
            axios.get(url, { responseType: "arraybuffer" }).then(image => {
                sharp(Buffer.from(image.data, "binary"))
                    .composite([{ input: "./img/foreground.png", gravity: 'center' }])
                    .resize({ width: 500 })
                    .jpeg({ quality: 100 })
                    .toBuffer()
                    .then(async buffer => {
                        ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo")
                        await ctx.replyWithPhoto({ source: buffer })
                        await ctx.reply("Thanks For Joining Our Campaign")
                        MainMenu(ctx)
                        ctx.session.campaign = "off"
                        gsCampUpdate(client, ctx, [[ctx.session.chatid, ctx.session.name, ctx.session.username, new Date(), "Photo"]])
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
    DelMessage(ctx)
    ctx.reply(MCon.CompDesc)
    ctx.session.QuestionNumber = 0
    ctx.session.score = 0
    ctx.telegram.sendMessage(ctx.chat.id, QCon.questionList[ctx.session.QuestionNumber][0], QCon.questionList[ctx.session.QuestionNumber][1])
})

//check answer
bot.action('correct', (ctx) => {
    DelMessage(ctx)
    ctx.session.QuestionNumber++
    ctx.session.score++
    if (ctx.session.QuestionNumber == QCon.questionList.length) {
        showResult(ctx)
    } else {
        ctx.telegram.sendMessage(ctx.chat.id, QCon.questionList[ctx.session.QuestionNumber][0], QCon.questionList[ctx.session.QuestionNumber][1])
    }
})

bot.action('wrong', (ctx) => {
    DelMessage(ctx)
    ctx.session.QuestionNumber++
    if (ctx.session.QuestionNumber == QCon.questionList.length) {
        showResult(ctx)
    } else {
        ctx.telegram.sendMessage(ctx.chat.id, QCon.questionList[ctx.session.QuestionNumber][0], QCon.questionList[ctx.session.QuestionNumber][1])
    }
})

//Bot Launch
bot.launch()

//functions
function MainMenu(ctx) {
    ctx.telegram.sendMessage(ctx.chat.id, MCon.StartMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "شرکت در کمپین", callback_data: "campaign" }],
                [{ text: "شرکت در مسابقه", callback_data: "competition" }]
            ]
        }
    })
}

async function showResult(ctx) {
    await ctx.reply(`Thanks For Your Time! Your Score: ${ctx.session.score}`)
    MainMenu(ctx)
    gsComUpdate(client, ctx, [[ctx.session.chatid, ctx.session.name, ctx.session.username, new Date(), ctx.session.score]])
}

async function CampaignName(ctx, canvas) {
    ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo")
    await ctx.replyWithPhoto({ source: canvas.toBuffer('image/png') })
    await ctx.reply("Thanks For Joining Our Campaign")
    MainMenu(ctx)
}

async function gsCampUpdate(client, ctx, output) {
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const updateOptions = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `Campaign!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: output }
    }
    await gsapi.spreadsheets.values.append(updateOptions)
}

async function gsComUpdate(client, ctx, output) {
    const gsapi = google.sheets({ version: 'v4', auth: client })
    const updateOptions = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: `Competition!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: output }
    }
    await gsapi.spreadsheets.values.append(updateOptions)
}

function TelAllExp(ctx) {
    try {
        ctx.telegram.forwardMessage(-415890308, ctx.chat.id, ctx.message.message_id)
        ctx.telegram.sendMessage(-415890308, `@${ctx.message.from.username}`)
    } catch (error) {
        console.log("Some Error !!")
    }
}

function StoreOutput(ctx) {
    ctx.session.chatid = ctx.chat.id
    ctx.session.name = ctx.message.from.first_name
    ctx.session.username = ctx.message.from.username
    ctx.session.score = 0
}

function DelMessage(ctx) {
    try {
        ctx.deleteMessage()
    } catch (error) {
        console.log("Del Error")
    }
}