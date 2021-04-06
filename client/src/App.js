import React, { Component } from 'react';
import AppleMap from './Map.js';
import SearchBar from './SearchBar.js';
import DestinationView from './Destination.js';
import Cookies from 'universal-cookie';
import update from 'immutability-helper';
import {generateIsochrones} from './GenerateIsochrones.js';
import {saver, loader} from './Saver.js';
import { hash } from './utils.js'


import './App.css';

const cookies = new Cookies();


class Destination {
    static generateDestinationID(place) {
        return "" + hash(place.name + place.coordinate)
    }

    static create(place) {
        const destinationId = Destination.generateDestinationID(place)
        return {
            name: place.name,
            coordinate: place.coordinate,
            id: destinationId,
            groupId: null,
            transportModes: {                     
                walk   : true,
                bike   : false,
                transit: false,
                drive  : false,
            },
            transitTime: 30,
        }
    }

    static setGroup(destination, groupId) {
        destination.groupId = groupId
        return destination
    }

    static hasAtLeastOneTransportMode(destination) {
        return Object.values(destination.transportModes).reduce((v, acc) => v || acc, false)
    }

    // Sort of... not a total guarantee but will weed out most possibilities
    static isType(destination) {
        return (
            destination instanceof Object &&
            typeof(destination.name) === "string" &&
            typeof(destination.id) === "string" &&
            destination.coordinate instanceof window.mapkit.Coordinate &&
            destination.transportModes instanceof Object
        )
    
    }
}

class Group {
    static generateGroupID() {
        return Date.now().toString(36).substr(-8) + "-" + Math.random().toString(36).substr(2, 9); // guaranteed to be unique
    }

    static create(name) {
        if (!(typeof(name) === "string")) {
            throw new Error("Group.create ERROR: name '" + name + "' is not an instance of a string")
        }
        const groupId = Group.generateGroupID()
        return {
            id: groupId,
            name: name,
            destinationIds: {}
        }
    }

    static isType(group) {
        return (
            group instanceof Object &&
            typeof(group.id)  === "string" &&
            typeof(group.name) === "string" && 
            group.destinationIds instanceof Object
        )
    }
}

class Destinations {

    static create() {
        return {}
    }

    static hasDestination(destinations, destination) {
        return destination.id in destinations
    }

    static addDestination(destinations, destination) {
        if (Destinations.hasDestination(destinations, destination)) {
            throw new Error("Destinations.addDestination ERROR: cannot add destination '" + destination.name + "' that already exists in destinations")
        }
        var destinationUpdate = {}
        destinationUpdate[ destination.id ] = destination
        const newDestinations = update(destinations, { $merge: destinationUpdate }) 
        return newDestinations
    }

    static updateDestination(destinations, destination) {
        const destinationId = destination.id
        if (!(destinationId in destinations)) {
            throw new Error("Destinations.updateDestination ERROR: could not find destinationId '" + destinationId + "' in destinations")
        }
        const data = {}
        data[destinationId] = destination
        const newDestinations = update(destinations, { $merge: data })
        return newDestinations
    }

    static changeDestinationGroup(destinations, destinationId, newGroupId) {
        var destinationUpdate = {}
        destinationUpdate[destinationId] = { groupId: { $set: newGroupId } }
        const newDestinations = update(destinations, destinationUpdate) 
        return newDestinations
    }

    static removeDestination(destinations, destination) {
        const destinationId = destination.id
        if (!(destinationId in destinations)) {
            throw new Error("Destinations.updateDestination ERROR: could not find destinationId '" + destinationId + "' in destinations")
        }
        const newDestinations = update(destinations, { $unset: [destinationId] })
        return newDestinations
    }

}

class Groups {

    static create() {
        return {}
    }

    static addGroup(groups, group) {
        if (!Group.isType(group)) {
            throw new Error("Groups.addGroup ERROR: cannot add '" + group + "' because it is not a Group")
        }
        var groupUpdate = {}
        groupUpdate[group.id] = group
        const newGroups = update(groups, { $merge: groupUpdate })
        return newGroups
    }

    static changeDestinationGroup(groups, destinationId, oldGroupId, newGroupId) {
        var groupUpdate = {}
        // remove the destination from the previous group
        if (oldGroupId !== null) {
            groupUpdate[oldGroupId] = { destinationIds: { $unset: [destinationId] } }
        }
        // add to the destination to the new group
        var newDestinationObj = {}
        newDestinationObj[destinationId] = true
        groupUpdate[newGroupId] = { destinationIds: { $merge: newDestinationObj } }
        const newGroups = update(groups, groupUpdate)
        return newGroups
    }

    static removeDestination(groups, destinationId, oldGroupId) {
        var groupUpdate = {}
        // remove the destination from the previous group
        groupUpdate[oldGroupId] = { destinationIds: { $unset: [destinationId] } }
        const newGroups = update(groups, groupUpdate)
        return newGroups
    }

    static setGroupName(groups, groupId, name) {
        var groupUpdate = {}
        // remove the destination from the previous group
        groupUpdate[groupId] = { name: { $set: name } }
        const newGroups = update(groups, groupUpdate)
        return newGroups
    }
}

