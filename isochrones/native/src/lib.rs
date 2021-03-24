extern crate geo_types;

use neon::prelude::*;
use neon::register_module;
use std::collections::HashMap;
use js_helpers::Destination;
use js_helpers::Group;
use ors_helpers::Isochrone;
use geojson::{Feature, GeoJson, Geometry, Value};

pub mod js_helpers;
pub mod ors_helpers;

fn get_destinations_for_mode(transport_mode: String, destinations: &HashMap<String,Destination>) -> Vec<&Destination> {
    return destinations.keys().filter_map(|key|  {
        let destination = &destinations[key];
        if transport_mode == "foot-walking" && destination.walk {
            return Some(destination);
        } else if transport_mode == "driving-car" && destination.drive {
            return Some(destination);
        } else if transport_mode == "cycling-regular" && destination.bike {
            return Some(destination);
        }
        return None;
    }).collect();
}

struct BackgroundTask {
    destinations: HashMap<String, Destination>,
    groups: Vec<Group>,
    token: String
}

impl Task for BackgroundTask {
    type Output = String;
    type Error = String;
    type JsEvent = JsString;
    fn perform(&self) -> Result<Self::Output, Self::Error> {
        // let destination_isochrones = HashMap<String, Isochrone>::new();
        let transport_modes: &'static [&'static str] = &["foot-walking", "driving-car", "cycling-regular"];
        let mut query_results = Vec::new();

        println!("destinations: {:?}", self.destinations);
        println!("groups:       {:?}", self.groups);
        println!("token:        {:?}", self.token);

        // For each transport mode... 
        for transport_mode in transport_modes {
            // get all the destinations with that transport mode
            let dests_in_mode = get_destinations_for_mode(transport_mode.to_string(), &self.destinations); 

            // if we don't have any destinations to query, return.
            if dests_in_mode.len() == 0 {
                continue;
            }

            // make the query with each destination and accumulate them into the map
            let query_result = ors_helpers::query_ors(transport_mode.to_string(), &self.token, &dests_in_mode)?;
            query_results.extend(query_result);
        }
        println!("query_results =  {:?}", query_results);


        let polygons = ors_helpers::get_isochrone_intersections(&self.groups, &query_results)?;

        let geometry = Geometry::new(geojson::Value::from(&polygons));
        let geojson = GeoJson::Feature(Feature {
            bbox: None,
            geometry: Some(geometry),
            id: None,
            properties: None,
            foreign_members: None,
        });

        let geojson_string = geojson.to_string();

        Ok(geojson_string)
    }

    fn complete(self, mut cx: TaskContext, result: Result<Self::Output, Self::Error>) -> JsResult<Self::JsEvent> {
        Ok(cx.string(result.unwrap()))
    }
}

fn generate_isochrones_async(mut cx: FunctionContext) -> JsResult<JsString> {

    let destinations_object_handle: Handle<JsObject> = cx.argument(0)?;
    let destinations_js = destinations_object_handle.downcast::<JsObject>()
                                                    .unwrap_or(JsObject::new(&mut cx));
    let destinations = match js_helpers::get_destinations(&mut cx, destinations_js) {
        Some(destinations) => destinations,
        None => return Ok(cx.string("destinations argument is malformed")),
    };
    let groups_object_handle: Handle<JsObject> = cx.argument(1)?;
    let groups_js = groups_object_handle.downcast::<JsObject>()
                                        .unwrap_or(JsObject::new(&mut cx));
    let groups = match js_helpers::get_groups(&mut cx, groups_js) {
        Some(groups) => groups,
        None => return Ok(cx.string("groups argument is malformed")),
    };

    let token_js: Handle<JsString> = cx.argument(2)?;
    let token: String  = match js_helpers::get_token(&mut cx, token_js) {
        Some(token) => token,
        None => return Ok(cx.string("token argument is malformed")),
    };

    let callback = cx.argument::<JsFunction>(3)?;
    let task = BackgroundTask { destinations: destinations, groups: groups, token: token };
    task.schedule(callback);
    Ok(cx.string("Scheduled."))
}

register_module!(mut cx, {
    cx.export_function("generateIsochrones", generate_isochrones_async)
});