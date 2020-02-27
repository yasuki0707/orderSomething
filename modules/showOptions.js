var func = async function(event_data) {
    // load modules
    const fetch = require('node-fetch');
    const line = require('@line/bot-sdk');

    let event_type = event_data.events[0].type
    const searchText = event_data.events[0].message.text
    if(event_type=='message') {
	    console.log("searchText:" + searchText)
      const merchant = await getMerchant(searchText)
      var items = merchant.items
      var thumbnailImageUrl = merchant.thumbnailImageUrl
	    if(!items || items.length==0) {
	    	console.log("failed to fetch any item:")
	    	return
	    }
	    console.log("number of items:" + items.length)
	    
    } else if(event_type=='postback') {
    	var postback_data = event_data.events[0].postback.data
    	console.log("postback_data:" + postback_data)
    	console.log("goto " + postback_data + " and do shopping:)")
    }

    let reply_token = event_data.events[0].replyToken;
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
    let obj
    if(items !== undefined) {
	    const actions = items.map((x, i) => {
const max = 20
const commaLen = 3
const strLen = x.title.length
const strShowLen = strLen > max ? max-commaLen : strLen
const padLen = Math.min(strLen, max)
	    	 return {
	    	 	/* postback action */
				/* when you want user to order on Line */
				/* post back */
				/*
		    	'type':'postback',
				"label":x.title.substr(0,16) + '..',
				"data":x.title,//x.href,
				"displayText":"I just ordered " + x.title,
				*/
				/* uri action */
				/* when you want user to move to amazon url */
		    	'type':'uri',
				//"label":x.title.substr(0,16) + '..',
				"label":x.title.slice(0,strShowLen).padEnd(padLen,'.'),
				"uri":x.href,
	    		}
	    	})
	    
	    obj = {
	    	type:'template',
	    	altText:`order options for ${searchText} has been suggested`,
	    	template:{
	    		type:'buttons',
	    		title:'order something',
	    		text:`Which ${searchText} do you wanna order?`,
          thumbnailImageUrl:thumbnailImageUrl,
	    		actions: actions
	    	}
	    }
	} else {
		obj = {
			type:'text',
			text:'order completed'
		}
	}
	
  const userId = event_data.events[0].source.userId
    //console.log("userId:" + userId)
	await client.pushMessage(userId, obj)
	    //let retttt = await client.replyMessage(reply_token, obj)
}

async function getMerchant(searchText) {

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
    //const fetch = require('node-fetch');
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,//chromium.headless,
    });

    let page = await browser.newPage();

    await page.goto(/*event.url || */'https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    await page.type('input[name="email"]', 'yasu19840707@gmail.com',{delay: 10});
    await page.click('#continue',{delay: 10})

    await page.waitForSelector('input[name="password"]')

    await page.type('input[name="password"]', 'yasu0707',{delay: 10});
    await page.click('#signInSubmit',{delay: 10})

    const elm2 = 'input[type="text"]'
    try {
	    await page.waitForSelector(elm2)
	} catch (e) {
      if (e instanceof puppeteer.errors.TimeoutError) {
	    	await page.pdf({path: 'timeout_login.pdf'})
		}
	}
    await page.type(elm2, searchText,{delay: 10})
    await page.click("input[type='submit']",{delay: 10})

    const elm3 = '.s-result-list.s-search-results.sg-row'
    try{
      await page.waitForSelector(elm3)
    } catch(e) {
      if (e instanceof puppeteer.errors.TimeoutError) {
        await page.pdf({path: 'timeout_result.pdf'})
      }
    }
    //await page.pdf({path: 'page_searchResult.pdf'})
    const startTime = (new Date()).getTime()
    const items = await page.evaluate(elm => {
      divs = document.querySelectorAll(elm)[1].children;
      let count = 0
      const results = [].map.call(divs, (x,i) => {
      	if(!x)return
      	if(count > 3)return
        const baseDiv = x.querySelector('div > span > div > div > div > div')
      	if(!baseDiv)return
        //if(i>2)return // show top 3 merchants
        const title = baseDiv.querySelector('div:nth-child(3) > h2 > a > span') != null ? baseDiv.querySelector('div:nth-child(3) > h2 > a > span').innerText : ''
        const price = baseDiv.querySelector('div:nth-child(5) > div.a-row.a-size-base.a-color-base > div > a > span.a-price > span.a-offscreen') != null ? baseDiv.querySelector('div:nth-child(5) > div.a-row.a-size-base.a-color-base > div > a > span.a-price > span.a-offscreen').innerText : ''
        const delivery = baseDiv.querySelector('div:nth-child(6) > div > div > span:nth-child(2) > span.a-text-bold') != null ? baseDiv.querySelector('div:nth-child(6) > div > div > span:nth-child(2) > span.a-text-bold').innerText : ''
        const reputation = baseDiv.querySelector('div:nth-child(4) > div > span:nth-child(1) > span > a > i.a-icon.a-icon-star-small.a-star-small-4-5.aok-align-bottom > span') != null ? baseDiv.querySelector('div:nth-child(4) > div > span:nth-child(1) > span > a > i.a-icon.a-icon-star-small.a-star-small-4-5.aok-align-bottom > span').innerText : ''
        const href = baseDiv.querySelector('div:nth-child(3) > h2 > a') != null ? baseDiv.querySelector('div:nth-child(3) > h2 > a').href : ''
        if(href.length > 1000 || !href)return
        if(count==0) {
          var thumbnailImageUrl = baseDiv.querySelector('span > a > div > img') != null ? baseDiv.querySelector('span > a > div > img').src : ''
        }
        count ++
        return {title, price, delivery, reputation, href, thumbnailImageUrl}
      }).filter(x=>x)
      return results
    }, elm3);
    const endTime = (new Date()).getTime()
    console.log("time spent:" + (endTime - startTime).toString())

    return {items:items, thumbnailImageUrl:items[0].thumbnailImageUrl}
  } catch (error) {
    //return context.fail(error);
    console.log(error)
  } /*finally {
    if (browser !== null) {
      await browser.close();
    }
  }
	*/
}

module.exports.func = func