// todo these must go to index.js outside of handler
var func = async function(event_data) {

  const lineToken = require("./line.js")
  const token = await lineToken.getTokens(event_data)
  const reply_token = token.reply_token
  const access_token = token.access_token

  // when called from lamnda-local, replyMessage would be failed, should be avoided
  const event_type = event_data.events[0].type
  let mesObj
  if(event_type=='message') {
    /* should be ignored in case it has been invoked along with postback action */
    clearCache()
    if(global.itemSearchText) {
      return
    }
    const searchText = event_data.events[0].message ? event_data.events[0].message.text : ''
    console.log("searchText:" + searchText)
    const items = await getMerchantList(searchText)
    if(!items || items.length==0) {
      console.log("failed to fetch any item:")
      // send message to users showing fetch has been failed.
      mesObj = {
        type:'text',
        text:`Failed to fetch items from Amazon.com.\
              Please resume the process again.`
      }
      //return
    } else {
      if(searchText) {
        global.itemSearchText = searchText
      }
      console.log("number of items:" + items.length)

      // TODO:goto amazon page or purchase immediately!
      // 2 actions to be made here other than 1 which is postback action to be prepared section below.  
      
      const columns = items.map((x, i) => {
        return {
        "thumbnailImageUrl":x.img,
        "text":require('../utils').getTextWithCommas(x.title, 60, 3),
        "actions":getCarouselActions(x, i)
        }
      })

      global.itemUrls = items.map(x=>x.href)
      //console.log(actions)
      
      mesObj = {
        type:'template',
        altText:`order options for ${searchText} has been suggested`,
        template:{
          type:'carousel',
          columns: columns
        }
      }
    }
  } else if(event_type=='postback') {
    // how itemurl is sent to users so they can make request for that item
    //  - data length is 300, how about usage of /tmp or in-memory
    if(!global.itemSearchText && !process.env.DOCKER_LAMBDA) {
      mesObj = {
        type:'text',
        text:'Please resume the process again'
      }
    } else {
      const postback_data = event_data.events[0].postback.data
      const actionName = postback_data.split('&').filter(x=>x.indexOf('action')>=0)[0].split('=')[1]
      
      if(['order', 'addcart'].includes(actionName)){
        global.itemId = postback_data.split('&').filter(x=>x.indexOf('itemid')>=0)[0].split('=')[1]
        global.itemName = postback_data.split('&').filter(x=>x.indexOf('itemName')>=0)[0].split('=')[1]
        const actions = ['Yes', 'No'].map((x, i) => {
          return {
            'type':'postback',
            "label":x,
            "data":`action=confirm&confirm=${1-i}&confirmAction=${actionName}`,// 1:yes, 0:no
            //"text":1-i==1 ? 'Yes, please!' : 'No, thanks.',
          }
        })
        mesObj = {
          type:'template',
          altText:`confirmation for ${global.itemSearchText} has been suggested`,
          template:{
            type:'confirm',
            text:`Are you sure to ${actionName} ${global.itemName}?`,
            actions: actions
          }
        }
      } else if (actionName == 'confirm') {
        const confirm = parseInt(postback_data.split('&').filter(x=>x.indexOf('confirm')==0)[0].split('=')[1])
        const confirmAction = postback_data.split('&').filter(x=>x.indexOf('confirmAction')==0)[0].split('=')[1]
        console.log("confirmAction:" + confirmAction)

        let isActionSuccess = false
        if(confirm==1) {
          try {
            if(confirmAction == 'order') {
              isActionSuccess = await orderMerchant(global.itemUrls[global.itemId])
            } else if (confirmAction == 'addcart') {
              isActionSuccess = await addCartMerchant(global.itemUrls[global.itemId])
            }
          } catch(err) {
            console.log(err)
          }
        } else {
          //
        }

        let orderText
        if(confirm==1) {
          if(isActionSuccess) {
            orderText = `${confirmAction} has been done successfully`
          } else {
            orderText = `${confirmAction} has been made but failed`
          }
        } else if(confirm==0) {
          orderText = `${confirmAction} has been cancelled`
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
    const line = require('@line/bot-sdk');
    const client = new line.Client( {
      channelAccessToken: access_token
    })
    if(process.env.DOCKER_LAMBDA) {
      const userId = event_data.events[0].source.userId
      await client.pushMessage(userId, mesObj)
    } else {
      // 400 error(bad request) for the 3rd order request..?
      let ret = await client.replyMessage(reply_token, mesObj)
      return ret
    }
  } catch(err) {
    console.log("reply_token:" + reply_token)
    console.log(err)
    return "error!"
  }
  //return
}

function getCarouselActions(item, i) {
  // 1. postback action to purchase a merchant immediatetly
  // 2. postback action to add a merchant to cart
  // 3. uri action to visit the site

  let actions = []
  /* purchase soon */
  actions.push({
    'type':'postback',
    "label":'click to purchase',
    "data":`action=order&itemid=${i}&itemName=${item.title}`,
  })
  /* add to cart */
  actions.push({
    'type':'postback',
    "label":'click to add in cart',
    "data":`action=addcart&itemid=${i}&itemName=${item.title}`,
  })
  actions.push({
    'type':'uri',
    "label":'go to Amazon',
    "uri":item.href,
  })
  return actions
}

function clearCache() {
    global.itemUrls = {}
    global.itemId = ''
    global.itemSearchText = ''
    global.itemName = ''
}

async function getPuppeteerBrowser() {
  const chromium = require('chrome-aws-lambda');
  const puppeteer = require('puppeteer-core');

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,//chromium.headless,
    });
    return browser;
  } catch(err) {
    console.log(err)
  }
}

  async function addCartMerchant(url) {

    let isSuccess = false
    try {
      const browser = await getPuppeteerBrowser()
      let page = await browser.newPage()
  
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
  
      /* select option for buy now/throw it in cart button */
      const elm_judge = '.a-section.a-spacing-base'
      await page.waitForSelector(elm_judge)
      // 0:select option, 1:no need for selection
      const pageType = await page.evaluate(elm => {
        return document.querySelectorAll(elm)[0].children[0].children.length == 2 ? 0 : 1
      }, elm_judge)
  
      //console.log("pageType:" + ret.pageType)
      const elm_show_cart_button = '#oneTimeBuyBox'
      const elm_add_to_cart = '#add-to-cart-button'
  
      if(pageType == 0) {
        // This is when there are 2 options for purchasing, normal and urgent
        await page.waitForSelector(elm_show_cart_button)
        await page.click(elm_show_cart_button, {delay: 10})
      }
      await page.waitForSelector(elm_add_to_cart)
      //await page.pdf({path: 'added_to_cart_success.pdf'})
      await page.click(elm_add_to_cart, {delay: 10})
      //console.log("merchant has been added to my cart!!")
      isSuccess = true
  const endTime = (new Date()).getTime()
  console.log("time spent for page transition in orderMerchant:" + (endTime - startTime).toString() + 'ms')
    } catch(err) {
      console.log(err)
    }
    await browser.close()
    return isSuccess
  }
  

