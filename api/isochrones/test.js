const generateIsochrones = require("./lib/index")
// VALHALLA_URL="http://valhalla:8002/isochrone"
VALHALLA_URL="http://localhost:8002/isochrone"

const getIsochrones = (destinations, groups) => {
    var isochrones = []
    return new Promise((resolve, reject) => {
        var result = generateIsochrones(destinations, groups, VALHALLA_URL, (error, result) => {
            console.log("[GENERATE ISOCHRONES] Callback")
            console.log("Error Value = ", error)
            console.log("Result Value = ", result)
            resolve()
        })
    })
}

var destinations =  {
  '132083463926734': {
    name: 'Tartine Bakery',
    coordinate: { latitude: 37.76141071177564, longitude: -122.42411434650421 },
    id: '132083463926734',
    groupId: 'kmd0vg6v-f529qbmxr',
    transportModes: { walk: true, bike: false, transit: false, drive: false },
    transitTime: 30
  },
  '4258036681961592': {
    name: 'Tartine Manufactory',
    coordinate: { latitude: 37.761822081351966, longitude: -122.41182446479797 },
    id: '4258036681961592',
    groupId: null,
    transportModes: { walk: true, bike: true, transit: false, drive: false },
    transitTime: 30
  }
}
var groups = {
  'kmd0vg6v-f529qbmxr': {
    id: 'kmd0vg6v-f529qbmxr',
    name: 'Test',
      destinationIds: { '132083463926734': true,  '4258036681961592': true }
  }
}

getIsochrones(destinations, groups)
    .then(() => {
        destinations = {
            '4258036681961592': {
                name: 'Tartine Manufactory',
                coordinate: { latitude: 37.761822081351966, longitude: -122.41182446479797 },
                id: '4258036681961592',
                groupId: null,
                transportModes: { walk: true, bike: false, transit: false, drive: false },
                transitTime: 30
            },
            '2037349799714366': {
                name: 'Tartine Inner Sunset',
                coordinate: { latitude: 37.765373, longitude: -122.466133 },
                id: '2037349799714366',
                groupId: null,
                transportModes: { walk: true, bike: false, transit: false, drive: false },
                transitTime: 30
            }
        }
        groups = {}
        return getIsochrones(destinations, groups)
    })
    .then(() => {
        destinations = {}
        groups = {}
        return getIsochrones(destinations, groups)
    })
    .then(() => {
        destinations = {
            '4258036681961592': {
                name: 'Tartine Manufactory',
                coordinate: { latitude: 37.761822081351966, longitude: -122.41182446479797 },
                id: '4258036681961592',
                groupId: null,
                transportModes: { walk: true, bike: false, transit: false, drive: false },
                transitTime: 30
            },
            '2037349799714366': {
                name: 'Tartine Inner Sunset',
                coordinate: { latitude: 37.765373, longitude: -122.466133 },
                id: '2037349799714366',
                groupId: null,
                transportModes: { walk: true, bike: false, transit: false, drive: false },
                transitTime: 30
            }
        }
        groups = {
            'kmd0vg6v-f529qbmxr': {
                id: 'kmd0vg6v-f529qbmxr',
                name: 'Test',
                destinationIds: { '123456789106734': true,  '1234567890961592': true }
            }
        }
        return getIsochrones(destinations, groups)
    })
