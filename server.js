require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
// var https = require('https');
const JSONdb = require('simple-json-db');
const { getIsochrones } = require('./isochrones.js')


const db = new JSONdb('db/database.json');

const app = express();
const {
    AUTH_KEY,
    APPLE_TEAM_ID,
    MAPKIT_KEY_ID,
    TRAVEL_TIME_APPLICATION_ID,
    TRAVEL_TIME_API_KEY,
    PORT,
} = process.env;

const header = {
    kid: MAPKIT_KEY_ID, /* Key Id: Your MapKit JS Key ID */
    typ: 'JWT', /* Type of token */
    alg: 'ES256', /* The hashing algorithm being used */
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/token', (req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
}, (req, res) => {
    const payload = {
        iss: APPLE_TEAM_ID, /* Issuer: Your Apple Developer Team ID */
        iat: Date.now() / 1000, /* Issued at: Current time in seconds */
        exp: (Date.now() / 1000) + 1800, /* Expire at: Time to expire the token */
    };
    res.send(jwt.sign(payload, AUTH_KEY, {header: header}));
});

app.post('/saveState', (req, res, next) => {
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
    // const data = typeof(json.data) === "string" ? json.data : JSON.stringify(json.data)
    if ("mapToken" in json.data) {
        delete json.data.mapToken
    }
    console.log("Saving state!", json.data)
    db.set(json.userId, json.data)
    res.status(200).json({ result: "saved state for '" + json.userId + "'." });
})

app.post('/loadState', (req, res, next) => {
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
    if ("mapToken" in result) {
        delete result.mapToken
    }
    console.log("Loading state!", result)
    return res.status(200).json(db.get(json.userId))
})

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


app.listen(PORT, '127.0.0.1', (err) => {  
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`now running on port: ${PORT}\n`);
});

