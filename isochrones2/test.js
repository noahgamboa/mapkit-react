const generateIsochrones = require("./lib/index")

const destinations =  {
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
const groups = {
  'kmd0vg6v-f529qbmxr': {
    id: 'kmd0vg6v-f529qbmxr',
    name: 'Test',
      destinationIds: { '132083463926734': true,  '4258036681961592': true }
  }
}


const ORS_TOKEN="5b3ce3597851110001cf6248fa5ae6eaac0140788a1c9155bda9f7dd"
const callback = function(result, error) {
    console.log("Running callback!")
    if (!error) {
        console.log(result)
    } else {
        console.log(error)
    }
}
generateIsochrones(destinations, groups, ORS_TOKEN, callback)
