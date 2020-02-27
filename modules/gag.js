var func = async function(event_data) {
    // load modules
    const fetch = require('node-fetch');
    const line = require('@line/bot-sdk');

    let reply_token = event_data.events[0].replyToken;
    let text = event_data.events[0].message.text

    console.log("reply_token:" + reply_token)

    const CHANNEL_SECRET = process.env.CHANNEL_SECRET
    const CHANNEL_ID = process.env.CHANNEL_ID
    
    //console.log("CHANNEL_SECRET:" + CHANNEL_SECRET)
    //console.log("CHANNEL_ID:" + CHANNEL_ID)

    console.log("inputed message:" + text)
    
    let gag = await getGag(text)
    
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

    // TODO:use async/await
    // なぜか一回目の実行ではここに入る前に終了してしまい、二回目の実行で前のギャグが送信されてしまう、時間差。。？
    let response = await fetch(API_URL, options)
    //console.log("response:")
    //console.log(response)
    let json = await response.json()
    let access_token = json.access_token
    console.log("access_token:" + access_token)
    
    const client = new line.Client( {
		channelAccessToken: access_token
    })
    
    // when called from lamnda-local, replyMessage would be failed, should be avoided
    if(process.env.funcFile !== undefined) {
	    client.pushMessage('Uaae1c11daa5c03cb541147a9c02e04f6', {type:'text', text:gag})
	} else {
	    let retttt = await client.replyMessage(reply_token, {type:'text', text:gag})
	}
}

