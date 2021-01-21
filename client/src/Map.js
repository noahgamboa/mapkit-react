import React, { Component } from 'react'

class AppleMap extends Component {

    initializeMapkit(token) {
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
            // if we have no bounding region or the region has changed, update it
            if (this.props.boundingRegion === null || 
                !this.map.region.equals(this.props.boundingRegion))
                console.log("Updating app state: " + this.map.region)
                this.props.updateBoundingRegion(this.map.region) 
        });
        this.setMainCoords()
    }

    componentDidMount() {
		const { token } = this.props
        if (token === "") {
            return
        }
        this.initializeMapkit(token)
	}

	componentDidUpdate(prevProps) {
		const { token, annotations, boundingRegion } = this.props
        if (token !== "" && !this.map) {
            this.initializeMapkit(token)
        } 
        if (!this.map) {
            return;
        }

        console.log("Annotations are " + annotations)
        if (annotations !== null) {
            this.map.showItems(annotations)
        }
        if (boundingRegion !== null) {
            console.log("Updating the map state: " + boundingRegion)
            this.map.region = boundingRegion
        }
	}

	setMainCoords() {
		const { boundingRegion } = this.props
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
