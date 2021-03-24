extern crate geo_booleanop;
extern crate geo_types;

use itertools::Itertools;
use std::collections::HashSet;
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use serde::{Deserialize, Serialize};
use serde_json::{Value};
use serde_json::Value::Array;
use crate::js_helpers::Destination;
use crate::js_helpers::Group;
use geo_booleanop::boolean::BooleanOp;
use geo_types::{MultiPolygon, Polygon, LineString, Coordinate};

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
    mode: String,
    polygon: Polygon<f64>
}

fn find_coordinates(coordinate: &Value) -> Result<Coordinate<f64>, ORSError> {
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
    return Ok(Coordinate { x: lon, y: lat });
}

#[tokio::main]
pub async fn query_ors(transport_mode: String, token: &String, destinations: &Vec<&Destination>) -> Result<Vec<Isochrone>, ORSError> {
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

    let mut res = Vec::new();

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
        let coordinates: Vec<Coordinate<f64>> = match coordinates.iter().map(find_coordinates).collect() {
            Ok(res) => res,
            Err(error) => return Err(error)
        };
        let exterior: LineString<f64> = coordinates.into();
        let polygon = Polygon::new(exterior, vec![]);
        let isochrone = Isochrone { id: id.to_string(), mode: transport_mode.clone(),  polygon: polygon };
        res.push(isochrone);
    }
    return Ok(res);
}

fn get_union(isochrones: &Vec<&Isochrone>) -> Result<Isochrone, ORSError> {
    let mut unionized_polygon = isochrones[0].polygon.clone();
    if isochrones.len() == 0 {
        return Err(ORSError::new("No isochrones in vec"));
    }
    for isochrone in isochrones {
        let multi_poly = unionized_polygon.union(&isochrone.polygon);
        if multi_poly.iter().count() != 1 {
            return Err(ORSError::new("Too many polygons in multi_poly"));
        }
        for polygon in multi_poly {
            unionized_polygon = polygon;
            break;
        }
    }
    let id = isochrones[0].id.clone();
    return Ok(Isochrone { id: id, mode: "AllModes".to_string(), polygon: unionized_polygon });
}

fn get_destination_isochrones(isochrones: &Vec<Isochrone>) -> Vec<Isochrone> {
    let mut found_isochrones: HashSet<String> = HashSet::new();
    let mut destination_isochrones = Vec::new();
    for isochrone in isochrones {
        // if we've seen this before, continue
        if found_isochrones.contains(&isochrone.id) { continue; }
        // get all isochrones with this id
        let all_isochrones_with_id = isochrones.iter().filter(|iso| { iso.id == isochrone.id }).collect();
        // add all the ones we've found to our set
        found_isochrones.insert(isochrone.id.clone());

        match get_union(&all_isochrones_with_id) {
            Ok(union) => destination_isochrones.push(union),
            Err(err) => { println!("{}", err); panic!("Couldn't get union of isochrones") },
        };
    }
    return destination_isochrones;
}

fn get_isochrone_permutations<'a>(groups: &Vec<Group>,  isochrones: &'a Vec<Isochrone>) -> Vec<Vec<&'a Isochrone>> {
    let mut new_groups: Vec<Vec<&Isochrone>> = Vec::new();
    let mut found_isochrones = HashSet::new();
    for isochrone in isochrones  {
        let id = &isochrone.id;
        if found_isochrones.contains(id) {
            continue;
        }
        let found = groups.iter().find(|&group| {
            group.destinations.contains(id)
        });
        match found {
            Some(group) =>  {
                // Note, the length of vector of isochrones >= length of group destinations because
                // each destination may have multiple modes of transport that can be used to get
                // there
                let ids: Vec<&Isochrone> = group.destinations.iter().map(|destination_id| {
                    let isochrones: Vec<&Isochrone> = isochrones.iter().filter(|isochrone| {
                        isochrone.id == *destination_id
                    }).collect();
                    if isochrones.len() == 0 {
                        panic!("Could not find isochrones");
                    }
                    isochrones
                }).flatten().collect();
                for iso in &ids {
                    found_isochrones.insert(&iso.id);
                }
                new_groups.push(ids)
            }
            None => {
                let mut new_isochrones: Vec<&Isochrone> = Vec::new();
                new_isochrones.push(&isochrone);
                new_groups.push(new_isochrones);
            }
        }
    }
    println!("\n\n{:?}\n\n", new_groups);
    let multi_prod: Vec<Vec<&Isochrone>> = new_groups.into_iter().multi_cartesian_product().collect();
    return multi_prod;
}

/// [ [ A, B ], [ C, D ] ] => [ [ A, C ], [ A, D ], [ B, C ], [ B, D ] ]
/// We know that for each Destination, we can have up to 4 Isochrones, one for each transport mode.
/// But each destination should only have at most 1 Isochrone associated with it. 
/// This implies that each destination has a destination isochrone. 
/// Then, from each destination isochrone, get all the isochrone permutations. From there, you want
/// to create a union of each set of 
pub fn get_isochrone_intersections(groups: &Vec<Group>,  isochrones: &Vec<Isochrone>) -> Result<MultiPolygon<f64>, ORSError> {
    let destination_isochrones = get_destination_isochrones(&isochrones);
    let all_isochrones = get_isochrone_permutations(groups, &destination_isochrones);
    println!("{:?}", all_isochrones);


    let multi_poly: MultiPolygon<f64> = all_isochrones.iter().map(| isochrone_vec | {
        let intersection = isochrone_vec.iter().fold(isochrone_vec[0].polygon.clone(), |acc, isochrone| { 
            let multi_poly = acc.intersection(&isochrone.polygon);
            if multi_poly.iter().count() != 1 {
                panic!("Multi poly has too many polygons");
            }
            for poly in multi_poly {
                return poly
            }
            panic!("Multi poly doesn't have any polygons");
            // let poly: Polygon<f64> = match multi_poly.iter().nth(0) {
            //     Some(poly) => *poly,
            //     None => panic!("Multi poly doesn't have any polygons"),
            // };
            // return poly;
        });
        return intersection;
    }).collect();

    // let multi_poly = MultiPolygon::new(all_isochrones_intersection);
    println!("{:?}", multi_poly);

    return Ok(multi_poly);
}
