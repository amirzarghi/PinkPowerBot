require('dotenv').config()
const  Telegraf  = require('telegraf')
const BOT_TOKEN = process.env.BOT_TOKEN ;
const PORT = process.env.PORT || 3000;
const URL = process.env.URL;
const bot = new Telegraf(BOT_TOKEN);
bot.telegram.setWebhook(`${URL}/bot${BOT_TOKEN}`);
bot.startWebhook(`/bot${BOT_TOKEN}, null, PORT`);
const axios = require('axios').default
const sharp = require('sharp')

bot.start(ctx => ctx.reply("Bot Has Started!!!"))

bot.on('photo', (ctx) => {
    if (!ctx.message.photo) return ctx.reply("Attach:")
    var position = ctx.message.photo.length - 1
    ctx.telegram.getFileLink(ctx.message.photo[position].file_id).then(url => {
        console.log(url)
        axios.get(url, { responseType: "arraybuffer" }).then(async image => {
            sharp(Buffer.from(image.data, "binary"))
                .composite([{ input: "foreground.png", gravity: 'center' }])
                .resize({ width: 1000 })
                .jpeg({ quality: 100 })
                .toBuffer()
                .then(buffer => {
                    ctx.replyWithPhoto({ source: buffer })
                })
        })
    })
})
bot.launch()