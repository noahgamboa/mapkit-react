extern crate geo_types;

use neon::prelude::*;
use neon::register_module;
use std::collections::HashMap;
use js_helpers::Destination;
use js_helpers::Group;
use geojson::{Feature, GeoJson, Geometry};

pub mod js_helpers;
pub mod intersection;
pub mod valhalla_helpers;
pub mod isochrones;

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

        println!("[RUST] destinations: {:?}", self.destinations);
        println!("[RUST] groups:       {:?}", self.groups);
        println!("[RUST] token:        {:?}", self.token);

        let query_results = valhalla_helpers::query_valhalla(&self.destinations.values().collect(), &self.token)?;
        let polygons = intersection::get_isochrone_intersections(&self.groups, &query_results)?;
        let geometry = Geometry::new(geojson::Value::from(&polygons));
        let geojson = GeoJson::Feature(Feature {
            bbox: None,
            geometry: Some(geometry),
            id: None,
            properties: None,
            foreign_members: None,
        });
        let geojson_string = geojson.to_string();
        println!("[RUST] json result:  {:?}", geojson_string);
        Ok(geojson_string)
    }

    fn complete(self, mut cx: TaskContext, result: Result<Self::Output, Self::Error>) -> JsResult<Self::JsEvent> {
        let string = match result {
            Ok(value) => value,
            Err(error) => error
        };
        Ok(cx.string(string))
    }
}

fn generate_isochrones_async(mut cx: FunctionContext) -> JsResult<JsString> {

    let destinations_object_handle: Handle<JsObject> = cx.argument(0)?;
    let destinations_js = destinations_object_handle.downcast::<JsObject>()
                                                    .unwrap_or(JsObject::new(&mut cx));
    let destinations = match js_helpers::get_destinations(&mut cx, destinations_js) {
        Ok(destinations) => destinations,
        Err(err) => return Ok(cx.string(format!("destinations argument is malformed, error is {}", err).as_str())),
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
