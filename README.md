# basic commands
## simulate lambda function in local with json data and env variables
docker run --rm -v "$PWD":/var/task --env-file .env lambci/lambda:nodejs12.x index.handler $(printf '%s' $(cat events/event_textSearch.json))

## build docker image
docker build -t order_something:latest .

## build container
docker run --rm -v "$PWD":/var/task order_something:latest

## upload zip file to AWS Lambda
aws lambda update-function-code --function-name orderSomething --zip-file fileb://deploy_package.zip

## run application locally
docker run -v "$PWD":/var/task --env-file .env lambci/lambda:nodejs12.x index.handler $(printf '%s' $(cat ./events/event_textSearch.json))