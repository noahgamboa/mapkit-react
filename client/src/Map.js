import React, { Component } from 'react'

import landmarkAnnotationCallout from './MapCallout'

class AppleMap extends Component {

    isMapInitialized() {
        if (!this.props.token) {
            return false;
        }
        if (!this.mapkit) {
            return false;
        }
        if (!this.map) {
            return false;
        }
        if (!(this.map instanceof this.mapkit.Map)) {
            return false;
        }
        return true;
    }

    initializeMap(token) {
        console.log("Initializing mapkit with token: " + token)
		this.canvas = document.createElement('canvas')
		this.canvas.id = 'currentLocationOverride'
        this.mapkit = window.mapkit

		this.mapkit.init({
            authorizationCallback: function(done) {
                done(token)
			}
		})

		this.map = new this.mapkit.Map('map')

        this.map.addEventListener("region-change-end", (event) => { 
            // if boundingRegion update is the same a props, then don't call update
            if ((this.props.boundingRegion instanceof this.mapkit.CoordinateRegion) && this.map.region.equals(this.props.boundingRegion)) {
                return
            }
            console.log("Map region-change-end event triggered: " + this.map.region)
            this.props.updateBoundingRegion(this.map.region) 
        });

        // Set the default region
        // Initializing Bounding Region from Search: CoordinateRegion(
        // latitude: 37.75882148416713
        // longitude: -122.44588851928711
        // latitudeDelta: 0.10626597795635462
        // longitudeDelta: 0.16547385603189468
        // )
        const search = new this.mapkit.Search();
        search.search("San Francisco, California", (error, data) => {
            if (error) {
                console.error("Could not find default bounding region, received: " + error)
                return
            }
            console.log("Initializing Bounding Region from Search: " + data.boundingRegion)
            this.map.region = data.boundingRegion
        });
    }

    componentDidMount() {
		const { token } = this.props
        if (!token) {
            return
        }
        this.initializeMap(token)
	}

	componentDidUpdate(prevProps) {
		const { token, annotations, boundingRegion } = this.props
        if (!this.isMapInitialized() && token !== prevProps.token) {
            this.initializeMap(token)
            if (!this.isMapInitialized()) {
                console.error("Map.componentDidUpdate ERROR: Could not initialize mapkit with new token: " + token)
                return;
            }
        } 
        if (annotations !== prevProps.annotations) {
            this.updateAnnotations(annotations)
        }
        if (boundingRegion !== prevProps.boundingRegion) {
            this.updateMapRegion(boundingRegion)
        }
	}

    clearAnnotations() {
        if (!this.map) {
            return
        }
        if (!this.map.annotations) {
            return
        }
        this.map.removeAnnotations(this.map.annotations) // clear annotations
    }

    updateAnnotations(annotations) {
        if (!annotations) {
            this.clearAnnotations()
            return
        }

        annotations = annotations.map((annotation) => {
            annotation.data.callback = (update) => {
                console.log(annotation.title) 
                this.props.addDestination(annotation, update)
            }
            annotation.callout = landmarkAnnotationCallout
            return annotation
        });
        this.map.showItems(annotations)
    }

	updateMapRegion(boundingRegion) {
        if (!(this.map instanceof this.mapkit.Map)) {
            return
        }
        if (!(boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            return
        }
        if (this.map.region.equals(this.props.boundingRegion)) {
            return
        }
        console.log("Updating map region from Map.updateMapRegion: " + boundingRegion)
        this.map.region = boundingRegion
	}

	render() {
		const { width, height } = this.props
		return (
			<div
				id='map'
				style={{
					width: width,
					height: height
				}}
			/>
		)
	}
}

AppleMap.defaultProps = {
	width: '100wh',
	height: '100vh',
	longitude: 53.8008,
	latitude: -1.5491
}
export default AppleMap
