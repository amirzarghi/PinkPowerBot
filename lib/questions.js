const questionList = [
    ["Question 1:",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Option 1A", callback_data: "correct" }],
                    [{ text: "Option 1B", callback_data: "wrong" }]
                ]
            }
        }
    ],
    ["Question 2:",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Option 2A", callback_data: "wrong" }],
                    [{ text: "Option 2B", callback_data: "correct" }]
                ]
            }
        }
    ],
    ["Question 3:",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Option 3A", callback_data: "correct" }],
                    [{ text: "Option 3B", callback_data: "wrong" }]
                ]
            }
        }
    ],
    ["Question 4:",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Option 4A", callback_data: "wrong" }],
                    [{ text: "Option 4B", callback_data: "correct" }]
                ]
            }
        }
    ]
]

module.exports = {
    questionList
}
