# mapkit-react

Find a place you'd like to live by indicating POIs and then group them. See the isochrones rendered in a mapkitjs-based app. 

`yarn dev`

isochrones are in rust, so may need to compile that with:

`neon build`

You will also need to install an run valhalla:

https://github.com/valhalla/valhalla

you need to start the valhalla server. here's how you start valhalla:

```shell
#download some data and make tiles out of it
#NOTE: you can feed multiple extracts into pbfgraphbuilder
wget http://download.geofabrik.de/europe/switzerland-latest.osm.pbf http://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf
#get the config and setup
mkdir -p valhalla_tiles
valhalla_build_config --mjolnir-tile-dir ${PWD}/valhalla_tiles --mjolnir-tile-extract ${PWD}/valhalla_tiles.tar --mjolnir-timezone ${PWD}/valhalla_tiles/timezones.sqlite --mjolnir-admin ${PWD}/valhalla_tiles/admins.sqlite > valhalla.json
#build routing tiles
#TODO: run valhalla_build_admins?
valhalla_build_tiles -c valhalla.json switzerland-latest.osm.pbf liechtenstein-latest.osm.pbf
#tar it up for running the server
find valhalla_tiles | sort -n | tar cf valhalla_tiles.tar --no-recursion -T -

# make the server, you need to do like
# there may be more cmake stuff in the docs.
make valhalla_service
```
Then, startup the server:
```
valhalla_service valhalla.json 1
```

# Features to Add

- ability to edit whole destinations as a group (set time & transit mode for an entire group)
- when searching for places to add, an indicator showing no place was found
- want to find places based on a vibe? not sure how to best quantify this, but I think you'd want to say like here are 3 places I like to go to, show me all the neighborhoods that are like the places that I like? maybe the app tracks you
- when adding a destination, be able to add it directly to the group you want to add it to
- improve saving of changes to the map, should really be saving on each change to the state. right now, if app crashes nothing is saved but should ideally be saving all the time.
    - add a sql database? eh. nah. 

