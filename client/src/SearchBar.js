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

class SearchBar extends Component {
    state = {
        keyword: "",
        boundingRegion: null,
        setSearchRegionDisabled: false,
    };

    componentDidMount() {
        this.mapkit = window.mapkit
    }

    componentDidUpdate(prevProps) {
        const { boundingRegion } = this.props
        if (!(boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            return 
        }
        if (!(this.state.boundingRegion instanceof this.mapkit.CoordinateRegion)) {
            return
        }

        if (this.state.boundingRegion.equals(boundingRegion) && this.state.setSearchRegionDisabled === false) {
            // disable setting the search region when our map is set to the current search region
            this.setState({setSearchRegionDisabled: true})
            return 
        } 

        if (!this.state.boundingRegion.equals(boundingRegion) && this.state.setSearchRegionDisabled === true) {
            // enable setting the search region when our map is set to a different search region
            this.setState({setSearchRegionDisabled: false})
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
        if (this.state.boundingRegion === null) {
            alert("You must set the bounding region of search before searching")
            return
        }
        var search = new this.mapkit.Search({ region: this.state.boundingRegion});

        search.search(this.state.keyword, (error, data) => {
            if (error) {
                alert("Error with search: " + error)
                // Handle search error
                return;
            }
            if (data.places.length === 0) {
                alert("No places found for search term '" + this.state.keyword + "'")
            }
            var annotations = data.places.filter((place) => {
                const boundingRegion = this.state.boundingRegion.toBoundingRegion()
                const lat = place.coordinate.latitude
                const lon = place.coordinate.longitude
                return lat < boundingRegion.northLatitude && lat > boundingRegion.southLatitude 
                    && lon > boundingRegion.westLongitude && lon < boundingRegion.eastLongitude
            }).map((place) => {
                var annotation = new this.mapkit.MarkerAnnotation(place.coordinate);
                annotation.title = place.name;
                annotation.subtitle = place.formattedAddress;
                annotation.color = "#FF00FF";
                annotation.data.place = place;
                return annotation;
            });

            this.props.setAnnotationCallback(annotations)
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
                    disabled={this.state.setSearchRegionDisabled}
                />
            </div>
		)
	}
}

export default SearchBar
