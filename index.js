const express = require('express');
const app = express();
const port = 8015;
require('dotenv').config();

const bodyParser = require('body-parser');
const multer = require('multer'); // v1.0.5
const upload = multer(); // for parsing multipart/form-data

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const AWS = require('aws-sdk');
const BigNumber = require('big-number');

const BUCKET_NAME = 'fibonacci-stanislav';


const s3 = new AWS.S3({
    accessKeyId: process.env.IAM_USER_KEY,
    secretAccessKey: process.env.IAM_USER_SECRET,
});

function getData(){
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: BUCKET_NAME,
            Key: 'data.json'
        };

        s3.getObject(params, (err, data) => {
            if (err) reject(err);
            resolve(data.Body.toString('utf-8'));
        })
    });
}

function putData(data){
    return new Promise((resolve, reject) => {
        const json = {
            byId: {
                0: "0",
                1: "1",
                2: "1",
            },
            allIds: [0,1,2]
        };

        data = data ? data : json;

        const params = {
            Bucket: BUCKET_NAME,
            Key: 'data.json',
            Body: JSON.stringify(data),
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error('upload: error', err);
                reject(err);
            }
            console.log('upload: success');
            resolve(data);
        });
    });
};


app.get('/', (req, res) => res.sendFile('index.html', { root: '.' }));

app.post('/', (req, res) => {
    const value = Number(req.body.value);
    if (value > 9999) return res.send('max allowed value is 9999');
    if (value < 0) return res.send('min allowed value is 0');

    getData().then( data => {
        const json = JSON.parse(data);
        if ( json.allIds.indexOf(value) !== -1 ) {
            return res.send(json.byId[value]);
        } else {
            let i = json.allIds.length-1;
            for(
                i;
                i < value;
                i++
            ) {
                console.log(i);
                json.byId[i+1] = new BigNumber(json.byId[i]).add(json.byId[i-1]).toString();
                json.allIds.push(i+1);
            }

            putData(json);
            res.send(json.byId[i]);
        }
    }).catch( err => console.log(err));
});


app.get('/json', (req, res) => {
    getData()
        .then( data => res.send(data) )
        .catch( err => res.send(err) );
});

app.get('/clear', (req, res) => {
    putData()
        .then( data => res.send(data) )
        .catch( err => res.send(err) );
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
