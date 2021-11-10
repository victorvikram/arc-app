const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const fs = require('fs');

// Connection URL
const url = 'mongodb+srv://victorodouard:ObAm1942a@problemcluster.sj2gw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

let rawdata = fs.readFileSync("../img_data.json");
data = JSON.parse(rawdata);

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, client) {
    const db = client.db('problems');
    const problemCollection = db.collection('problems');
    await problemCollection.insertMany([data]);

    client.close();
});
