import React, { Component } from 'react'
import { styled, alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import './SearchBar.css';
import Box from '@mui/material/Box';

const Search = styled('paper')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.90),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 1),
  },
  marginRight: theme.spacing(0),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(0),
    width: 'auto',
  },
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(0)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '30ch',
    },
  },
}));

const SearchBarView = ({keyword,setKeyword,performQuery}) => {
    return (
        <Search>
            <StyledInputBase
                key="search"
                placeholder={"Search for a place"}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => { 
                    if (e.key === 'Enter') { performQuery() } 
                }}
                aria-label="Search for a place you are interested in going to"
                type="search"
            />
        </Search>
    );
}

const SetSearchRegionButton = ({setSearchRegion, disabled}) => {
    return (
        <Button 
            onClick={(e) => setSearchRegion()}
            aria-label="Search for a place you are interested in going to"
            type="button"
            color="inherit"
            variant="contained"
            disabled={disabled}>Set Search Region</Button>
    );
}

const RunButton = ({generateIsochrones}) => {
    return (
        <Button 
            onClick={(e) => generateIsochrones()}
            aria-label="Generate Isochrones for the place you are interested in"
            type="button"
            color="primary"
            variant="contained"
        >Generate</Button>
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
            <Stack spacing={2} direction="row">
                <SearchBarView 
                    sx={{background:'white'}}
                    setKeyword={this.setKeyword} 
                    performQuery={this.performQuery}
                    keyword={this.state.keyword}
                />
                <SetSearchRegionButton 
                    setSearchRegion={this.setBoundingRegion}
                    disabled={this.state.searchRegionDisabled}
                />
                <RunButton generateIsochrones={this.props.generateIsochrones}/>
            </Stack>
		)
	}
}

export default SearchBar
