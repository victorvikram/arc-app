const express = require('express');
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const cors = require('cors');
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

    

    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });

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
    })

/*
    app.get('/api/:category', (req, res) => {
        console.log("in the category api call " + cat);
        var cat = req.params.category
        if(cat === "categories") {
            query = 
            problemCollection.distinct("category")
                .then(results => {
                    res.json(results);
                })
                .catch(error => console.log(error));
        }   
        else if(cat === "all") {
            problemCollection.find().project({id: 1, _id: 0}).toArray()
                .then(results => {
                    res.json(results);
                })
                .catch(error => console.log(error))
        }
        else {
            problemCollection.find({category: cat}).project({id: 1, _id: 0}).toArray()
                .then(results => {
                    res.json(results);
                })
                .catch(error => console.log(error))
        }
        
    })
*/

    app.get('/api/:category/:problem', (req, res) => {
        prob = req.params.problem
        problemCollection.find({id: prob}).toArray()
            .then(results => {
                res.json(results[0]);
            })
            .catch(error => console.log(error))
    })

    app.post('/quotes', (req, res) => {
        quotesCollection.insertOne(req.body)
            .then(result => {
                console.log(result);
            })
            .catch(error => console.error(error))

        res.redirect("/");
    })

    app.listen(PORT, function() {
        console.log(`listening on ${PORT}`);
    })

})



