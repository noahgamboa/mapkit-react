import React, { Component } from 'react'
import './SearchBar.css';

const SearchBarView = ({keyword,setKeyword,performQuery}) => {
    return (
        <div className="SearchBarWrapper">
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
            </div>
  );
}

class SearchBar extends Component {
    state = {
        keyword: "",
        boundingRegion: null,
    };

    componentDidMount() {
        this.mapkit = window.mapkit
    }

    setKeyword = (keyword) => {
        console.log(keyword)
        this.setState({keyword: keyword})
    }

    performQuery = () => {
        var search = new this.mapkit.Search({ region: this.props.boundingRegion});

        search.search(this.state.keyword, (error, data) => {
            if (error) {
                alert(error)
                // Handle search error
                return;
            }
            if (data.places.length === 0) {
                alert("No places found for search term '" + this.state.keyword + "'")
            }
            var annotations = data.places.filter((place) => {
                const boundingRegion = this.props.boundingRegion.toBoundingRegion()
                const lat = place.coordinate.latitude
                const lon = place.coordinate.longitude
                return lat < boundingRegion.northLatitude && lat > boundingRegion.southLatitude 
                    && lon > boundingRegion.westLongitude && lon < boundingRegion.eastLongitude
            }).map((place) => {
                var annotation = new this.mapkit.MarkerAnnotation(place.coordinate);
                annotation.title = place.name;
                annotation.subtitle = place.formattedAddress;
                annotation.color = "#FF00FF";
                // annotation.callout = landmarkAnnotationCallout;
                annotation.data.id = "1";
                return annotation;
            });

            this.props.setAnnotationCallback(annotations)
        });

    }

	render() {
		return (
            <SearchBarView 
                setKeyword={this.setKeyword} 
                performQuery={this.performQuery}
                keyword={this.state.keyword}
            />
		)
	}
}

export default SearchBar
