const dotenv = require('dotenv');
// const openrouteservice = require("openrouteservice-js");
const generateIsochrones = require("./isochrones/lib/index.js")


const {
    ORS_TOKEN,
} = process.env;

// var Isochrones = new openrouteservice.Isochrones({
//   api_key: ORS_TOKEN
// });

const getProfile = (transportModes) => {
    const validTransportModes = Object.keys(transportModes).filter( mode => {
        return transportModes[mode] === true
    })
    const profiles = validTransportModes.map( mode => {
        if (mode === "walk") {
            return "foot-walking"
        }
        if (mode === "drive") {
            return "driving-car"
        }
        if (mode === "transit") {
            return "driving-car"
        }
        if (mode === "bike") {
            return "cycling-regular"
        }
    })
    console.log(profiles)
    return profiles[0]
}


const getIsochrones = (destinations, groups) => {
    var isochrones = []
    return new Promise((resolve, reject) => {
        var result = generateIsochrones(destinations, groups, ORS_TOKEN, (error, result) => {
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

module.exports = {
    getIsochrones: getIsochrones
}
