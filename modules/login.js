// get login info for AWS DynamoDB
async function getDynamoInfo(email) {
  console.log("email:" + email)
  const AWS = require('aws-sdk');
  const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
  });
  const params = {
    TableName: "users",
    Key:{
      email: email,
    }
  };
  return await new Promise((resolve, reject) => {
    dynamo.get(params, function(err, data) {
      if(err) {
        console.log(err)
        reject('error has occurred!')
      } else {
        resolve(data)
      }
    });
  })
}

async function checkPasswordDynamo(password, password_hashed) {
  const bcrypt = require('bcrypt');
  const saltRounds = 10;

/*
  const hash = await new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, function(err, hash) {
      console.log(`hash for ${password} is ${hash}`)
      resolve(hash)
    });
  })
*/

  return await new Promise((resolve, reject) => {
    bcrypt.compare(password, password_hashed, function(err, result) {
      if(err) {
        reject('something wrong has occurred!')
      } else {
        resolve(result)
      }
    });
  })  
}


async function getLoginInfoAmazon() {

  /* these two should be inputed by a user */
    const email = 'yasu19840707@gmail.com'
    const password = 'yasu0707'
    const loginInfo = await getDynamoInfo(email)
    console.log(loginInfo)

    const isLoginSuccess = await checkPasswordDynamo(password, loginInfo.Item.password)
    if(isLoginSuccess) {
      console.log("password is correct")
      return {email:email, password:password}
    } else {
      console.log("password is wrong")
      return false
    }
/*
const startTime = (new Date()).getTime()
    await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin&switch_account=');
    await page.type('input[name="email"]', loginInfo.Item.email, {delay: 10});
    await page.click('#continue',{delay: 10})

    await page.waitForSelector('input[name="password"]')

    await page.type('input[name="password"]', loginInfo.Item.password ,{delay: 10});
    await page.click('#signInSubmit',{delay: 10})
const endTime = (new Date()).getTime()
console.log("time spent for login:" + (endTime - startTime).toString() + 'ms')
    return page
*/

}

module.exports.getLoginInfoAmazon = getLoginInfoAmazon
