const express = require('express');
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const cors = require('cors');
const path = require('path');
const { Console } = require('console');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

const PORT = process.env.PORT || 3001;


const connectionString = "mongodb+srv://victorodouard:ObAm1942a@problemcluster.sj2gw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
MongoClient.connect(connectionString, (err, client) => {

    if (err) return console.error(err)
    console.log("Connected to Database")

    const db = client.db('problems');
    const problemCollection = db.collection('problems');

    app.get('/api/:category', (req, res) => {
        var cat = req.params.category;
        var query;
        if(cat === "categories") {
            query = problemCollection.distinct("category");
        }   
        else if(cat === "all") {
            query = problemCollection.find().project({id: 1, _id: 0}).toArray();
        }
        else {  
            query = problemCollection.find({category: cat}).project({id: 1, _id: 0}).toArray();    
        }

        query.then(results => {
            res.json(results);
        })
        .catch(error => console.log(error));
    });

    app.get('/api/:category/:problem', (req, res) => {
        prob = req.params.problem
        problemCollection.find({id: prob}).toArray()
            .then(results => {
                res.json(results[0]);
            })
            .catch(error => console.log(error))
    });

    app.get('/api', (req, res) => {
        res.json({message: "hi"});
    });

    app.get("/", (req, res) => {
        console.log(path.resolve(__dirname, '../client/build', 'index.html'));
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });

    app.use(express.static(path.resolve(__dirname, '../client/build')));

    /*
    app.get("/static/:lang/:fname", (req, res) => {
        var lang = req.params.lang;
        var fname = req.params.fname;

        var pth = path.resolve(__dirname, '../client/build/static', lang, fname);
        console.log(pth);
        res.sendFile(pth);
    });
    */

    app.listen(PORT, function() {
        console.log(`listening on ${PORT}`);
    });

})



