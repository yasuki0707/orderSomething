var getTokens = async function(event_data) {

    const fetch = require('node-fetch');
    //const line = require('@line/bot-sdk');

    const reply_token = event_data.events[0].replyToken;
    console.log("reply_token:" + reply_token)

    const CHANNEL_SECRET = process.env.CHANNEL_SECRET
    const CHANNEL_ID = process.env.CHANNEL_ID
    
    const API_URL = 'https://api.line.me/v2/oauth/accessToken'

    const BODY = "grant_type=client_credentials"
        + '&client_id=' + CHANNEL_ID
        + '&client_secret=' + CHANNEL_SECRET

    const options = {
        method: 'POST',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
        },
        body: BODY,
    }

    const response = await fetch(API_URL, options)
    const json = await response.json()
    const access_token = json.access_token

    return {reply_token, access_token}

}

module.exports.getTokens = getTokens