async function orderMerchant(url) {

  let isSuccess = false
  try {
    const browser = await getPuppeteerBrowser()
    let page = await browser.newPage()

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

    /* select option for buy now/throw it in cart button */
    const elm_judge = '.a-section.a-spacing-base'
    await page.waitForSelector(elm_judge)
    // 0:select option, 1:no need for selection
    const pageType = await page.evaluate(elm => {
      return document.querySelectorAll(elm)[0].children[0].children.length == 2 ? 0 : 1
    }, elm_judge)

    //console.log("pageType:" + ret.pageType)
    const elm_show_cart_button = '#oneTimeBuyBox'
    const elm_buy_now = '#add-to-cart-button'// todo: should be replaced with '#buy-now-button'

    if(pageType == 0) {
      // This is when there are 2 options for purchasing, normal and urgent
      await page.waitForSelector(elm_show_cart_button)
      await page.click(elm_show_cart_button, {delay: 10})
    }
    await page.waitForSelector(elm_buy_now)
    //await page.pdf({path: 'added_to_cart_success.pdf'})
    await page.click(elm_buy_now, {delay: 10})
    //console.log("merchant has been added to my cart!!")
    isSuccess = true
const endTime = (new Date()).getTime()
console.log("time spent for page transition in orderMerchant:" + (endTime - startTime).toString() + 'ms')
  } catch(err) {
    console.log(err)
  }
  await browser.close()
  return isSuccess
}


