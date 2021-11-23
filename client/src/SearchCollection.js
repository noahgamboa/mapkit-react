import { DataStore } from '@aws-amplify/datastore';
import { SearchCollection } from './models';
import update from 'immutability-helper';

class SearchCollectionModel {
    static generateSearchCollectionID() {
        return "SearchCollection-" + Date.now().toString(36).substr(-8) + "-" + Math.random().toString(36).substr(2, 9); // guaranteed to be unique
    }

    static async create(name) {
        if (!(typeof(name) === "string")) {
            throw new Error("Group.create ERROR: name '" + name + "' is not an instance of a string")
        }
        if (name.length === 0) {
            throw new Error("SearchCollection.create ERROR: name must have a non-zero length")
        }
        const searchCollectionId = SearchCollectionModel.generateSearchCollectionID()
        return await DataStore.save(
            new SearchCollection({
                "data": "{}",
                "searchCollectionId": searchCollectionId,
                "name": name
            })
        );
    }

    static isType(searchCollection) {
        return searchCollection instanceof SearchCollection
        // debugger
        // return (
        //     searchCollection instanceof Object &&
        //     typeof(searchCollection.id) === "string" &&
        //     typeof(searchCollection.name) === "string" &&
        //     searchCollection.id.slice(0, 16) === "SearchCollection"
        // )
    }

    static async load(userId, searchCollectionId) {
        return new Promise( (resolve, reject) => {
            DataStore.query(SearchCollection, c => c.searchCollectionId("eq", searchCollectionId))
                .then((result) => {
                    console.log(result)
                    resolve(result)
                }).catch((error) => {
                    console.error(error)
                    reject(error)
                })
        })
    }

    static async save(searchCollection, name, data) {
        return new Promise( (resolve, reject) => {
            DataStore.save(SearchCollection.copyOf(searchCollection, item => {
                item.data = data
                item.name = name
            })).then((result) => {
                console.log("saved!")
                debugger
                resolve(result)
            }).catch((error) => {
                console.log("error in saving search collection!")
                reject(error)
            })
        })
    }
}

export class SearchCollections {
    static isType(searchCollections) {
        // TODO: improve this type check
        return searchCollections instanceof Array
    }

    static hasId(searchCollections, id) {
        if (!SearchCollections.isType(searchCollections)) {
            throw new Error("SearchCollections.hasId ERROR: searchCollections is not type SearchCollections")
        }
        if (typeof(id) !== "string") {
            return false
        }
        // TODO: improve this search
        for (var searchCollection of SearchCollections) {
            if (searchCollection.id === id) {
                return true
            }
        }
        return false
    }

    static get(searchCollections, id) {
        if (!SearchCollections.isType(searchCollections)) {
            throw new Error("SearchCollections.get ERROR: searchCollections is not type SearchCollections")
        }
        if (typeof(id) !== "string") {
            throw new Error("SearchCollections.get ERROR: id is not in searchCollections")
        }
        for (var searchCollection in searchCollections) {
            if (searchCollection.id === id) {
                return searchCollection
            }
        }
        throw new Error("SearchCollections.get ERROR: id is not in searchCollections")
    }

    static getSearchCollectionData(searchCollections, searchCollectionId) {
        console.log("here", searchCollectionId)
        for (var searchCollection of searchCollections) {
            console.log("here1", searchCollection.id)
            if (searchCollectionId == searchCollection.id) {
                return JSON.parse(searchCollection.data)
            }
        }
        return {}
    }

    static async loadAllSearchCollections() {
        return await DataStore.query(SearchCollection)
    }

    static async load() {
        return new Promise( (resolve, reject) => {
            SearchCollections.loadAllSearchCollections().then((result) => {
                console.log(result);
                if (result.length === 0) {
                    SearchCollectionModel.create("New Collection").then((result) => {
                        return result
                    }).then((result) => {
                        return SearchCollections.loadAllSearchCollections()
                    }).then((result) => {
                        console.log("Added new collection, result now is", result)
                        resolve(result)
                    })
                } else {
                    resolve(result)
                }
            }).catch((error) => {
                console.error(error)
                reject(error)
            })
        })
    }

    static async saveSearchCollectionFromState(state) {
        const searchCollection = state.currentSearchCollection
        if (searchCollection instanceof SearchCollection) {
            console.log("searchCollection is instance of SearchCollection")
        } else {
            console.log("searchCollection is not instance of SearchCollection")
        }
        const name = state.currentSearchCollection.name
        const data = JSON.stringify({
            boundingRegion: state.boundingRegion,
            groups: state.groups,
            destinations: state.destinations
        })
        return new Promise( (resolve, reject) => {
            SearchCollectionModel.save(searchCollection, name, data)
                .then((result) => {
                    resolve(result)
                }).catch((error) => {
                    reject(error)
                })
        })
    }


}
