const dotenv = require('dotenv');
const openrouteservice = require("openrouteservice-js");
const generateIsochrones = require("./isochrones/lib/index.js")

const args = {
    test: "name",
    value: [1,2,3,4]
}
console.log(generateIsochrones(args))

const {
    ORS_TOKEN,
} = process.env;

var Isochrones = new openrouteservice.Isochrones({
  api_key: ORS_TOKEN
});

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
    return Promise.all(Object.keys(destinations).map( (key) => {
        const destination = destinations[key]
        console.log(destination)
        const profile = getProfile(destination.transportModes)
        const request = {
            locations: [[destination.coordinate.longitude, destination.coordinate.latitude]],
            profile: profile,
            range: [destination.transitTime * 60],
            units: 'mi',
            range_type: 'time',
            smoothing: 0.9,
            area_units: 'mi'
        }
        console.log(JSON.stringify(request))
        return Isochrones.calculate(request)
    })).then( (data) => {
        const filteredData = data.map(result => {
            return result.features.map( feature => {
                return feature.geometry.coordinates
            })
        }).flat(1)
        return filteredData
    }).catch(error => {
        console.log(error)
        return error
    })
}

module.exports = {
    getIsochrones: getIsochrones
}
