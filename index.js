let itemUrls = {}
let itemId = ''
let itemSearchText = ''
let itemName = ''

// todo list
// 1.password encription(use DB to store at least username and password)
//  - a)amazon dynamoDB
// 2.process to manage request for previous response including cache management
// 3.put processes like amazon login/get dynamo info into other file than main modules(orderConfirm.js)
// 4.add procedure to input password to ensure he/she is the right person
//  - and another procedure is needed for registering user(email/password) as well
//  -  otherwise you can't know the hash to compare inputed password with.
// 5. put login process to amazon into one procedure


exports.handler = async (event, context, callback) => {

//	context.callbackWaitsForEmptyEventLoop = false
    const CHANNEL_SECRET = process.env.CHANNEL_SECRET
    
    // load modules
    const crypto = require('crypto');
    
    console.log('EVENT:', JSON.stringify(event, null, 2));
    /*
    if(!process.env.DOCKER_LAMBDA) {
        const fs = require('fs')
        fs.writeFile('/tmp/event.json', JSON.stringify(event, null, 2), (err) => {
            if(err) throw err;
            console.log('event.json is saved successfully')
        })
    }
    */
    
    // check signature    
    //if(event.mode !== undefined && event.mode == 'test') {
    if(process.env.DOCKER_LAMBDA) {
        console.log("skip signature validation")
    } else {
        //console.log("CHANNEL_SECRET:" + CHANNEL_SECRET)
    	let hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(event.body).digest('base64');
    	let signature = (event.headers || {})['X-Line-Signature']
    	console.log(`check the signature: hash=${hash}, signature=${signature}`)
    
    	if(hash == signature) {
    		console.log("signature verification:OK")
    	} else {
    		console.log("signature verification:NG, not from LINE platform")
            let response = {
                "statusCode": 403,
                "headers": {
                    "my_header": ""
                },
                "body": JSON.stringify("Forbidden access!!"),
                "isBase64Encoded": false
            };
            callback(null, response);
            return
    	}
    }


    let event_data = JSON.parse(event.body);

	let modeName
	if(process.env.MODULE_FILE !== undefined) {
		modeName = './modules/' + process.env.MODULE_FILE
	} else {
		modeName = './modules/' + 'orderConfirm.js'
	}
    const mod = require(modeName)
	await mod.func(event_data)
    //console.log(context)
	//return
};