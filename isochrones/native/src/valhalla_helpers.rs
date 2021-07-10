use geo_types::Geometry;
use std::convert::TryInto;
use std::str::FromStr;
use std::convert::TryFrom;
use geojson::{quick_collection, GeoJson, Value};
use geo_types::GeometryCollection;
use geojson::FeatureCollection;

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
pub async fn query_valhalla(destinations: &Vec<&Destination>) -> Result<Vec<Isochrone>, ORSError> {
    let mut res = Vec::new();
    for destination in destinations {
        let url = "http://localhost:8002/isochrone";
        let request = json!({
            "locations":[{"lat": destination.lat, "lon": destination.lon}],
            "costing":"auto",
            "contours":[{"time":destination.time.num_minutes()}]
        });
        println!("Running request to {} with json {}", url, json!(request));
        let client = reqwest::Client::new();
        let query_result = client
            .post(url)
            .header("Content-Type", "application/json; charset=utf-8")
            .header("Accept", "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8")
            .json(&request)
            .send()
            .await?;
        let text = query_result.text().await?;
        let geojson = text.parse::<GeoJson>().unwrap();
        let mut collection: GeometryCollection<f64> = quick_collection(&geojson).unwrap();
        let geometry: &Geometry<f64> = &collection[0];
        let polygon = match geometry {
            Geometry::LineString(line) => Polygon::new(line.clone(), vec![]),
            _ => return Err(ORSError::new(format!("Can't match polygon in the struct: {:?}", geometry).as_str())),
        };
        let isochrone = Isochrone { id: destination.id.to_string(), mode: transport_mode.clone(),  polygon: polygon };
        res.push(isochrone);
    }
    return Ok(res);
}
