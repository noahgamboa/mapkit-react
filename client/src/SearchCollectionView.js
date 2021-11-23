import React, { Component } from 'react'
import {SearchCollections} from './SearchCollection.js';

import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

const SearchCollectionsView = (props) => {
    const { searchCollections, currentSearchCollection, setCurrentSearchCollection } = props
    const currentSearchCollectionIndex = searchCollections.findIndex((e) => e.id === currentSearchCollection.id)

    const handleChange = (event) => {
        console.log("here!", event.target.value)
        setCurrentSearchCollection(searchCollections[event.target.value])
    };

    return (
        <Box sx={{ minWidth: 120 , background: "white"}}>
            <FormControl fullWidth>
                <InputLabel>Search Collection</InputLabel>
                <Select
                    value={currentSearchCollectionIndex}
                    label="Search Collection"
                    onChange={handleChange}
                >
                    {searchCollections.map((searchCollection, index) => (
                        <MenuItem value={index} >{searchCollection.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}

export default SearchCollectionsView
