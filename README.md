# mapkit-react

```
docker-compose up -d
```

# Features to Add

- ability to edit whole destinations as a group (set time & transit mode for an entire group)
- when searching for places to add, an indicator showing no place was found
- want to find places based on a vibe? not sure how to best quantify this, but I think you'd want to say like here are 3 places I like to go to, show me all the neighborhoods that are like the places that I like? maybe the app tracks you
- when adding a destination, be able to add it directly to the group you want to add it to
- improve saving of changes to the map, should really be saving on each change to the state. right now, if app crashes nothing is saved but should ideally be saving all the time.
    - add a sql database? eh. nah. 
- if you click generate and it doesn't generate explain what to do to make it generate.
    - if you click generate and there's no overlap, it should tell you there's no overlap
    - if it's broken, tell them to contact me!
- make it mobile-friendly
    - possibly rework the UI entirely so that it's mobile first? 


# react-express-docker-skeleton
A skeleton React/Express/Docker app

After downloading, run `npm run install` once to install the dependencies.

Run `npm run dev` to start the development server.

Run `npm run prod` to start the production server.

This project contains an Express.js app in the "api" folder and a React.js app in the "client" folder. The development configuration starts the Express and React apps in their own containers. The production configuration builds the React app and copies the build artifacts into the same container as the Express app. The Express app then serves up the React files along with the API.   

In the development configuration, the Express app serves an API on port 3001 and the React app serves HTML/CSS/JS on port 3000. 

In the production configuration, the Express app serves an API on port 3001, but it is not publicly accessible. Nginx runs on port 80 and proxies API requests to the Express app on port 3001.
