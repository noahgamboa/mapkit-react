const dotenv = require('dotenv');
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
// var https = require('https');

dotenv.config();
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
    console.log("Requestion token");
    const payload = {
        iss: APPLE_TEAM_ID, /* Issuer: Your Apple Developer Team ID */
        iat: Date.now() / 1000, /* Issued at: Current time in seconds */
        exp: (Date.now() / 1000) + 1800, /* Expire at: Time to expire the token */
    };
    res.send(jwt.sign(payload, AUTH_KEY, {header: header}));
});

app.get('/api/hello', (req, res) => {
    res.send({ express: 'Hello From Express' });
});

app.post('/api/world', (req, res) => {
    console.log(req.body);
    res.send(
        `I received your POST request. This is what you sent me: ${req.body.post}`,
    );
});

app.listen(PORT, '0.0.0.0', (err) => {  
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`now running on port: ${PORT}\n`);
});
