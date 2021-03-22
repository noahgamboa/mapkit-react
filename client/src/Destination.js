import React, { Component } from 'react'
import './Destination.css';

const DestinationGroupSelector = ({groups, destination, updateGroup}) => {
    var groupChoices = Object.values(groups).map((g) => {
        return (<option key={g.name} value={g.id}>{g.name}</option>)
    })
    groupChoices.splice(0,0, (<option key="none" value="none">No Group</option>))

    const updateCallback = (e) => {
        const groupId = e.target.value
        const newGroup = groupId === "none" ? null : groups[groupId]
        updateGroup(destination, newGroup)
    }

    const groupId = destination.groupId === null ? "none" : destination.groupId
    return (
        <div>
            <span>Group:</span>
            <select onChange={updateCallback} value={groupId}>
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
        const {destination, updateDestination, groups, updateGroup} = this.props
        const localUpdateDestination = (update) => {
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
            updateDestination(newDestination)
        }

        const transportModes = Object.keys(destination.transportModes).map((mode) => {
            const selected = destination.transportModes[mode]
            const onChange = () => {
                var obj = {};
                obj[mode] = !selected
                localUpdateDestination(obj)
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
                            <DestinationGroupSelector groups={groups} destination={destination} updateGroup={updateGroup}/>
                            <div className="DestinationTime"> 
                            <input type="number" min="0" max="100" onChange={(e) => {
                                var obj = {};
                                obj.transitTime = Number(e.target.value)
                                localUpdateDestination(obj)
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
        const { name, groupId, updateGroupName, children } = this.props
        return (
            <div key={groupId}>
                <input type="text" value={name} onChange={ (e) => { updateGroupName(e.target.value, groupId) } } />
                <button onClick={this.toggleModal}>{ this.state.showChildren ? "➖" : "➕" }</button>
                <div className="DestinationGroup">
                    { this.state.showChildren ? children : (null) }
                </div>
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
        const destinationGroupList = Object.values(groups).map((group) => {
            const destinationIds = group.destinationIds
            const destinationList = Object.keys(destinationIds).map((destinationId) => {
                const destination = destinations[destinationId]
                return (<Destination 
                    key={destination.id} 
                    destination={destination}
                    updateDestination={this.props.updateDestination}
                    updateGroup={this.props.updateGroup}
                    groups={groups}/>)
            })
            return (<DestinationGroup key={group.id} name={group.name} updateGroupName={this.props.updateGroupName} groupId={group.id}>
                        {destinationList}
                    </DestinationGroup>)
        })
        const soloDestinations = Object.values(destinations)
            .filter((d) => d.groupId === null)
            .map((destination) => {
                return (<Destination 
                    key={destination.id} 
                    destination={destination}
                    updateDestination={this.props.updateDestination}
                    updateGroup={this.props.updateGroup}
                    groups={groups}/>)
        })
		return (
            <div className="DestinationViewWrapper">
                <h2>Destination List</h2>
                <button onClick={this.props.createGroup}>Create Group</button>
                <ul className="DestinationList">
                    { destinationGroupList }
                    { soloDestinations }
                </ul>
            </div>
        );
	}
}


export default DestinationView
