import React, { Component } from 'react'
import './Destination.css';

const DestinationGroupSelector = ({group, groups}) => {
    const groupChoices = groups.map((g) => {
        return (<option key={g.name} value={g.name} selected={!!(g === group)}>{g.name}</option>)
    })

    return (
        <div>
            <span>Group:</span>
            <select>
                {groupChoices}
            </select>
        </div>
    )
}

class Destination extends Component {
    state = {
        modalExposed: false
    }

    toggleModal = () => {
        this.setState({modalExposed: !this.state.modalExposed})
    }

    render() {
        const {destination, updateCallback, group, groups} = this.props
        const updateDestination = (update) => {
            var newDestination = Object.assign({}, destination)
            Object.keys(update).forEach((key) => {
                if (key === "transitTime") {
                    newDestination.transitTime = update[key]
                } else if (key in newDestination.transportModes) {
                    newDestination.transportModes[key] = update[key]
                } else {
                    console.error("Unknown key '" + key + "' for update to destination");
                }
            });
            updateCallback(newDestination)
        }

        const transportModes = Object.keys(destination.transportModes).map((mode) => {
            const selected = destination.transportModes[mode]
            const onChange = () => {
                var obj = {};
                obj[mode] = !selected
                updateDestination(obj)
            }
            return (<span key={mode} className="DestinationModeSpan">
                <input type="checkbox" checked={!!selected} onChange={onChange}/>
                <span>{mode}</span>
            </span>)
        })


        return (
            <div className="Destination">
                <button onClick={this.toggleModal}>{ destination.name }</button>
                { this.state.modalExposed === true ? 
                        (<div className="DestinationModal"> 
                            <DestinationGroupSelector group={group} groups={groups} />
                            <div className="DestinationTime"> 
                            <input type="number" min="0" max="100" onChange={(e) => {
                                var obj = {};
                                obj.transitTime = Number(e.target.value)
                                updateDestination(obj)
                            }} value={destination.transitTime}/>
                                <span>min</span>
                            </div>
                            <div className="TransportModeList">{ transportModes }</div>
                        </div>) : (null) 
                }
            </div>
        );
    }
}

class DestinationGroup extends Component {
    state = {
        showChildren: false
    }

    toggleModal = () => {
        this.setState({showChildren: !this.state.showChildren})
    }

    render() {
        const {key, name, numChildren, children} = this.props
        if (numChildren === 1) {
            return (children)
        }
        return (
            <div key={key}>
                <span>{name}</span>
                <button onClick={this.toggleModal}>{ this.state.showChildren ? "➖" : "➕" }</button>
                { this.state.showChildren ? children : (null) }
            </div>
        )
    }
}

class DestinationView extends Component {

	render() {
        const {destinations, groups} = this.props
        if (Object.keys(destinations).length === 0) {
            return (null);
        }
        const destinationGroupList = groups.map((group) => {
            const destinationIds = group.destinationIds
            const destinationList = destinationIds.map((destinationId) => {
                const destination = destinations[destinationId]
                return (<Destination key={destination.id} destination={destination} updateCallback={this.props.updateDestination} group={group} groups={groups}/>)
            })
            return (<DestinationGroup key={group.name} name={group.name} numChildren={destinationList.length}>{destinationList}</DestinationGroup>)
        })
		return (
            <div className="DestinationViewWrapper">
                <h2>Destination List</h2>
                <ul className="DestinationList">
                    { destinationGroupList }
                </ul>
            </div>
        );
	}
}


export default DestinationView
