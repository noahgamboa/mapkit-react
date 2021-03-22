use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use serde::{Deserialize, Serialize};
use serde_json::{Value};
use serde_json::Value::Array;
use crate::js_helpers::Destination;
use crate::js_helpers::Group;

/*
 curl -X POST \
  'https://api.openrouteservice.org/v2/isochrones/driving-car' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -H 'Accept: application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8' \
  -H 'Authorization: 5b3ce3597851110001cf6248fa5ae6eaac0140788a1c9155bda9f7dd' \
  -d '{"locations":[[8.681495,49.41461],[8.686507,49.41943]],"range":[300,200]}'
*/

#[derive(Debug)]
pub struct ORSError {
    pub details: String
}

impl ORSError {
    fn new(msg: &str) -> ORSError {
        ORSError{details: msg.to_string()}
    }
}

impl fmt::Display for ORSError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f,"{}",self.details)
    }
}

impl Error for ORSError {
    fn description(&self) -> &str {
        &self.details
    }
}

impl From<reqwest::Error> for ORSError {
    fn from(err: reqwest::Error) -> Self {
        ORSError::new(&err.to_string())
    }
}

impl From<ORSError> for String {
    fn from(err: ORSError) -> Self {
        return err.to_string();
    }
}

#[derive(Serialize, Deserialize)]
struct IsochroneRequest {
    locations: Vec<Vec<f64>>,
    range: Vec<f64> ,
}

#[derive(Debug)]
pub struct Isochrone {
    id: String,
    polygon: Vec<Vec<f64>>
}

fn find_coordinates(coordinate: &Value) -> Result<Vec<f64>, ORSError> {
    let coordinate = match coordinate {
        Array(coordinate) => coordinate,
        _ => return Err(ORSError::new("Coordinate is not a value")),
    };
    if coordinate.len() != 2 {
        return Err(ORSError::new("Coordinate is not a vec of length 2"));
    }
    let lon = match coordinate[0].as_f64() { 
        Some(v) => v,
        _ => return Err(ORSError::new("Coordinate 0 is not an f64")),
    };
    let lat = match coordinate[1].as_f64() {
        Some(v) => v,
        _ => return Err(ORSError::new("Coordinate 1 is not an f64")),
    };
    return Ok(vec![lon, lat]);
}

#[tokio::main]
pub async fn query_ors(transport_mode: String, token: &String, destinations: &Vec<&Destination>) -> Result<HashMap<String, Isochrone>, ORSError> {
    let mut locations = Vec::new();
    let mut range = Vec::new();
    for destination in destinations {
        let mut latlon = Vec::new();
        latlon.push(destination.lon);
        latlon.push(destination.lat);
        locations.push(latlon);
        range.push(destination.time);
    }
    let isochrone_request = IsochroneRequest {
        locations: locations,
        range: range
    };
    let url = "https://api.openrouteservice.org/v2/isochrones/".to_owned() + &transport_mode;
    println!("Running request...");
    let res: Value = reqwest::Client::new()
        .post(url)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Accept", "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8")
        .header("Authorization", token)
        .json(&isochrone_request)
        .send()
        .await?
        .json()
        .await?;

    let features = &res["features"];
    let features = match features {
        Array(vec) => vec,
        _ => return Err(ORSError::new("Features is not an array")),
    };

    let mut res = HashMap::new();

    for (i, destination) in destinations.iter().enumerate() {
        let id = &destination.id;
        let polygon = features.iter().find(|&feature| {
            let properties = &feature["properties"];
            let group_index = &properties["group_index"];
            if group_index != i {
                return false;
            }
            let value = &properties["value"];
            if value != destination.time {
                return false;
            }
            return true;
        });
        let polygon = match polygon {
            Some(polygon) => polygon,
            _ => return Err(ORSError::new("could not find polygon")),
        };
        let coordinates = match &polygon["geometry"]["coordinates"] {
            Array(coordinates) => coordinates,
            _ => return Err(ORSError::new("coordinates is not an array")),
        }; 
        if coordinates.len() != 1 {
            return Err(ORSError::new("coordinates is not an array of length 1"));
        }
        let coordinates = match &coordinates[0] {
            Array(coordinates) => coordinates,
            _ => return Err(ORSError::new("inner coordinates is not an array")),
        };
        let coordinates: Vec<Vec<f64>> = match coordinates.iter().map(find_coordinates).collect() {
            Ok(res) => res,
            Err(error) => return Err(error)
        };
        let isochrone = Isochrone { id: id.to_string(), polygon: coordinates };
        res.insert(id.to_string(), isochrone);
    }
    return Ok(res);
}

pub fn get_isochrone_intersections(groups: &Vec<Group>,  isochrones: HashMap<String, Isochrone>) -> Result<Vec<Isochrone>, ORSError> {
    return Ok(Vec::new());
}
