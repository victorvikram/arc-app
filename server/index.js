const express = require('express');
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const cors = require('cors');
const path = require('path');
const { Console } = require('console');
const { query } = require('express');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

const PORT = process.env.PORT || 3001;


const connectionString = ""
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
        var query;
        prob = req.params.problem
        cat =  req.params.category

        problemCollection.find({id: prob}).toArray()
            .then(results => {
                elt = results.find(el => Object.keys(el).length !== 0);
                res.json(elt);
            })
            .catch(error => console.log(error));
        
    });

    app.get('/api/:category/:problem/description', (req, res) => {
        prob = req.params.problem
        cat =  req.params.category

        if(cat === "all") {
            cat = prob.split("-")[0];
        }
        
        problemCollection.find({category: cat}).project({description: 1, _id: 0}).toArray().then(results => {
            elt = results.find(el => Object.keys(el).length !== 0);
            res.json(elt);
        })
        .catch(error => console.log(error));
        
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