// save the current state of the application every 5 seconds but only if the component's state
// updates. 
window.noStateSaving = false
window.shouldSaveState = false
window.setInterval(() => {
    if (window.noStateSaving) {
        return
    }
    window.shouldSaveState = true
}, 5000);

class App extends Component {
    state = {
        mapToken: null,
        places: null,
        boundingRegion: null,
        destinations: Destinations.create(),
        groups: Groups.create(),
        isochrones: []
    };
    mapkit = window.mapkit

    setDefaultBoundingRegion() {
        // Try to get the bounding region in the cookie
        var boundingRegion = cookies.get('boundingRegion')
        if (boundingRegion instanceof this.mapkit.CoordinateRegion) {
            console.log("Initializing Bounding Region form cookie: " + boundingRegion)
            this.setState({boundingRegion: boundingRegion})
            return;
        }

    }

    componentDidMount() {
        // Get mapkit api
        if (!this.mapkit) {
            console.error("App.componentDidMount ERROR: Mapkit in unavailable in window")
            alert("App.componentDidMount ERROR: Mapkit is unavailable in window")
            return
        }

        // Initialize our bounding region from cookie or use default
        this.setDefaultBoundingRegion()

        loader("noah")
            .then((newState) => {
                this.setState(newState)
            })
            .catch(error => {
                console.error(error)
            })
        
        // get our Apple Maps token
        fetch('/token')
            .then(res => res.text())
            .then(token => {
                console.log("Initializing Token: " + token)
                this.setState({mapToken: token})
            })
            .catch(error => {
                alert("App.componentDidMount ERROR: Could not fetch mapkitjs token: " + error)
            });
    }

    componentDidUpdate() {
        if (window.shouldSaveState) {
            window.noStateSaving = true
            saver(this.state, "noah").then(() => {
                window.shouldSaveState = false
                window.noStateSaving = false
            })

        }
    }

    setPlacesCallback = (places) => {
        this.setState({ places: places })
    }

    setBoundingRegion = (region) => {
        if (!region) {
            return 
        }
        if (!(region instanceof this.mapkit.CoordinateRegion)) {
            console.error("region is not instance: " + region)
            return
        }
        cookies.set('boundingRegion', region, { path: '/' });
        this.setState({ boundingRegion: region})
    }

    addDestination = (place) => {
        const newDestination = Destination.create(place)
        if (Destinations.hasDestination(this.state.destinations, newDestination)) {
            return
        }
        const newDestinations = Destinations.addDestination(this.state.destinations, newDestination)
        this.setState({ destinations: newDestinations })
    }

    createGroup = () => {
        var newGroup = Group.create("New Group")
        const newGroups = Groups.addGroup(this.state.groups, newGroup)
        this.setState({ groups: newGroups })
    }

    updateGroupName = (name, groupId) => {
        const newGroups = Groups.setGroupName(this.state.groups, groupId, name)
        this.setState({ groups: newGroups })
    }

    updateDestination = (destination) => {
        if (!Destination.hasAtLeastOneTransportMode(destination)) {
            alert("You must select at least one transit mode.")
            return
        }
        const newDestinations = Destinations.updateDestination(this.state.destinations, destination)
        this.setState({destinations: newDestinations})
    }

    updateDestinationGroup = (destination, newGroup) => {
        const oldGroupId          = destination.groupId
        if (newGroup === null) {
            const newDestination  = Destination.setGroup(destination, null)
            const newDestinations = Destinations.updateDestination(this.state.destinations, newDestination)
            const newGroups       = Groups.removeDestination(this.state.groups, destination.id, oldGroupId)
            this.setState({ destinations: newDestinations, groups: newGroups })
        } else {
            const newDestination  = Destination.setGroup(destination, newGroup.id)
            const newDestinations = Destinations.updateDestination(this.state.destinations, newDestination)
            const newGroups       = Groups.changeDestinationGroup(this.state.groups, destination.id, oldGroupId, newGroup.id)
            this.setState({ destinations: newDestinations, groups: newGroups })
        }
    }

    deleteDestination = (destination) => {
        const newDestinations = Destinations.removeDestination(this.state.destinations, destination)
        this.setState({destinations: newDestinations})
    }

    generateIsochrones = () => {
        console.log("generating isochrones!")
        generateIsochrones(this.state.destinations, this.state.groups)
            .then((result) => {
                console.log("got isochrones!")
                console.log(result)
                this.setState({isochrones: result})
            }).catch((error) => {
                console.log(error)
                console.log("error in app")
            })
    }

    render() {
        return (
            <div className="App">
                <AppleMap
                    token={this.state.mapToken}
                    updateBoundingRegion={this.setBoundingRegion}
                    boundingRegion={this.state.boundingRegion}
                    places={this.state.places}
                    addDestination={this.addDestination}
                    isochrones={this.state.isochrones}
                />
                <SearchBar
                    setPlacesCallback={this.setPlacesCallback}
                    boundingRegion={this.state.boundingRegion}
                    generateIsochrones={this.generateIsochrones}
                />
                <DestinationView
                    destinations={this.state.destinations}
                    groups={this.state.groups}
                    updateDestination={this.updateDestination}
                    deleteDestination={this.deleteDestination}
                    updateGroup={this.updateDestinationGroup}
                    createGroup={this.createGroup}
                    updateGroupName={this.updateGroupName}
                />
            </div>
        );
    }
}

export default App;