async function getMerchantList(searchText) {
  const ITEM_NUM = 6

  try {
    const browser = await getPuppeteerBrowser()
    let page = await browser.newPage()

    await page.goto('https://www.amazon.co.jp');

const startTime = (new Date()).getTime()

    const elm2 = 'input[type="text"]'
	  await page.waitForSelector(elm2)
    await page.type(elm2, searchText,{delay: 10})
    await page.click("input[type='submit']",{delay: 10})

    const elm3 = '.s-result-list.s-search-results.sg-row > div > div'
    await page.waitForSelector(elm3)

    console.log(`element:'${elm3}' has been found!`)
    let itemNum = ITEM_NUM
    try {
      await page.waitForFunction((selector, n) => {
        return document.querySelectorAll(selector).length > n
      }, {polling:10, timeout:2000}, elm3, itemNum)
    } catch (e){
      console.log(e)
      itemNum = await page.evaluate(selector => {
        return document.querySelectorAll(selector).length
      }, elm3)
      if(itemNum == 0) {
        console.log("No items have been found")
        await browser.close()
        return
      }
    }
    console.log(`itemNum:${itemNum}`)

    const endTime = (new Date()).getTime()
console.log("time spent page transition in getMerchantList:" + (endTime - startTime).toString() + 'ms')

    //await page.pdf({path: 'page_searchResult.pdf'})
    const items = await page.evaluate((elm, itemNum) => {
      divs = document.querySelectorAll(elm);
      let count = 0
      const results = [].map.call(divs, (x) => {
      	//if(!x)return
        if(count >= itemNum) return
        // switch base selector depending on if specific class exists ---------
        const baseDiv = (x.querySelector(".rush-component.s-expand-height")) ? 
          x.querySelector('div > span > div > div > div > div') :
          x.querySelector('div > span > div > div')
        // --------------------------------------------------------------------
        if(!baseDiv) return
        
        const sTitle = "div:nth-child(3) > h2 > a > span"
        const sPrice = "div:nth-child(5) > div.a-row.a-size-base.a-color-base > div > a > span.a-price > span.a-offscreen"
        const sDelivery = "div:nth-child(6) > div > div > span:nth-child(2) > span.a-text-bold"
        const sReputation = "div:nth-child(4) > div > span:nth-child(1) > span > a > i.a-icon.a-icon-star-small.a-star-small-4-5.aok-align-bottom > span"
        const sHref = "div:nth-child(3) > h2 > a"
        const sImg = "span > a > div > img"

        const title = baseDiv.querySelector(sTitle) ? baseDiv.querySelector(sTitle).innerText : ''
        const price = baseDiv.querySelector(sPrice) ? baseDiv.querySelector(sPrice).innerText : ''
        const delivery = baseDiv.querySelector(sDelivery) ? baseDiv.querySelector(sDelivery).innerText : ''
        const reputation = baseDiv.querySelector(sReputation) ? baseDiv.querySelector(sReputation).innerText : ''
        const href = baseDiv.querySelector(sHref) ? baseDiv.querySelector(sHref).href : ''
        const img = baseDiv.querySelector(sImg) ? baseDiv.querySelector(sImg).src : ''
        // link longer than 1000 characters will be rejected by LINE SDK
        if(!href || href.length > 1000) return
        count ++
        return {title, price, delivery, reputation, href, img}
      }).filter(x=> {
        if(!x)return false
        let cnt = 0
        for(let i of Object.keys(x)) {
            if(x[i]) cnt ++
        }
        return cnt > 0
      })
      return results
    }, elm3, itemNum);
    await browser.close()
    return items
  } catch (error) {
    console.log(error)
    console.log("error occurs while ..")
    await browser.close()
  } /*finally {
    if (browser !== null) {
      await browser.close();
    }
  }*/
}

module.exports.func = func