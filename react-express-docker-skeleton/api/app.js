require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
// var https = require('https');
const JSONdb = require('simple-json-db');
const generateIsochrones = require("./isochrones/lib/index.js")

const db = new JSONdb('db/database.json');

const app = express();

const {
    AUTH_KEY,
    APPLE_TEAM_ID,
    MAPKIT_KEY_ID,
    TRAVEL_TIME_APPLICATION_ID,
    TRAVEL_TIME_API_KEY,
    ORS_TOKEN,
    PORT,
    VALHALLA_URL
} = process.env;

const header = {
    kid: MAPKIT_KEY_ID, /* Key Id: Your MapKit JS Key ID */
    typ: 'JWT', /* Type of token */
    alg: 'ES256', /* The hashing algorithm being used */
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.get('/token', (req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
}, (req, res) => {
    console.log("returning token")
    const payload = {
        iss: APPLE_TEAM_ID, /* Issuer: Your Apple Developer Team ID */
        iat: Date.now() / 1000, /* Issued at: Current time in seconds */
        exp: (Date.now() / 1000) + 1800, /* Expire at: Time to expire the token */
    };
    res.send(jwt.sign(payload, AUTH_KEY, {header: header}));
});

app.post('/loadSearchCollections', (req, res, next) => {
    const json = req.body
    if (!("userId" in json)) {
        return res.status(400).json({message:"'userId' expected at top level of json"})
    }
    if (typeof(json.userId) !== "string") {
        return res.status(400).json({message:"'userId' expected to be a string"})
    }
    if (!db.has(json.userId)) {
        return res.status(400).json({message:"'userId' not in database"})
    }
    var result = db.get(json.userId)
    if (!result.searchCollections) {
        return res.status(400).json({message:"user does not have SearchCollections"})
    }
    result = result.searchCollections
    console.log("Loading state!", result)
    return res.status(200).json(result)
})

app.post('/loadSearchCollection', (req, res, next) => {
    const json = req.body
    if (!("userId" in json)) {
        return res.status(400).json({message:"'userId' expected at top level of json"})
    }
    if (typeof(json.userId) !== "string") {
        return res.status(400).json({message:"'userId' expected to be a string"})
    }
    if (!db.has(json.userId)) {
        return res.status(400).json({message:"'userId' not in database"})
    }
    var result = db.get(json.userId)
    if (!result.searchCollections) {
        return res.status(400).json({message:"user does not have SearchCollections"})
    }
    result = result.data[json.searchCollectionId]
    console.log("Loading state!", result)
    return res.status(200).json(result)
})

app.post('/saveSearchCollection', (req, res, next) => {
    const json = req.body
    if (!("userId" in json)) {
        return res.status(400).json({message:"'userId' expected at top level of json"})
    }
    if (typeof(json.userId) !== "string") {
        return res.status(400).json({message:"'userId' expected to be a string"})
    }
    if (!("data" in json)) {
        return res.status(400).json({message:"'data' expected at top level of json"})
    }
    if ("mapToken" in json.data) {
        delete json.data.mapToken
    }
    const searchCollections = json.data.searchCollections
    if ("searchCollections" in json.data) {
        delete json.data.searchCollections
    }
    const searchCollectionId = json.data.currentSearchCollection.id 
    if ("currentSearchCollection" in json.data) {
        delete json.data.currentSearchCollection
    }
    console.log("Saving state!", json.data)
    var currentState = db.get(json.userId)
    currentState.data[searchCollectionId] = json.data
    currentState.searchCollections = searchCollections
    db.set(json.userId, currentState)
    res.status(200).json({ result: "saved state for '" + json.userId + "'." });
})

const getIsochrones = (destinations, groups) => {
    var isochrones = []
    return new Promise((resolve, reject) => {
        var result = generateIsochrones(destinations, groups, VALHALLA_URL, (error, result) => {
            console.log("[GENERATE ISOCHRONES] Callback")
            console.log("Error Value = ", error)
            console.log("Result Value = ", result)
            if (error) {
                reject(error)
            } else {
                console.log("Resolving...")
                resolve(result)
            }
        })
    })
}

app.post('/generateIsochrone', (req, res, next) => {
    const json = req.body
    if (!("destinations" in json)) {
        return res.status(400).json({message:"'destinations' expected at top level of json"})
    }
    if (!("groups" in json)) {
        return res.status(400).json({message:"'groups' expected at top level of json"})
    }
    const destinations = json.destinations
    const groups = json.groups
    console.log(destinations)
    console.log(groups)
    getIsochrones(destinations, groups).then((data) => {
        res.status(200).json(data)
        next()
    })
})


app.listen(PORT, '0.0.0.0', (err) => {  
    if (err) {
        console.log(err);
        process.exit(1);
    }
    var os = require("os");
    console.log(`hostname = ${os.hostname()}\n`);
    console.log(`now running on port: ${PORT}\n`);
});