async function getGag(inputChar) {

    const fetch = require('node-fetch');
    var jsdom = require('jsdom');
    const { JSDOM } = jsdom;

    const URLs = [
	    "http://amaebiuniko2.web.fc2.com/a_o.html",
	    "http://amaebiuniko2.web.fc2.com/ka_ko.html",
	    "http://amaebiuniko2.web.fc2.com/sa_so.html",
	    "http://amaebiuniko2.web.fc2.com/ta_to.html",
	    "http://amaebiuniko2.web.fc2.com/na_no.html",
	    "http://amaebiuniko2.web.fc2.com/ha_ho.html",
	    "http://amaebiuniko2.web.fc2.com/ma_mo.html",
	    "http://amaebiuniko2.web.fc2.com/ya_yo.html",
	    "http://amaebiuniko2.web.fc2.com/ra_ro.html",
	    "http://amaebiuniko2.web.fc2.com/wa.html",
    ]
    
    // to have table contains all the characters(あ～ん)
    // like..
    // [
    // 	['\u3041','\u3042'..'\u304A'],// あ
    // 	['\u3041','\u3042'..'\u304A'],// か
    // 	['\u3041','\u3042'..'\u304A'],// さ
    // specify pageNo(0-9行) and id in that page(0-4in行)
    const charCodes = [
    	[ ['\u3041','ぁ'],['\u3042','あ'],['\u3043','ぃ'],['\u3044','い'],['\u3045','ぅ'],['\u3046','う'],['\u3047','ぇ'],['\u3048','え'],['\u3049','ぉ'],['\u304A','お'] ],
    	[ ['\u304B','か'],['\u304C','が'],['\u304D','き'],['\u304E','ぎ'],['\u304F','く'],['\u3050','ぐ'],['\u3051','け'],['\u3052','げ'],['\u3053','こ'],['\u3054','ご'] ],
    	[ ['\u3055','さ'],['\u3056','ざ'],['\u3057','し'],['\u3058','じ'],['\u3059','す'],['\u305A','ず'],['\u305B','せ'],['\u305C','ぜ'],['\u305D','そ'],['\u305E','ぞ'] ],
    	[ ['\u305F','た'],['\u3060','だ'],['\u3061','ち'],['\u3062','ぢ'],['\u3063','っ'],['\u3064','つ'],['\u3065','づ'],['\u3066','て'],['\u3067','で'],['\u3068','と'],['\u3069','ど'] ],
    	[ ['\u306A','な'],['\u306B','に'],['\u306C','ぬ'],['\u306D','ね'],['\u306E','の'] ],
    	[ ['\u306F','は'],['\u3070','ば'],['\u3071','ぱ'],['\u3072','ひ'],['\u3073','び'],['\u3074','ぴ'],['\u3075','ふ'],['\u3076','ぶ'],['\u3077','ぷ'],['\u3078','へ'],['\u3079','べ'],['\u307A','ぺ'],['\u307B','ほ'],['\u307C','ぼ'],['\u307D','ぽ'] ],
    	[ ['\u307E','ま'],['\u307F','み'],['\u3080','む'],['\u3081','め'],['\u3082','も'] ],
    	[ ['\u3083','ゃ'],['\u3084','や'],['\u3085','ゅ'],['\u3086','ゆ'],['\u3087','ょ'],['\u3088','よ'] ],
    	[ ['\u3089','ら'],['\u308A','り'],['\u308B','る'],['\u308C','れ'],['\u308D','ろ'] ],
    	[ ['\u308E','ゎ'],['\u308F','わ'],['\u3090','ゐ'],['\u3091','ゑ'],['\u3092','を'],['\u3093','ん'],['\u3094','ゔ'] ]
    ]
    
    const charCodes2 = [
    	/* あ */[ ['\u3041','\u3042'],['\u3043','\u3044'],['\u3045','\u3046'],['\u3047','\u3048'],['\u3049','\u304A'] ],
    	/* か */[ ['\u304B','\u304C'],['\u304D','\u304E'],['\u304F','\u3050'],['\u3051','\u3052'],['\u3053','\u3054'] ],
    	/* さ */[ ['\u3055','\u3056'],['\u3057','\u3058'],['\u3059','\u305A'],['\u305B','\u305C'],['\u305D','\u305E'] ],
    	/* た */[ ['\u305F','\u3060'],['\u3061','\u3062'],['\u3063','\u3064','\u3065'],['\u3066','\u3067'],['\u3068','\u3069'] ],
    	/* な */[ ['\u306A'],['\u306B'],['\u306C'],['\u306D'],['\u306E'] ],
    	/* は */[ ['\u306F','\u3070','\u3071'],['\u3072','\u3073','\u3074'],['\u3075','\u3076','\u3077'],['\u3078','\u3079','\u307A'],['\u307B','\u307C','\u307D'] ],
    	/* ま */[ ['\u307E'],['\u307F'],['\u3080'],['\u3081'],['\u3082'] ],
    	/* や */[ ['\u3083','\u3084'],['\u3085','\u3086'],['\u3087','\u3088'] ],
    	/* ら */[ ['\u3089'],['\u308A'],['\u308B'],['\u308C'],['\u308D'] ],
    	/* わ */[ ['\u308E','\u308F']],
    	/* その他 [['\u3090','ゐ'],['\u3091','ゑ'],['\u3092','を'],['\u3093','ん'],['\u3094','ゔ']],*/
    ]

    if(inputChar.length > 1) {
    	console.log("message entered should be one character!")
    	return "message entered should be one character!"
    }

    let charCode = inputChar.charCodeAt(0)
    console.log("charCode:" + charCode)
    
   
    let pageNo// あ～わ+その他(0-10)
    let lineNo// a~o(0-4)
    charCodes2.forEach((line, i) => {
    	line.forEach((c, j) => {
    		if(c.includes(inputChar)) {
    			pageNo = i
    			lineNo = j
    		}
    	})
    })
    
    const res = await fetch(URLs[pageNo])
    const text = await res.text()
    const { document } = (new JSDOM(text)).window;
    let elements = document.getElementsByClassName('right_1')
    
	let elm = elements[lineNo]
	console.log(elm.getElementsByTagName('h2')[0].textContent)
	let list = elm.getElementsByTagName('li')
	let id = (new Date()).getTime()%(list.length)// get randomly from the list
	console.log("the number of gags:"+list.length)
	console.log("id:"+id)
	const ret = list[id].textContent.trim()
	console.log("the " + id + "th gag " + "'" + ret + "'" + " has been chosen")

    return ret
}

module.exports.func = func