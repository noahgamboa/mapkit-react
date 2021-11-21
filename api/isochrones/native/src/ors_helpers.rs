extern crate geo_booleanop;
extern crate geo_types;

use futures::{stream, StreamExt}; // 0.3.5
use itertools::Itertools;
use std::collections::HashSet;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
// use serde_json::{Value};
// use serde_json::Value::Array;
use crate::js_helpers::Destination;
use crate::js_helpers::Group;
use crate::isochrones::{ORSError, Isochrone};
use geo_booleanop::boolean::BooleanOp;
use geo_types::{MultiPolygon, Polygon, LineString, Coordinate};

#[derive(Serialize, Deserialize)]
pub struct IsochroneRequest {
    locations: Vec<Vec<f64>>,
    range: Vec<f64> ,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Property {
    group_index: i32,
    value: f64,
    center: Vec<f64>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Geometry { 
    coordinates: Vec<Vec<Vec<f64>>>,
    r#type: String
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Feature {
    r#type: String, 
    properties: Property,
    geometry: Geometry 
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IsochroneResult {
    r#type: String,
    features: Vec<Feature>
}

/*
 curl -X POST \
  'https://api.openrouteservice.org/v2/isochrones/driving-car' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -H 'Accept: application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8' \
  -H 'Authorization: 5b3ce3597851110001cf6248fa5ae6eaac0140788a1c9155bda9f7dd' \
  -d '{"locations":[[8.681495,49.41461],[8.686507,49.41943]],"range":[300,200]}'
*/


// fn find_coordinates(coordinate: &Value) -> Result<Coordinate<f64>, ORSError> {
//     let coordinate = match coordinate {
//         Array(coordinate) => coordinate,
//         _ => return Err(ORSError::new("Coordinate is not a value")),
//     };
//     if coordinate.len() != 2 {
//         return Err(ORSError::new("Coordinate is not a vec of length 2"));
//     }
//     let lon = match coordinate[0].as_f64() { 
//         Some(v) => v,
//         _ => return Err(ORSError::new("Coordinate 0 is not an f64")),
//     };
//     let lat = match coordinate[1].as_f64() {
//         Some(v) => v,
//         _ => return Err(ORSError::new("Coordinate 1 is not an f64")),
//     };
//     return Ok(Coordinate { x: lon, y: lat });
// }

pub async fn run_queries(request: IsochroneRequest, client: &reqwest::Client, url: &String, token: &String, destinations: &[&Destination], transport_mode: &String) -> Result<Vec<Isochrone>, ORSError> {
    println!("Running request to {} with json {}", url, json!(request));
    let query_result = client
        .post(url)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Accept", "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8")
        .header("Authorization", token)
        .json(&request)
        .send()
        .await?;

    let text = query_result.text().await?;
    let isochrone_result: Result<IsochroneResult, _> = serde_json::from_str(&text);
    // let isochrone_result: Result<IsochroneResult, _> = query_result.json().await;

    let isochrone_result: IsochroneResult = match isochrone_result {
        Ok(result) => result,
        Err(err) => {
            return Err(ORSError::new(format!("{:?} :: result is {}", err, text).as_str()))
        }
    };

    let mut res = Vec::new();

    for (i, destination) in destinations.iter().enumerate() {
        let id = &destination.id;
        let time = destination.time.num_seconds() as f64;
        let feature = isochrone_result.features.iter().find(|&feature| {
            if feature.properties.group_index != (i as i32) {
                return false;
            }; 
            if feature.properties.value != time {
                return false;
            }
            return true;
        });
        let feature = match feature {
            Some(feature) => feature,
            _ => return Err(ORSError::new(format!("could not find feature for group_index {} with time {} in {:?}", i, time, isochrone_result.features).as_str())),
        };
        if feature.geometry.coordinates.len() != 1 {
            return Err(ORSError::new(format!("Coordinates returned is not an array of length 1: {:?}", feature.geometry.coordinates).as_str()));
        }
        let coordinates: Vec<Coordinate<f64>> = feature.geometry.coordinates[0].iter().map(|coordinate| {
            let lon = coordinate[0];
            let lat = coordinate[1];
            return Coordinate { x: lon, y: lat };
        }).collect();
        let exterior: LineString<f64> = coordinates.into();
        let polygon = Polygon::new(exterior, vec![]);
        let isochrone = Isochrone { id: id.to_string(), mode: transport_mode.clone(),  polygon: polygon };
        res.push(isochrone);
    }
    return Ok(res);
}

#[tokio::main]
pub async fn query_ors(transport_mode: String, token: &String, destinations: &Vec<&Destination>) -> Result<Vec<Isochrone>, ORSError> {
        // TODO: can only query in groups of 5, so need to make a new query for each set of 5...
        let requests: Vec<(IsochroneRequest, &[&Destination])> = destinations.chunks(5).map(|destination_chunk| {
            let mut locations = Vec::new();
            let mut range = Vec::new();
            for destination in destination_chunk {
                let mut latlon = Vec::new();
                latlon.push(destination.lon);
                latlon.push(destination.lat);
                locations.push(latlon);
                range.push(destination.time.num_seconds() as f64);
            }
            return (IsochroneRequest {
                locations: locations,
                range: range
            }, destination_chunk);
        }).collect();

        let num_requests = requests.len();
        let client = reqwest::Client::new();
        let url = "https://api.openrouteservice.org/v2/isochrones/".to_owned() + &transport_mode;
        let features: Vec<Result<Vec<Isochrone>, ORSError>> = stream::iter(requests).map(|request| {
            async {
                return run_queries(request.0, &client, &url, &token, request.1, &transport_mode).await;
            }
        }).buffer_unordered(num_requests).collect().await;

        let features: Result<Vec<Vec<Isochrone>>, ORSError> = features.into_iter().collect();
        match features {
            Ok(features) => return Ok(features.into_iter().flatten().collect()),
            Err(err) => return Err(err),
        };
}

fn get_union(isochrones: &Vec<&Isochrone>) -> Result<Isochrone, ORSError> {
    let single_polygon = isochrones.iter().fold(None, |acc: Option<MultiPolygon<f64>>, isochrone| {
        match acc {
            Some(poly) => { Some(poly.union(&isochrone.polygon)) },
            None => Some(MultiPolygon::from(isochrone.polygon.clone()))
        }
    }).ok_or(ORSError::new("Couldn't get polygon"))?;
    if single_polygon.iter().count() != 1 {
        return Err(ORSError::new("single polygon has multiply polygons in it"));
    }
    let single_polygon = single_polygon.into_iter().nth(0).ok_or(ORSError::new("single polygon doesn't have any polygons"))?;
    let id = isochrones[0].id.clone();
    return Ok(Isochrone { id: id, mode: "AllModes".to_string(), polygon: single_polygon });
}

// isochrones that is passed in is expected to a list of isochrones that have the same
// destination for a few of them. This will generate a list of isochrones that is the 
// union of the isochrones with the same destination from isochrones. It will return
// a new vector such that each Isochrone will be the only isochrone with that destination.
fn get_destination_isochrones(isochrones: &Vec<Isochrone>) -> Result<Vec<Isochrone>, ORSError> {
    let mut found_isochrones: HashSet<&String> = HashSet::new();
    let mut destination_isochrones = Vec::new();
    for isochrone in isochrones {
        // if we've seen this before, continue
        if found_isochrones.contains(&isochrone.id) { continue; }
        // get all isochrones with this id
        let all_isochrones_with_id = isochrones.iter().filter(|iso| { iso.id == isochrone.id }).collect();
        // add all the ones we've found to our set
        found_isochrones.insert(&isochrone.id);

        match get_union(&all_isochrones_with_id) {
            Ok(union) => destination_isochrones.push(union),
            Err(err) => return Err(err),
        };
    }
    return Ok(destination_isochrones);
}

fn get_group_isochrones(groups: &Vec<Group>,  isochrones: &Vec<Isochrone>) -> Vec<MultiPolygon<f64>> {
    let mut group_isochrones: HashMap<&String, MultiPolygon<f64>> = HashMap::new();
    for isochrone in isochrones {
        let found_group_for_isochrone = groups.iter().find(|&group| {
            group.destinations.contains(&isochrone.id)
        });
        match found_group_for_isochrone {
            Some(group) =>  {
                match group_isochrones.get_mut(&group.id) {
                    Some(multipoly) => { *multipoly = multipoly.union(&isochrone.polygon); }
                    None => { let _ = group_isochrones.insert(&group.id, MultiPolygon::from(isochrone.polygon.clone())); }
                };
            }
            None => { let _ = group_isochrones.insert(&isochrone.id, MultiPolygon::from(isochrone.polygon.clone())); }
        };
    }
    return group_isochrones.into_values().collect();
}

// We know that for each Destination, we can have up to 4 Isochrones, one for each transport mode.
// But each destination should only have at most 1 Isochrone associated with it. 
// This implies that each destination has a destination isochrone. 
// Then, for each destination isochrone, fold each of them into a group isochrone by taking the
// union of that isochrone with the group isochrone. If the destination is not part of a group,
// keep it in the vector of isochrones. 
// Then, take the intersection of all those group isochrones
pub fn get_isochrone_intersections(groups: &Vec<Group>,  isochrones: &Vec<Isochrone>) -> Result<MultiPolygon<f64>, ORSError> {
    // Generate an isochrone for each destination
    let destination_isochrones = get_destination_isochrones(&isochrones)?;
    // Generate an isochrone for each group and retain isochrone for destinations without groups
    let group_polygons = get_group_isochrones(groups, &destination_isochrones);
    // Generate the intersection of all the group polygons
    let multi_poly = group_polygons.into_iter().reduce(|a, b| a.intersection(&b));
    match multi_poly {
        Some(multi_poly) => Ok(multi_poly),
        None => Err(ORSError::new("No isochrones were passed."))
    }
}
