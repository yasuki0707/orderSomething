let userInfo = []

// todo list
// _1. password encription(use DB to store at least username and password)
//  - a)amazon dynamoDB
// _2. process to manage request for previous response including cache management
// _3. put processes like amazon login/get dynamo info into other file than main modules(carousel.js)
// 4. add procedure to input password to ensure he/she is the right person
//  - and another procedure is needed for registering user(email/password) as well
//  -  otherwise you can't know the hash to compare inputed password with.
// 5. put login process to amazon into one procedure
// _6. put LINE loggin process into other module
// 7. treatment for the time when there's no search result(processing time gets longer?)
// _8. memory leak -> should delete browser on every call
// 9. scroll in search result to grab as many as items and avoid the situation where there is no items listed.

exports.handler = async (event, context, callback) => {

//	context.callbackWaitsForEmptyEventLoop = false
    const CHANNEL_SECRET = process.env.CHANNEL_SECRET
    
    // load modules
    const crypto = require('crypto');
    
    //console.log('EVENT:', JSON.stringify(event, null, 2));
    
    // check signature    
    //if(event.mode !== undefined && event.mode == 'test') {
    if(process.env.DOCKER_LAMBDA) {
        console.log("skip signature validation")
    } else {
        //console.log("CHANNEL_SECRET:" + CHANNEL_SECRET)
    	let hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(event.body).digest('base64');
        let signature = (event.headers || {})['x-line-signature']
        console.log(event.headers)
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
		modeName = './modules/' + 'carousel.js'
	}
    return await require(modeName).func(event_data)
};