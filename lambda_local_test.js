const lambdaLocal = require('lambda-local');

/* TODO:specify character inputed locally */
/* when trying to pass the character inputed as an argument, LINE platform says 403 forbidden error despite character inputed being passed to Lambda */

/* TODO: */
/* when trying to execute this, LINE platform says 400 bad request error */
/* udpate: replyMessage is failed but pushMessage is success */
// the reason thinkable:replyToken is generated on occasion, which can't be reused that means you can't have it as const like below
// on the other hand, pushMessage is sent based on userId, which is not time-binding, so successfull

/* description of parameters*/
/* 1st parameter:node */
/* 2nd parameter:name of this file*/
/* 3rd parameter:function file name */

///* 3rd parameter:name of lambda function file*/
///* 4th parameter:function file name */

///* 4th parameter:initial character of a gag */


let myArgs = process.argv.slice(2);
//let lambdaHandlerFile = myArgs[0]
let lambdaHandlerFile = 'index.js'
//let initialChara = "\"" + myArgs[myArgs.length-1] + "\""
/*
if(myArgs.length > 1) {
//	initialChara = myArgs[myArgs.length-1]
} else if (myArgs.length == 0) {
//	initialChara = 'や'
}
*/
let funcFile = myArgs[myArgs.length-1]


var jsonPayload = {
    "resource": "/yasbot",
    "path": "/yasbot",
    "httpMethod": "POST",
    "headers": {
        "accept": "*/*",
        "Content-Type": "application/json; charset=utf-8",
        "Host": "61zicv75jk.execute-api.ap-northeast-1.amazonaws.com",
        "User-Agent": "LineBotWebhook/1.0",
        "X-Amzn-Trace-Id": "Root=1-5e36b323-ff37d8521e47c0048a695338",
        "X-Forwarded-For": "147.92.149.166",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https",
        "X-Line-Signature": "m8LQtK9PbIzlJhMDqD7JQ2GrErSUBwgAeoXFKPx6dSY="
    },
    "multiValueHeaders": {
        "accept": [
            "*/*"
        ],
        "Content-Type": [
            "application/json; charset=utf-8"
        ],
        "Host": [
            "61zicv75jk.execute-api.ap-northeast-1.amazonaws.com"
        ],
        "User-Agent": [
            "LineBotWebhook/1.0"
        ],
        "X-Amzn-Trace-Id": [
            "Root=1-5e36b323-ff37d8521e47c0048a695338"
        ],
        "X-Forwarded-For": [
            "147.92.149.166"
        ],
        "X-Forwarded-Port": [
            "443"
        ],
        "X-Forwarded-Proto": [
            "https"
        ],
        "X-Line-Signature": [
            "m8LQtK9PbIzlJhMDqD7JQ2GrErSUBwgAeoXFKPx6dSY="
        ]
    },
    "queryStringParameters": null,
    "multiValueQueryStringParameters": null,
    "pathParameters": null,
    "stageVariables": null,
    "requestContext": {
        "resourceId": "ofp0c5",
        "resourcePath": "/yasbot",
        "httpMethod": "POST",
        "extendedRequestId": "HRDtjGj1NjMFfJA=",
        "requestTime": "02/Feb/2020:11:31:47 +0000",
        "path": "/default/yasbot",
        "accountId": "475353462291",
        "protocol": "HTTP/1.1",
        "stage": "default",
        "domainPrefix": "61zicv75jk",
        "requestTimeEpoch": 1580643107425,
        "requestId": "c433151f-b39c-4d9f-a343-f12e2cb6ecde",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "147.92.149.166",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "LineBotWebhook/1.0",
            "user": null
        },
        "domainName": "61zicv75jk.execute-api.ap-northeast-1.amazonaws.com",
        "apiId": "61zicv75jk"
    },
    "body": "{\"events\":[{\"type\":\"message\",\"replyToken\":\"06673031fb7d4973b8c416b2e648b4e2\",\"source\":{\"userId\":\"Uaae1c11daa5c03cb541147a9c02e04f6\",\"type\":\"user\"},\"timestamp\":1580643107369,\"mode\":\"active\",\"message\":{\"type\":\"text\",\"id\":\"11361936993044\",\"text\":\"お米\"}}],\"destination\":\"U8bac14dbe92fb6df5e65120760abd26f\"}",
    "isBase64Encoded": false
}

console.log(__dirname)

lambdaLocal.execute({
    event: jsonPayload,
    lambdaPath: __dirname + '/' + lambdaHandlerFile,
    profilePath: '../../.aws/credentials',
    profileName: 'default',
    environment: { 'CHANNEL_SECRET':'0cc7315a3a1faf0a4d0c3cc80fcdc352', 'CHANNEL_ID':'1653798509', 'funcFile':funcFile },
    timeoutMs: 5000
}).then(function(done) {
    console.log(done);
}).catch(function(err) {
    console.log(err);
});