import React, { Component } from 'react'

import landmarkAnnotationCallout from './MapCallout'

class AppleMap extends Component {
    mapkit = window.mapkit

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
		const { token, places, boundingRegion, isochrones } = this.props
        if (!this.isMapInitialized() && token !== prevProps.token) {
            this.initializeMap(token)
            if (!this.isMapInitialized()) {
                console.error("Map.componentDidUpdate ERROR: Could not initialize mapkit with new token: " + token)
                return;
            }
        } 
        if (!this.isMapInitialized()) {
            return
        }
        if (places !== prevProps.places) {
            this.updateAnnotationsFromPlaces(places)
        }
        if (boundingRegion !== prevProps.boundingRegion) {
            this.updateMapRegion(boundingRegion)
        }
        if (isochrones !== prevProps.isochrones) {
            this.updateIsochrones(isochrones)
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

    updateAnnotationsFromPlaces(places) {
        this.clearAnnotations()
        if (!places) {
            return
        }
        const annotations = places.map((place) => {
            const coordinate = new this.mapkit.Coordinate(place.coordinate.latitude, place.coordinate.longitude)
            var annotation = new this.mapkit.MarkerAnnotation(coordinate);
            annotation.title = place.name;
            annotation.subtitle = place.formattedAddress;
            annotation.color = "#FF00FF";
            annotation.data.place = place;
            annotation.data.callback = (update) => {
                this.props.addDestination(place, update)
            }
            annotation.callout = landmarkAnnotationCallout
            return annotation
        })
        this.map.showItems(annotations)
    }

    convertToMapkit(boundingRegionObj) {
        if (boundingRegionObj instanceof this.mapkit.CoordinateRegion) {
            return boundingRegionObj
        }
        if (boundingRegionObj instanceof Object &&
            boundingRegionObj.center instanceof Object &&
            boundingRegionObj.span instanceof Object && 
            typeof(boundingRegionObj.center.latitude) === "number" &&
            typeof(boundingRegionObj.center.longitude) === "number" &&
            typeof(boundingRegionObj.span.latitudeDelta) === "number" &&
            typeof(boundingRegionObj.span.longitudeDelta) === "number") {
            const coordinate = new this.mapkit.Coordinate(boundingRegionObj.center.latitude, boundingRegionObj.center.longitude)
            const span = new this.mapkit.CoordinateSpan(boundingRegionObj.span.latitudeDelta, boundingRegionObj.span.longitudeDelta)
            return new this.mapkit.CoordinateRegion(coordinate, span)
        }
    }

	updateMapRegion(boundingRegionObj) {
        if (!(this.map instanceof this.mapkit.Map)) {
            return
        }
        const boundingRegion = this.convertToMapkit(boundingRegionObj)
        if (!(boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            return
        }
        if (this.map.region.equals(this.props.boundingRegion)) {
            return
        }
        console.log("Updating map region from Map.updateMapRegion: " + boundingRegion)
        this.map.region = boundingRegion
	}

    updateIsochrones(isochrones) {
        if (!(this.map instanceof this.mapkit.Map)) {
            return
        }
        const that = this
        isochrones.map( points => {
            const newPoints = points.reduce((point) => {
                const lon = point[0]
                const lat = point[1]
                return (typeof lon === 'number' && typeof lat === 'number')
            }).map(function(point) {
                const lon = point[0]
                const lat = point[1]
                return new that.mapkit.Coordinate(lat, lon);
            });
            var style = new that.mapkit.Style({
                strokeColor: "#F00",
                strokeOpacity: .2,
                lineWidth: 2,
                lineJoin: "round",
                lineDash: [2, 2, 6, 2, 6, 2]
            });
            var rectangle = new that.mapkit.PolygonOverlay(newPoints, { style: style });
            that.map.addOverlay(rectangle);
        })
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
