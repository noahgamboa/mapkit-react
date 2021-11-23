import React, { Component } from 'react'
import styled from 'styled-components'
import {SearchCollections} from './SearchCollection.js';

const SearchCollectionsViewWrapper = styled.div`
    position: absolute; 
    top: 100px;
    right: 10px;
    z-index: 99;
    width: 20rem;
    background: #F2F1F9;
    border: none;
    padding: 0.5rem;
`;

const SearchCollectionItem = ({id, name, updateName, setCurrent}) => {
    return (
        <div key={id} id={id}><button onClick={()=>{setCurrent(id)}}>{name}</button></div>
    )
}


class SearchCollectionsView extends Component {
	render() {
        const { savedSearchCollection, searchCollections, setCurrentSearchCollection, renameSearchCollection, deleteSearchCollection, saveSearchCollection} = this.props
        if (searchCollections === null) {
            return (<div></div>)
        }
        const searchCollectionsList = Object.values(searchCollections).map((searchCollection) => {
            return (<SearchCollectionItem key={searchCollection.id} id={searchCollection.id} name={searchCollection.name} updateName={renameSearchCollection} setCurrent={setCurrentSearchCollection}/>)
        })
		return (
            <SearchCollectionsViewWrapper>
                <h2>Search Collections</h2>
                <ul>
                    { searchCollectionsList }
                </ul>
                <button onClick={() => saveSearchCollection()}>Save Search Collection</button>
            </SearchCollectionsViewWrapper>
        );
	}
}
export default SearchCollectionsView
