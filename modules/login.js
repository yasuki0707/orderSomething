// get login info for AWS DynamoDB
async function getDynamoInfo(email) {
  //console.log("email:" + email)
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

  /* todo:these two should be inputed by a user */
    const email = '****'
    const password = '****'
    const loginInfo = await getDynamoInfo(email)
    //console.log(loginInfo)

    const isLoginSuccess = await checkPasswordDynamo(password, loginInfo.Item.password)
    if(isLoginSuccess) {
      //console.log("password is correct")
      return {email:email, password:password}
    } else {
      console.log("password is wrong")
      return false
    }
}

module.exports.getLoginInfoAmazon = getLoginInfoAmazon
