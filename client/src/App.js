import React, { Component } from 'react';
import AppleMap from './Map.js';
import SearchBar from './SearchBar.js';
import Cookies from 'universal-cookie';


import './App.css';

const cookies = new Cookies();

class App extends Component {
    state = {
        response: '',
        post: '',
        responseToPost: '',
        mapToken: '',
        annotations: null,
        boundingRegion: null,
    };

    componentDidMount() {
        // get our Apple Maps token
        const boundingRegion = cookies.get('boundingRegion')
        console.log(boundingRegion)
        this.mapkit = window.mapkit
        if (!this.mapkit) {
            alert("MapKit not loaded!")
        }
        console.log(boundingRegion)
        if (boundingRegion) {
            const mainCoords = new this.mapkit.CoordinateRegion(
                new this.mapkit.Coordinate(boundingRegion.center.latitude, boundingRegion.center.longitude),
                new this.mapkit.CoordinateSpan(boundingRegion.span.latitudeDelta, boundingRegion.span.longitudeDelta)
            )
            this.setState({boundingRegion: mainCoords})
        }
        fetch('/token')
            .then(res => res.text())
            .then(value => { console.log(value); return value })
            .then(token => {
                console.log("setting token")
                this.setState({ mapToken: token })
            })
            .catch(error => {
                console.log(error)
                console.log("found an error!") 
            });
    }

    setAnnotationCallback = (annotations) => {
        this.setState({ annotations: annotations })
    }

    setBoundingRegion = (region) => {
        cookies.set('boundingRegion', region, { path: '/' });
        this.setState({ boundingRegion: region})
    }

    render() {
        return (
            <div className="App">
                <AppleMap
                    token={this.state.mapToken}
                    updateBoundingRegion={this.setBoundingRegion}
                    boundingRegion={this.state.boundingRegion}
                    annotations={this.state.annotations}
                    zoomLevel={1}
                />
                <SearchBar
                    setAnnotationCallback={this.setAnnotationCallback}
                    boundingRegion={this.state.boundingRegion}
                />
            </div>
        );
    }
}

export default App;
