const setUserInfo = require('modules/userManager.js').setUserInfo
const getUserInfo = require('modules/userManager.js').getUserInfo
const uploadS3 = require('modules/s3Manager.js').uploadS3

const locales = [
  {locale: 'en', name: 'English'},
  {locale: 'ja', name: 'Japanese'},
]
let locale = require('i18n')
locale.configure({
    locales: locales.map(l=>l.locale),
    defaultLocale: 'en',
    directory: "./locales",
    updateFiles: process.env.LOCALE_UPDATE || false,
    objectNotation: true
});
locale.setLocale(process.env.LOCALE || 'ja')

async function checkLoginInfo(userId) {
  const browser = await getPuppeteerBrowser()
  let page = await browser.newPage()
  let isCredentailCorrect = false

  try {
    const emailSlct = 'input[name="email"]'
    const passSlct = 'input[name="password"]'
    const alertSlct = '#auth-error-message-box > div > h4'
    const alertSlct2 = ".a-alert-container"

    await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    //await page.waitForSelector(emailSlct)
    await page.type(emailSlct, getUserInfo(userId, 'email'), {delay: 10});
    await page.click('#continue',{delay: 10})
    
    /* Execution context was destroyed, most likely because of a navigation. */
    try {
      await page.waitForSelector(alertSlct, {timeout: 3000} )
      isCredentailCorrect = await page.evaluate(slct => {
        return document.querySelectorAll(slct)[0].innerText !== "問題が発生しました。"
      }, alertSlct)
      console.log("email not exists as alert selector is found")
    } catch (e) {
      // email exists if there's no alert selector
      isCredentailCorrect = true
      console.log(e)
      console.log("email exists")
    }

    console.log("email:" + isCredentailCorrect)

    if(!isCredentailCorrect) {
      throw new Error("Email was not found")
    }

    await page.waitForSelector(passSlct, {timeout: 3000} )

    await page.type(passSlct, getUserInfo(userId, 'password'), {delay: 10});
    await page.click('#signInSubmit',{delay: 10})
    try {
      await page.waitForSelector(alertSlct2, {timeout: 3000} )
      isCredentailCorrect = await page.evaluate(slct => {
          return document.querySelectorAll(slct).length == 0
      }, alertSlct2)
    } catch (e) {
      isCredentailCorrect = true
      console.log(e)
    }
    console.log("password:" + isCredentailCorrect)
  } catch(e) {
    if(e) {
      console.log(e.constructor.name + ":" + e)
      isCredentailCorrect = false
    }
  } finally {
    await browser.close()
  }

  return isCredentailCorrect
}

