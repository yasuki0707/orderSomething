// todo these must go to index.js outside of handler

var func = async function(event_data) {
    // load modules
    const fetch = require('node-fetch');
    const line = require('@line/bot-sdk');

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

    // TODO:use async/await
    // なぜか一回目の実行ではここに入る前に終了してしまい、二回目の実行で前のギャグが送信されてしまう、時間差。。？
    const response = await fetch(API_URL, options)
    const json = await response.json()
    const access_token = json.access_token
    //console.log("access_token:" + access_token)
    
    // when called from lamnda-local, replyMessage would be failed, should be avoided
    const event_type = event_data.events[0].type
    let mesObj
      if(event_type=='message') {
        /* should be ignored in case it has been invoked along with postback action */
        if(global.itemSearchText) {
          return
        }
        const searchText = event_data.events[0].message ? event_data.events[0].message.text : ''
        console.log("searchText:" + searchText)
        const items = await getMerchantList(searchText)
        if(!items || items.length==0) {
          console.log("failed to fetch any item:")
          return
        }
        if(searchText) {
          global.itemSearchText = searchText
        }
        console.log("number of items:" + items.length)

        const actions = items.map((x, i) => {
            const max = 20
            const commaLen = 3
            const strLen = x.title.length
            const strShowLen = strLen > max ? max-commaLen : strLen
            const padLen = Math.min(strLen, max)
           return {
            'type':'postback',
            "label":x.title.slice(0,strShowLen).padEnd(padLen,'.'),
            "data":`action=select&itemid=${i}&itemName=${x.title}`,
            //"text":`I would like to order ${x.title}!`,
            //"displayText":"I just ordered " + x.title,
             }
          })
        global.itemUrls = items.map(x=>x.href)
        //console.log(actions)
        
        mesObj = {
          type:'template',
          altText:`order options for ${searchText} has been suggested`,
          template:{
            type:'buttons',
            title:`Order for ${searchText}`,
            text:`Please select the option you like?`,
            actions: actions
          }
        }

      } else if(event_type=='postback') {
        //const itemUrl = postback_data.split('&').filter(x=>x.indexOf('itemurl')>=0)[0].split('=')[1]
        // how itemurl is sent to users so they can make request for that item
        //  - data length is 300, how about usage of /tmp or in-memory
        if(!global.itemSearchText) {
            mesObj = {
              type:'text',
              text:'Please resume the process again'
            }
        } else {
          const postback_data = event_data.events[0].postback.data
          const actionName = postback_data.split('&').filter(x=>x.indexOf('action')>=0)[0].split('=')[1]
          
          //console.log("postback_data:" + postback_data)
          //console.log("actionName:" + actionName)
          
          if(actionName == 'select'){
            global.itemId = postback_data.split('&').filter(x=>x.indexOf('itemid')>=0)[0].split('=')[1]
            global.itemName = postback_data.split('&').filter(x=>x.indexOf('itemName')>=0)[0].split('=')[1]
            const actions = ['Yes', 'No'].map((x, i) => {
             return {
              'type':'postback',
              "label":x,
              "data":`action=confirm&confirm=${1-i}`,// 1:yes, 0:no
              //"text":1-i==1 ? 'Yes, please!' : 'No, thanks.',
              }
            })
            mesObj = {
              type:'template',
              altText:`confirmation for ${global.itemSearchText} has been suggested`,
              template:{
                type:'confirm',
                text:`Are you sure to confirm to order ${global.itemName}?`,
                actions: actions
              }
            }
          } else if (actionName == 'confirm') {
            //console.log("itemUrl[itemId]:" + global.itemUrls[global.itemId])
            const confirm = parseInt(postback_data.split('&').filter(x=>x.indexOf('confirm')==0)[0].split('=')[1])
            if(confirm==1) {
              try {
                var isOrderSuccess = await orderMerchant(global.itemUrls[global.itemId])
                //var isOrderSuccess = await orderMerchant('https://www.amazon.co.jp/Amazon限定ブランド-良品物語-阿蘇くじゅう連山由来-ミネラルウォーター-525ml×40本/dp/B07Q42LYNM/ref=sr_1_3_sspa?__mk_ja_JP=カタカナ&keywords=ミネラルウォーター&qid=1582533538&sr=8-3-spons&psc=1&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUExSzkwNVIxVTA1SjRWJmVuY3J5cHRlZElkPUEwNTAwMzEzOUJPMVpWUFZWODZKJmVuY3J5cHRlZEFkSWQ9QTNSUDRHQkQ2MlM2QlQmd2lkZ2V0TmFtZT1zcF9hdGYmYWN0aW9uPWNsaWNrUmVkaXJlY3QmZG9Ob3RMb2dDbGljaz10cnVl')
              } catch(err) {
                console.log(err)
              }
            } else {
              //
            }

            let orderText
            if(confirm==1) {
              if(isOrderSuccess) {
                orderText = 'order has been done successfully'
              } else {
                orderText = 'order has been made but failed'
              }
            } else if(confirm==0) {
              orderText = 'order has been cancelled'
            }

            mesObj = {
              type:'text',
              text:orderText
            }
            // clear cache
            clearCache()
          }
        }
      }

    try {
      const client = new line.Client( {
        channelAccessToken: access_token
      })
      if(process.env.DOCKER_LAMBDA) {
        const userId = event_data.events[0].source.userId
        await client.pushMessage(userId, mesObj)
      } else {
        let ret = await client.replyMessage(reply_token, mesObj)
      }
    } catch(err) {
      console.log(err)
    }
    return
}

