import React, { Component } from 'react'
import ReactDOM from 'react-dom';
// Landmark annotation callout delegate

import './MapCallout.css'

class AnnotationCallout extends Component {
    state = {
        title: "",
        callback: () => {},
    }
    annotation = null


    componentDidMount() {
        this.setState({
            title: this.props.annotation.title,
            callback: this.props.annotation.data.callback
        })
    }

    render() {
        return (
            <div className="Landmark">
                <h2>{this.state.title}</h2>
                <input 
                    className="AddToDestinationList"
                    value="Add Destination"
                    onClick={(e) => this.state.callback()}
                    type="button"
                    aria-label="Search for a place you are interested in going to"
                />
            </div>
        )
    }

}

var CALLOUT_OFFSET = new DOMPoint(-148, -78);
var landmarkAnnotationCallout = {
    calloutElementForAnnotation: function(annotation) {
        return calloutForLandmarkAnnotation(annotation);
    },

    calloutAnchorOffsetForAnnotation: function(annotation, element) {
        return CALLOUT_OFFSET;
    },

    calloutAppearanceAnimationForAnnotation: function(annotation) {
        return ".4s cubic-bezier(0.4, 0, 0, 1.5) 0s 1 normal scale-and-fadein";
    }
};


// Landmark annotation custom callout
function calloutForLandmarkAnnotation(annotation) {
    var div = document.createElement("div");
    ReactDOM.render(<AnnotationCallout annotation={annotation}/>, div)
    return div;
}
export default landmarkAnnotationCallout
