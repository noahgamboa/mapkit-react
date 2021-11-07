import update from 'immutability-helper';

// Example POST method implementation:
async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

export class SearchCollection {
    static generateSearchCollectionID() {
        return "SearchCollection-" + Date.now().toString(36).substr(-8) + "-" + Math.random().toString(36).substr(2, 9); // guaranteed to be unique
    }

    static create(name) {
        if (!(typeof(name) === "string")) {
            throw new Error("Group.create ERROR: name '" + name + "' is not an instance of a string")
        }
        if (name.length === 0) {
            throw new Error("SearchCollection.create ERROR: name must have a non-zero length")
        }
        const searchCollectionId = SearchCollection.generateSearchCollectionID()
        return {
            id: searchCollectionId,
            name: name,
        }
    }

    static isType(searchCollection) {
        return (
            searchCollection instanceof Object &&
            typeof(searchCollection.id) === "string" &&
            typeof(searchCollection.name) === "string" &&
            searchCollection.id.slice(0, 16) === "SearchCollection"
        )
    }

    static async load(userId, searchCollectionId) {
        return new Promise( (resolve, reject) => {
            postData("/loadSearchCollection", {
                searchCollectionId: searchCollectionId,
                userId: userId
            }).then((result) => {
                resolve(result)
            }).catch((error) => {
                console.error(error)
                reject(error)
            })
        })
    }

    static async save(searchCollectionState, userId) {
        var shouldUpdateState = false
        if (!SearchCollection.isType(searchCollectionState.currentSearchCollection)) {
            const searchCollection = SearchCollection.create("New Collection")
            searchCollectionState.currentSearchCollection = searchCollection
            searchCollectionState.searchCollections = SearchCollections.setOrAddSearchCollection(searchCollectionState.searchCollections, searchCollection)
            shouldUpdateState = true
        }
        return new Promise( (resolve, reject) => {
            postData("/saveSearchCollection", {
                userId: userId,
                data: searchCollectionState,
            }).then((result) => {
                console.log("saved!")
                result.shouldUpdateState = shouldUpdateState
                result.searchCollectionState = searchCollectionState
                resolve(result)
            }).catch((error) => {
                console.log("error!")
                reject(error)
            })
        })
    }
}

export class SearchCollections {
    static create() {
        return {type: "SearchCollections", data: {}}
    }

    static isType(searchCollections) {
        return (
            searchCollections instanceof Object &&
            searchCollections.type === "SearchCollections"
        )
    }

    static setOrAddSearchCollection(searchCollectionGroup, searchCollection) {
        if (!SearchCollection.isType(searchCollection)) {
            throw new Error("SearchCollections.addSearchCollection ERROR: cannot add '" + searchCollection + "' because it is not a SearchCollection")
        }
        if (!SearchCollections.isType(searchCollectionGroup)) {
            throw new Error("SearchCollections.addSearchCollection ERROR: cannot add to '" + searchCollectionGroup + "' because it is not a SearchCollectionGroup")
        }
        var searchCollectionUpdate = {data: {}}
        searchCollectionUpdate["data"][searchCollection.id] = searchCollection
        const newSearchCollectionGroup = update(searchCollectionGroup, { $merge: searchCollectionUpdate })
        return newSearchCollectionGroup
    }

    static removeSearchCollection(searchCollectionGroup, searchCollection) {
        if (!SearchCollections.isType(searchCollectionGroup)) {
            throw new Error("SearchCollections.removeSearchCollection ERROR: cannot remove from '" + searchCollectionGroup + "' because it is not a SearchCollectionGroup")
        }
        if (!SearchCollection.isType(searchCollection)) {
            throw new Error("SearchCollections.removeSearchCollection ERROR: cannot remove '" + searchCollection + "' because it is not a SearchCollection")
        }
        if (!(searchCollection.id in searchCollectionGroup)) {
            throw new Error("SearchCollections.removeSearchCollection ERROR: cannot remove '" + searchCollection + "' because it is not in the SearchCollectionGroup")
        }
        const newSearchCollectionGroup = update(searchCollectionGroup, { $unset: [searchCollection.id] })
        return newSearchCollectionGroup
    }

    static hasId(searchCollectionsGroup, id) {
        if (!SearchCollections.isType(searchCollectionsGroup)) {
            throw new Error("SearchCollections.hasId ERROR: searchCollections is not type SearchCollections")
        }
        if (typeof(id) !== "string") {
            return false
        }
        return (id in searchCollectionsGroup.data)
    }

    static get(searchCollections, id) {
        if (!SearchCollections.isType(searchCollections)) {
            throw new Error("SearchCollections.get ERROR: searchCollections is not type SearchCollections")
        }
        if (typeof(id) !== "string") {
            throw new Error("SearchCollections.get ERROR: id is not in searchCollections")
        }
        if (!(id in searchCollections.data)) {
            throw new Error("SearchCollections.get ERROR: id is not in searchCollections")
        }
        return searchCollections.data[id]
    }

    static async load(userId) {
        return new Promise( (resolve, reject) => {
            postData("/loadSearchCollections", {
                userId: userId
            }).then((result) => {
                resolve(result)
            }).catch((error) => {
                console.error(error)
                reject(error)
            })
        })
    }

    static isEmpty(searchCollectionGroup) {
        if (!SearchCollections.isType(searchCollectionGroup)) {
            throw new Error("SearchCollections.isEmpty ERROR: '" + searchCollectionGroup + "' is not a SearchCollectionGroup")
        }
        const hasKeys = !!Object.keys(searchCollectionGroup).length;
        return !hasKeys
    }

}
