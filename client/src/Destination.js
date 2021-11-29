import React, { Component } from 'react'
import './Destination.css';
import Paper from '@mui/material/Paper';
import ListSubheader from '@mui/material/ListSubheader';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import DraftsIcon from '@mui/icons-material/Drafts';
import SendIcon from '@mui/icons-material/Send';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarBorder from '@mui/icons-material/StarBorder';



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
        const {destination, updateDestination, groups, updateGroup, deleteDestination} = this.props
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
            <>
                {/* <div className="Destination"> */}
                {/*     <button onClick={this.toggleModal}>{ destination.name }</button> */}
                {/*     { this.state.modalExposed === true ? */} 
                {/*             (<div className="DestinationModal"> */} 
                {/*                 <button onClick={() => { deleteDestination(destination) }}>Delete</button> */}
                {/*                 <DestinationGroupSelector groups={groups} destination={destination} updateGroup={updateGroup}/> */}
                {/*                 <div className="DestinationTime"> */} 
                {/*                 <input type="number" min="0" max="100" onChange={(e) => { */}
                {/*                     var obj = {}; */}
                {/*                     obj.transitTime = Number(e.target.value) */}
                {/*                     localUpdateDestination(obj) */}
                {/*                 }} value={destination.transitTime}/> */}
                {/*                     <span>min</span> */}
                {/*                 </div> */}
                {/*                 <div className="TransportModeList">{ transportModes }</div> */}
                {/*             </div>) : (null) */} 
                {/*     } */}
                {/* </div> */}
                <ListItemButton onClick={this.toggleModal}>
                    <ListItemIcon>
                        <SendIcon />
                    </ListItemIcon>
                    <ListItemText primary={destination.name} />
                    {this.state.modalExposed ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={this.state.modalExposed} timeout="auto" unmountOnExit>
                    <div className="DestinationModal"> 
                        <button onClick={() => { deleteDestination(destination) }}>Delete</button>
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
                        </div> 
                </Collapse>
            </>
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
        const {destinations, groups, updateDestination, deleteDestination, updateGroup, updateGroupName} = this.props
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
                    updateDestination={updateDestination}
                    updateGroup={updateGroup}
                    deleteDestination={deleteDestination}
                    groups={groups}/>)
            })
            return (<DestinationGroup key={group.id} name={group.name} updateGroupName={updateGroupName} groupId={group.id}>
                        {destinationList}
                    </DestinationGroup>)
        })
        const soloDestinations = Object.values(destinations)
            .filter((d) => d.groupId === null)
            .map((destination) => {
                return (<Destination 
                    key={destination.id} 
                    destination={destination}
                    updateDestination={updateDestination}
                    updateGroup={updateGroup}
                    deleteDestination={deleteDestination}
                    groups={groups}/>)
        })
		return (
            <Paper elevation={3} sx={{position: 'absolute', zIndex:99, marginLeft: 3, marginTop: 10.5, width: '32.5ch'}}>
                <button onClick={this.props.createGroup}>Create Group</button>
                <List
                    dense={true}
                    sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
                    component="nav"
                    aria-labelledby="nested-list-subheader"
                    subheader={
                        <ListSubheader component="div" id="nested-list-subheader">
                            Destination List
                        </ListSubheader>
                    }
                >
                    <ListItemButton>
                        <ListItemIcon>
                            <SendIcon />
                        </ListItemIcon>
                        <ListItemText primary="Sent mail" />
                    </ListItemButton>
                    <ListItemButton>
                        <ListItemIcon>
                            <DraftsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Drafts" />
                    </ListItemButton>
                    { destinationGroupList }
                    { soloDestinations }
                </List>
            </Paper>
        );
	}
}


export default DestinationView
