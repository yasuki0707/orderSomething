async function uploadS3(filepath) {
    // Load the AWS SDK for Node.js, set the region
    const AWS = require('aws-sdk');
    AWS.config.update({region: process.env.AWS_REGION});

    // Configure the file stream and obtain the upload parameters
    const fileStream = require('fs').createReadStream(filepath);
    fileStream.on('error', function(err) {
        console.log('File Error', err);
    });
    const uploadParams = {
        Bucket: process.env.S3_FOLDER,
        Key: require('path').basename(filepath),
        Body: fileStream
    };

    // confiture S3 object and call a function to upload file to specified bucket
    const s3 = new AWS.S3({apiVersion: '2006-03-01'});
    await s3.upload (uploadParams, function (err, data) {
        if (err) {
            console.log("Error", err);
        } if (data) {
            console.log("Upload Success", data.Location);
        }
    });
}

module.exports.uploadS3 = uploadS3