// todo these must go to index.js outside of handler
var func = async function(event_data) {
  // when called from lamnda-local, replyMessage would be failed, should be avoided
  const event_type = event_data.events[0].type
  const userId = event_data.events[0].source['userId']
  if(process.env.DOCKER_LAMBDA) {
    setUserInfo(userId, {LogginState: 3})
  }
  const logginState = getUserInfo(userId, 'LogginState')
  const itemSearchText = getUserInfo(userId, 'itemSearchText')
  console.log(`userId:${userId}`)
  console.log(`itemSearchText:${itemSearchText}`)
  console.log(`logginState:${logginState}`)
  console.log(`email:${getUserInfo(userId, 'email')}`)
  console.log(`password:${getUserInfo(userId, 'password')}`)
  let mesObj = []
  console.log("event_type:" + event_type)
  const mesObj2 = {
    type:'text',
    text: locale.__(`Please input search text.`)
  }
  if(event_type=='message') {
    const searchText = event_data.events[0].message ? event_data.events[0].message.text : ''
    console.log("searchText:" + searchText)
    if(!logginState) {
      mesObj.push({
        type:'text',
        text: locale.__(`Please input user name to login`)
      })
      setUserInfo(userId, {LogginState: 1})
    } else if(logginState < 3) {
      if(logginState == 1) {
        mesObj.push({
          type:'text',
          text: locale.__(`please input password`)
        })
        setUserInfo(userId, {email: searchText})
      } else if(logginState == 2) {
        // TODO: at this moment, need to check if email and password are correct
        //       if not, prompt a user to input again from the beggining
        setUserInfo(userId, {password: searchText})
        if(await checkLoginInfo(userId)) {
          mesObj.push({
            type:'text',
            text: locale.__(`successfully logged in`)
          })
          mesObj.push(mesObj2)
        } else {
          mesObj.push({
            type:'text',
            text: locale.__(`Either Username or Password is incorrect. please input username`)
          })
          setUserInfo(userId, {email: ""})
          setUserInfo(userId, {password: ""})
          setUserInfo(userId, {LogginState: 0})
        }
      }
      setUserInfo(userId, {LogginState: getUserInfo(userId, 'LogginState')+1})
    } else {
      /* should be ignored in case it has been invoked along with postback action */
      //clearCache(userId)
      if(itemSearchText) {
      //  return
      }
      const items = await getMerchantList(searchText, userId)
      if(!items || items.length==0) {
        console.log("failed to fetch any item:")
        // send message to users showing fetch has been failed.
        mesObj.push({
          type:'text',
          text: locale.__(`Failed to fetch items from Amazon. Please resume the process again.`)
        })
        //return
      } else {
        if(searchText) {
          setUserInfo(userId, {itemSearchText: searchText})
        }
        console.log("number of items:" + items.length)

        // TODO:goto amazon page or purchase immediately!
        // 2 actions to be made here other than 1 which is postback action to be prepared section below.  
        
        const columns = items.map((x, i) => {
          return {
          "thumbnailImageUrl":x.img,
          "text":require('../utils').getTextWithCommas(x.title, 20, 3) + (x.price ? `\n${x.price}円` : "") + (x.reputation ? `\n${x.reputation}` : ""),
          "actions":getCarouselActions(x, i)
          }
        })

        setUserInfo(userId, {itemUrls: items.map(x=>x.href)})
        //console.log(actions)
        
        mesObj.push({
          type:'template',
          altText: locale.__(`order options for {{searchText}} has been suggested`, {searchText: searchText}),
          template:{
            type:'carousel',
            columns: columns
          }
        })
      }
    }
  } else if(event_type=='postback') {
    // how itemurl is sent to users so they can make request for that item
    //  - data length is 300, how about usage of /tmp or in-memory
    console.log(event_data)
    const postback_data = event_data.events[0].postback.data
    const actionName = postback_data.split('&').filter(x=>x.indexOf('action')==0)[0].split('=')[1]
    if(actionName == 'login') {
      if(logginState == 3) {
        mesObj.push({
          type:'text',
          text: locale.__("you are already logged in")
        })
      } else {
        mesObj.push({
          type:'text',
          text: locale.__("please input username")
        })
        setUserInfo(userId, {LogginState: 1})
      }
    } else if(actionName == 'logout') {
      if(logginState == 3) {
        mesObj.push({
          type:'text',
          text: locale.__("you are logged out")
        })
        setUserInfo(userId, {LogginState: 0})
        setUserInfo(userId, {itemCount: 4})
        setUserInfo(userId, {email: ""})
        setUserInfo(userId, {password: ""})
        clearCache(userId)
      } else {
        mesObj.push({
          type:'text',
          text: locale.__("you are not logged in yet")
        })
      }
    } else if(actionName == 'item_count') {
      if(logginState == 3) {
        mesObj.push({
          "type": "template",
          "altText": locale.__("Item count select"),
          "template": {
              "type": "buttons",
              //"thumbnailImageUrl": "https://example.com/bot/images/image.jpg",
              //"imageAspectRatio": "rectangle",
              //"imageSize": "cover",
              //"imageBackgroundColor": "#FFFFFF",
              //"title": locale.__("item count"),
              "text": locale.__("How Many Items would you like"),
              /*
              "defaultAction": {
                  "type": "uri",
                  "label": "View detail",
                  "uri": "http://example.com/page/123"
              },
              */
              "actions": [
                  {
                    "type": "postback",
                    "label": "1",
                    "data": "action=select_item_count&item_count=1"
                  },
                  {
                    "type": "postback",
                    "label": "2",
                    "data": "action=select_item_count&item_count=2"
                  },
                  {
                    "type": "postback",
                    "label": "4",
                    "data": "action=select_item_count&item_count=4"
                  },
                  {
                    "type": "postback",
                    "label": "8",
                    "data": "action=select_item_count&item_count=8"
                  },
              ]
          }
        })
      } else {
        mesObj.push({
          type:'text',
          text: locale.__("Please input user name to login")
        })
      }
    } else if(actionName == 'select_item_count') {
      if(logginState == 3) {
        setUserInfo(userId, {itemCount: postback_data.split('&').filter(x=>x.indexOf('item_count')==0)[0].split('=')[1]})
        mesObj.push({
          type:'text',
          text: locale.__("Item Count has been set to {{itemCount}}", {itemCount: getUserInfo(userId, 'itemCount')})
        })
        mesObj.push(mesObj2)
      } else {
      }
    } else if(actionName == 'change_locale') {
      const toLocale = locale.getLocale() == 'ja' ? 'en' : 'ja'
      locale.setLocale(toLocale)
      const localeName = locales.find(l=>l.locale==toLocale)['name']
      mesObj.push({
        type:'text',
        text: locale.__('Language is set to {{locale}}', {locale: localeName})
      })
      if(logginState == 3) {
        mesObj2['text'] = locale.__(`Please input search text.`)
        mesObj.push(mesObj2)
      }
    } else if(!itemSearchText && !process.env.DOCKER_LAMBDA) {
      mesObj.push({
        type:'text',
        text: locale.__('Please resume the process again')
      })
    } else {
      
      if(['order', 'addcart'].includes(actionName)){
        setUserInfo(userId, {itemId: postback_data.split('&').filter(x=>x.indexOf('itemid')>=0)[0].split('=')[1]})
        setUserInfo(userId, {itemName: postback_data.split('&').filter(x=>x.indexOf('itemName')>=0)[0].split('=')[1]})
        const actions = ['Yes', 'No'].map((x, i) => {
          return {
            'type':'postback',
            "label": locale.__(x),
            "data":`action=confirm&confirm=${1-i}&confirmAction=${actionName}`,// 1:yes, 0:no
            //"text":1-i==1 ? 'Yes, please!' : 'No, thanks.',
          }
        })
        mesObj.push({
          type:'template',
          altText: locale.__(`confirmation for {{searchText}} has been suggested`, {searchText: itemSearchText}),
          template:{
            type:'confirm',
            text: locale.__('Are you sure to {{action}} {{item}}?', {action: locale.__(actionName), item: getUserInfo(userId, 'itemName')}),
            actions: actions
          }
        })
      } else if (actionName == 'confirm') {
        const confirm = parseInt(postback_data.split('&').filter(x=>x.indexOf('confirm')==0)[0].split('=')[1])
        const confirmAction = postback_data.split('&').filter(x=>x.indexOf('confirmAction')==0)[0].split('=')[1]
        console.log("confirmAction:" + confirmAction)

        let isActionSuccess = false
        if(confirm==1) {
          const itemUrl = getUserInfo(userId,'itemUrls')[getUserInfo(userId,'itemId')]
          if(confirmAction == 'order') {
            isActionSuccess = await orderMerchant(itemUrl, userId)
          } else if (confirmAction == 'addcart') {
            isActionSuccess = await addCartMerchant(itemUrl, userId)
          }
        } 

        let orderText
        if(confirm==1) {
          if(isActionSuccess) {
            orderText = locale.__('{{action}} has been done successfully', {action: locale.__(confirmAction)})
          } else {
            orderText = locale.__('{{action}} has been made but failed', {action: locale.__(confirmAction)})
          }
        } else if(confirm==0) {
          orderText = locale.__('{{action}} has been cancelled', {action: locale.__(confirmAction)})
        }

        mesObj.push({
          type:'text',
          text:orderText
        })
        mesObj.push(mesObj2)
        // clear cache
        clearCache(userId)
      } else if(actionName == 'login') {
      }
    }
  }

  const lineToken = require("./line.js")
  const token = await lineToken.getTokens(event_data)
  const reply_token = token.reply_token
  const access_token = token.access_token

  try {
    const line = require('@line/bot-sdk');
    const client = new line.Client( {
      channelAccessToken: access_token
    })
    const richMenu = {
      "size": {
        "width": 800,
        "height": 400
      },
      "selected": true,
      "name": "menu",
      "chatBarText": locale.__('menu'),
      "areas": [
        {
          "bounds": {
            "x": 0,
            "y": 0,
            "width": 400,
            "height": 200,
          },
          "action": {
            "type": "postback",
            "data": "action=login"
          }
        },
        {
          "bounds": {
            "x": 400,
            "y": 0,
            "width": 400,
            "height": 200,
          },
          "action": {
            "type": "postback",
            "data": "action=logout"
          }
        },
        {
          "bounds": {
            "x": 0,
            "y": 200,
            "width": 400,
            "height": 200,
          },
          "action": {
            "type": "postback",
            "data": "action=item_count"
          }
        },
        {
          "bounds": {
            "x": 400,
            "y": 200,
            "width": 400,
            "height": 200,
          },
          "action": {
            "type": "postback",
            "data": "action=change_locale"
          }
        },
      ]
    }
    let richMenuId
    const existingRichMenus = await client.getRichMenuList()
    //const existingDefaultRichMenus = await client.getDefaultRichMenuId()
    /*
    const deletedItemCount = (await Promise.all(existingRichMenus.map(async (rm) => {
      console.log("delete rich menu")
      console.log(rm)
      await client.deleteRichMenu(rm.richMenuId)
    }))).length
    */
    /*
    await Promise.all(existingDefaultRichMenus.map(async (rm) => {
      console.log("delete rich menu")
      console.log(rm)
      await client.deleteDefaultRichMenu(rm.richMenuId)
    }))
    */
    //if(deletedItemCount > 0 && existingRichMenus.length !== deletedItemCount) {
    if(existingRichMenus.length) {
      richMenuId = existingRichMenus[0].richMenuId
    } else {
      richMenuId = await client.createRichMenu(richMenu)
      await client.setRichMenuImage(richMenuId, require('fs').createReadStream("./richmenu2.png"))
      console.log(`new richMenu has been created: ${richMenuId}`)
      await client.setDefaultRichMenu(richMenuId)
    }
    //await client.linkRichMenuToUser(event_data.events[0].source.userId, richMenuId)
    if(process.env.DOCKER_LAMBDA) {
      const userId = event_data.events[0].source.userId
      await client.pushMessage(userId, mesObj)
    } else {
      // 400 error(bad request) for the 3rd order request..?
      let ret = await client.replyMessage(reply_token, mesObj[0])
      await client.pushMessage(userId, mesObj[1])
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
    "label": locale.__('click to purchase'),
    "data":`action=order&itemid=${i}&itemName=${item.title}`,
  })
  /* add to cart */
  actions.push({
    'type':'postback',
    "label": locale.__('click to add in cart'),
    "data":`action=addcart&itemid=${i}&itemName=${item.title}`,
  })
  actions.push({
    'type':'uri',
    "label": locale.__('go to Amazon'),
    "uri":item.href,
  })
  return actions
}