function clearCache() {
    global.itemUrls = {}
    global.itemId = ''
    global.itemSearchText = ''
    global.itemName = ''
}

async function getPuppeteerPage() {
  const chromium = require('chrome-aws-lambda');
  const puppeteer = require('puppeteer-core');

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,//chromium.headless,
    });
    return await browser.newPage();
  } catch(err) {
    console.log(err)
  }
}


async function orderMerchant(url) {

  let isSuccess = false
  try {
    let page = await getPuppeteerPage()

    const mod = require('modules/login.js')
    const AWSLoginInfo = await mod.getLoginInfoAmazon()
    await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    await page.type('input[name="email"]', AWSLoginInfo.email, {delay: 10});
    await page.click('#continue',{delay: 10})

    await page.waitForSelector('input[name="password"]')

    await page.type('input[name="password"]', AWSLoginInfo.password ,{delay: 10});
    await page.click('#signInSubmit',{delay: 10})
    //page = await mod.loginAmazon(page)

const startTime = (new Date()).getTime()
    await page.goto(url);

    //const elm = '#buy-now-button'
    const elm = '#add-to-cart-button'
    
    try {
      await page.waitForSelector(elm)
      //await page.pdf({path: 'added_to_cart_success.pdf'})
      await page.click(elm, {delay: 10})
      //console.log("merchant has been added to my cart!!")
      isSuccess = true
    } catch(err) {
      //await page.pdf({path: 'added_to_cart_fail.pdf'})
      console.log(err)
    }
const endTime = (new Date()).getTime()
console.log("time spent for page transition in orderMerchant:" + (endTime - startTime).toString() + 'ms')
  } catch(err) {
    console.log(err)
  }

  return isSuccess
}


async function getMerchantList(searchText) {

  try {
    let page = await getPuppeteerPage()

    const mod = require('modules/login.js')
    const AWSLoginInfo = await mod.getLoginInfoAmazon()
//const startTime = (new Date()).getTime()
    await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    await page.type('input[name="email"]', AWSLoginInfo.email, {delay: 10});
    await page.click('#continue',{delay: 10})

    await page.waitForSelector('input[name="password"]')

    await page.type('input[name="password"]', AWSLoginInfo.password ,{delay: 10});
    await page.click('#signInSubmit',{delay: 10})
//const endTime = (new Date()).getTime()
//console.log("time spent for login:" + (endTime - startTime).toString() + 'ms')


    const startTime = (new Date()).getTime()

    const elm2 = 'input[type="text"]'
    try {
	    await page.waitForSelector(elm2)
  	} catch (e) {
      //if (e instanceof puppeteer.errors.TimeoutError) {
  	   await page.pdf({path: '/tmp/timeout_login.pdf'})
  		//}
  	}
    await page.type(elm2, searchText,{delay: 10})
    await page.click("input[type='submit']",{delay: 10})

    const elm3 = '.s-result-list.s-search-results.sg-row'
    try{
      await page.waitForSelector(elm3)
    } catch(e) {
      //if (e instanceof puppeteer.errors.TimeoutError) {
        await page.pdf({path: '/tmp/timeout_result.pdf'})
      //}
    }
    const endTime = (new Date()).getTime()
    console.log("time spent page transition in getMerchantList:" + (endTime - startTime).toString() + 'ms')

    //await page.pdf({path: 'page_searchResult.pdf'})
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
        count ++
        return {title, price, delivery, reputation, href}
      }).filter(x=>x)
      return results
    }, elm3);

    return items
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