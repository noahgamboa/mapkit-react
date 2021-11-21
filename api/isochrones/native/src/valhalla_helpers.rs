extern crate geo_booleanop;
extern crate geo_types;

use serde_json::json;
use crate::js_helpers::Destination;
use geo_types::Polygon;

use geo_types::Geometry;
use geojson::{quick_collection, GeoJson};
use geo_types::GeometryCollection;

use crate::isochrones::{ORSError, Isochrone};

fn not_using_transport_mode(transport_mode: &str, destination: &Destination) -> bool {
    if transport_mode == "bicycle" && destination.bike == false {
        return true;
    }
    if transport_mode == "auto" && destination.drive == false {
        return true;
    }
    if transport_mode == "pedestrian" && destination.walk == false {
        return true;
    }
    if transport_mode == "multimodal" && destination.transit == false {
        return true;
    }
    return false;
}

#[tokio::main]
pub async fn query_valhalla(destinations: &Vec<&Destination>, url: &String) -> Result<Vec<Isochrone>, ORSError> {
    let mut res = Vec::new();
    let transport_modes = vec!["bicycle", "auto", "pedestrian", "multimodal"];
    for destination in destinations {
        for transport_mode in &transport_modes {
            if not_using_transport_mode(transport_mode, destination) {
                continue;
            }
            // let url = "http://localhost:8002/isochrone";
            let request = json!({
                "locations":[{"lat": destination.lat, "lon": destination.lon}],
                "costing": transport_mode,
                "contours":[{"time":destination.time.num_minutes()}]
            });
            println!("[RUST] Running request to {} with json {}", url, json!(request));
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
            let collection: GeometryCollection<f64> = quick_collection(&geojson).unwrap();
            let geometry: &Geometry<f64> = &collection[0];
            let polygon = match geometry {
                Geometry::LineString(line) => Polygon::new(line.clone(), vec![]),
                _ => return Err(ORSError::new(format!("Can't match polygon in the struct: {:?}", geometry).as_str())),
            };
            let isochrone = Isochrone { id: destination.id.to_string(), mode: transport_mode.to_string(),  polygon: polygon };
            res.push(isochrone);
        }
    }
    return Ok(res);
}