function clearCache(userId) {
  setUserInfo(userId, {itemUrl: {}})
  setUserInfo(userId, {itemId: ""})
  setUserInfo(userId, {itemSearchText: ""})
  setUserInfo(userId, {itemName: ""})
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

  async function addCartMerchant(url, userId) {

    let isSuccess = false
    try {
      const browser = await getPuppeteerBrowser()
      let page = await browser.newPage()
  
      //const mod = require('modules/login.js')
      //const AWSLoginInfo = await mod.getLoginInfoAmazon()
      await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
      //await page.type('input[name="email"]', AWSLoginInfo.email, {delay: 10});
      await page.type('input[name="email"]', getUserInfo(userId, 'email'), {delay: 10});
      await page.click('#continue',{delay: 10})
  
      await page.waitForSelector('input[name="password"]')
  
        //await page.type('input[name="password"]', AWSLoginInfo.password ,{delay: 10});
      await page.type('input[name="password"]', getUserInfo(userId, 'password') ,{delay: 10});
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
      await page.waitForSelector(elm_add_to_cart, {timeout: 3000})
      await page.click(elm_add_to_cart, {delay: 10})
      //console.log("merchant has been added to my cart!!")
      isSuccess = true
  const endTime = (new Date()).getTime()
  console.log("time spent for page transition in addCartMerchant:" + (endTime - startTime).toString() + 'ms')
    } catch(err) {
      console.log(err)
      isSuccess = false
    }
    await browser.close()
    return isSuccess
  }
  

async function orderMerchant(url, userId) {

  let isSuccess = false
  try {
    const browser = await getPuppeteerBrowser()
    let page = await browser.newPage()

    //const mod = require('modules/login.js')
    //const AWSLoginInfo = await mod.getLoginInfoAmazon()
    await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    //await page.type('input[name="email"]', AWSLoginInfo.email, {delay: 10});
    await page.type('input[name="email"]', getUserInfo(userId, 'email'), {delay: 10});
    await page.click('#continue',{delay: 10})

    await page.waitForSelector('input[name="password"]')

    //await page.type('input[name="password"]', AWSLoginInfo.password ,{delay: 10});
    await page.type('input[name="password"]', getUserInfo(userId, 'password') ,{delay: 10});
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


async function getMerchantList(searchText, userId) {
  const ITEM_NUM = 4

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
    let itemNum = getUserInfo(userId, 'itemCount') || ITEM_NUM
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
        const sReputation = "div:nth-child(4) > div > span"
        const sHref = "div:nth-child(3) > h2 > a"
        const sImg = "span > a > div > img"

        const title = baseDiv.querySelector(sTitle) ? baseDiv.querySelector(sTitle).innerText : ''
        const price = baseDiv.querySelector(sPrice) ? baseDiv.querySelector(sPrice).innerText : ''
        const delivery = baseDiv.querySelector(sDelivery) ? baseDiv.querySelector(sDelivery).innerText : ''
        const reputation = baseDiv.querySelector(sReputation) ? baseDiv.querySelector(sReputation).getAttribute("aria-label") : ''
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

async function captureScreen(page, filePath) {
  await page.pdf({path: filePath})
  await uploadS3(filePath)
}


module.exports.func = func