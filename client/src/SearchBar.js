import React, { Component } from 'react'
import './SearchBar.css';

const SearchBarView = ({keyword,setKeyword,performQuery}) => {
    return (
        <input 
            className="SearchBar"
            key="random1"
            value={keyword}
            placeholder={"Search for a place"}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { 
                if (e.key === 'Enter') { performQuery() } 
            }}
            aria-label="Search for a place you are interested in going to"
            type="search"
        />
  );
}

const SetSearchRegionButton = ({setSearchRegion, disabled}) => {
    return (
        <input 
            className="SetSearchRegionButton"
            key="random1"
            value="Set Search Region"
            onClick={(e) => setSearchRegion()}
            aria-label="Search for a place you are interested in going to"
            type="button"
            disabled={disabled}
        />
  );
}

const RunButton = ({generateIsochrones}) => {
    return (
        <input 
            className="RunButton"
            key="random1"
            value="Generate"
            onClick={(e) => generateIsochrones()}
            aria-label="Generate Isochrones for the place you are interested in"
            type="button"
        />
  );
}

class SearchBar extends Component {
    state = {
        keyword: "",
        boundingRegion: null,
        searchRegionDisabled: false,
    };

    componentDidMount() {
        this.mapkit = window.mapkit
    }

    componentDidUpdate(prevProps) {
        const { boundingRegion } = this.props
        if (!(boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            // if boundingRegion is not a coordinate, don't update
            return 
        }
        if (this.state.boundingRegion === null) {
            // if we just initialized this, don't set the bounding region
            return
        }

        if (this.state.boundingRegion.equals(boundingRegion) && this.state.searchRegionDisabled === false) {
            // disable setting the search region when our map is set to the current search region
            this.setState({searchRegionDisabled: true})
            return 
        } 

        if (!this.state.boundingRegion.equals(boundingRegion) && this.state.searchRegionDisabled === true) {
            // enable setting the search region when our map is set to a different search region
            this.setState({searchRegionDisabled: false})
        }

    }

    setBoundingRegion = () => {
        console.log("Setting bounding region")
        this.setState({boundingRegion: this.props.boundingRegion})
    }

    setKeyword = (keyword) => {
        this.setState({keyword: keyword})
    }

    performQuery = () => {
        var boundingRegion = this.state.boundingRegion
        if (boundingRegion === null && this.props.boundingRegion instanceof this.mapkit.CoordinateRegion) {
            this.setState({ boundingRegion: this.props.boundingRegion })
            boundingRegion = this.props.boundingRegion
        }

        if (!(boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            alert("You must set the bounding region of search before searching")
            return
        }

        var search = new this.mapkit.Search({ region: boundingRegion });

        search.search(this.state.keyword, (error, data) => {
            if (error) {
                alert("Error with search: " + error)
                // Handle search error
                return;
            }
            if (data.places.length === 0) {
                alert("No places found for search term '" + this.state.keyword + "'")
            }
            var places = data.places.filter((place) => {
                const localBoundingRegion = boundingRegion.toBoundingRegion()
                const lat = place.coordinate.latitude
                const lon = place.coordinate.longitude
                return lat < localBoundingRegion.northLatitude && lat > localBoundingRegion.southLatitude 
                    && lon > localBoundingRegion.westLongitude && lon < localBoundingRegion.eastLongitude
            }).map((place) => {
                return {
                    name: place.name,
                    coordinate: place.coordinate,
                    pointOfInterestCategory: place.pointOfInterestCategory,
                    formattedAddress: place.formattedAddress
                }
            });

            this.props.setPlacesCallback(places)
        });

    }

	render() {
		return (
            <div className="SearchBarWrapper">
                <SearchBarView 
                    setKeyword={this.setKeyword} 
                    performQuery={this.performQuery}
                    keyword={this.state.keyword}
                />
                <SetSearchRegionButton 
                    setSearchRegion={this.setBoundingRegion}
                    disabled={this.state.searchRegionDisabled}
                />
                <RunButton generateIsochrones={this.props.generateIsochrones}/>
            </div>
		)
	}
}

export default SearchBar
