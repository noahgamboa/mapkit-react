import React, { Component } from 'react';
import AppleMap from './Map.js';
import SearchBar from './SearchBar.js';
import DestinationView from './Destination.js';
import Cookies from 'universal-cookie';
import update from 'immutability-helper';


import './App.css';

const cookies = new Cookies();

function generateDestinationID(annotation) {
    return "" + annotation.data.place.name + annotation.data.place.coordinate
}

class App extends Component {
    state = {
        mapToken: null,
        annotations: null,
        boundingRegion: null,
        destinations: {},
        groups: [],
    };

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
        this.mapkit = window.mapkit
        if (!this.mapkit) {
            console.error("App.componentDidMount ERROR: Mapkit in unavailable in window")
            alert("App.componentDidMount ERROR: Mapkit is unavailable in window")
            return
        }

        // Initialize our bounding region from cookie or use default
        this.setDefaultBoundingRegion()
        
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

    setAnnotationCallback = (annotations) => {
        this.setState({ annotations: annotations })
    }

    setBoundingRegion = (region) => {
        if (!region) {
            return 
        }
        if (!(region instanceof this.mapkit.CoordinateRegion)) {
            console.log("region is not instance: " + region)
            return
        }
        cookies.set('boundingRegion', region, { path: '/' });
        this.setState({ boundingRegion: region})
    }

    addDestination = (annotation) => {
        const key = generateDestinationID(annotation)
        if (key in this.state.destinations) {
            return;
        }
        this.setState(prevState => {
            let destinations = Object.assign({}, prevState.destinations);  
            destinations[key] = {
                name: annotation.data.place.name,
                coordinate: annotation.data.place.coordinate,
                id: key,
                groupId: key,
                transportModes: {                     
                    drive  : false,
                    walk   : false,
                    transit: false,
                    bike   : false,
                },
                transitTime: 30,
            }
            let groups = Object.assign([], prevState.groups);
            groups.push({name: annotation.data.place.name, destinationIds: [key]})
            return { destinations , groups }
        })
    }

    updateDestination = (destination) => {
        const key = destination.id
        if (!(key in this.state.destinations)) {
            console.error("Key '" + key + "' not found in destinations")
            return
        }
        this.setState(prevState => {
            let destinations = Object.assign({}, prevState.destinations);  
            destinations[key] = destination
            console.log(destinations)
            return { destinations }
        })
    }

    render() {
        return (
            <div className="App">
                <AppleMap
                    token={this.state.mapToken}
                    updateBoundingRegion={this.setBoundingRegion}
                    boundingRegion={this.state.boundingRegion}
                    annotations={this.state.annotations}
                    addDestination={this.addDestination}
                />
                <SearchBar
                    setAnnotationCallback={this.setAnnotationCallback}
                    boundingRegion={this.state.boundingRegion}
                />
                <DestinationView
                    destinations={this.state.destinations}
                    groups={this.state.groups}
                    updateDestination={this.updateDestination}
                />
            </div>
        );
    }
}

export default App;
