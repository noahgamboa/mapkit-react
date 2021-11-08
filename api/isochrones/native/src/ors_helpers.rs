extern crate geo_booleanop;
extern crate geo_types;

use futures::{stream, StreamExt}; // 0.3.5
use itertools::Itertools;
use std::collections::HashSet;
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

fn get_destination_isochrones(isochrones: &Vec<Isochrone>) -> Result<Vec<Isochrone>, ORSError> {
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
            Err(err) => return Err(err),
        };
    }
    return Ok(destination_isochrones);
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
    // println!("\n\n{:?}\n\n", new_groups);
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
    println!("[RUST] [get_isochrone_intersections] here 0.");
    let destination_isochrones = get_destination_isochrones(&isochrones)?;
    println!("[RUST] [get_isochrone_intersections] here 1.");
    let all_isochrones = get_isochrone_permutations(groups, &destination_isochrones);
    println!("[RUST] [get_isochrone_intersections] here 2.");
    // println!("{:?}", all_isochrones);


    if isochrones.len() < 1 {
        return Err(ORSError::new("No isochrones!"));
    }
    let initial_multi_poly: MultiPolygon<f64> = MultiPolygon::from(vec![Polygon::new(LineString::from(vec![(0f64,0f64)]), vec![] )]);
    let multi_poly: MultiPolygon<f64> = all_isochrones.iter().fold(initial_multi_poly, |acc, isochrone_vec | {
        let first_poly_multi = MultiPolygon::from(isochrone_vec[0].polygon.clone());
        let intersection: MultiPolygon<f64> = isochrone_vec.iter().fold(first_poly_multi, |acc, isochrone| { 
            acc.intersection(&isochrone.polygon)
        });
        return acc.union(&intersection)
    });
    println!("{:?}", multi_poly);
    println!("[RUST] [get_isochrone_intersections] here 3.");

    return Ok(multi_poly);
}
