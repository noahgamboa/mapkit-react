use neon::prelude::*;
use std::collections::HashSet;
use std::collections::HashMap;
use crate::ors_helpers::ORSError;
use chrono::Duration;

#[derive(Debug)]
pub struct Destination {
    pub lat: f64,
    pub lon: f64,
    pub walk: bool,
    pub bike: bool,
    pub drive: bool,
    pub transit: bool,
    pub time: Duration,
    pub id: String
}

#[derive(Debug)]
pub struct Group {
    pub id: String,
    pub destinations: HashSet<String>
}


pub fn get_destinations(cx: &mut FunctionContext, destinations_js: Handle<JsObject>) -> Result<HashMap<String, Destination>, ORSError> {
    let destination_property_names = destinations_js.get_own_property_names(cx)?;
    let destination_property_names = destination_property_names.to_vec(cx)?;

    let destinations: Result<Vec<Destination>, _> = destination_property_names
        .iter()
        .map(|js_dest_id| {
            let dest_id = js_dest_id
                .downcast::<JsString>()
                // If downcast fails, default to using 0
                .unwrap_or(cx.string(""));
                // Get the value of the unwrapped value
            let destination     = destinations_js.get(cx, dest_id)?.downcast::<JsObject>().unwrap();
            let coordinate      = destination.get(cx, "coordinate")?.downcast::<JsObject>().unwrap();
            let lat: f64        = coordinate.get(cx, "latitude")?.downcast::<JsNumber>().unwrap().value();
            let lon: f64        = coordinate.get(cx, "longitude")?.downcast::<JsNumber>().unwrap().value();
            let transport_modes = destination.get(cx, "transportModes")?.downcast::<JsObject>().unwrap();
            let walk: bool      = transport_modes.get(cx, "walk")?.downcast::<JsBoolean>().unwrap().value();
            let bike: bool      = transport_modes.get(cx, "bike")?.downcast::<JsBoolean>().unwrap().value();
            let drive: bool     = transport_modes.get(cx, "drive")?.downcast::<JsBoolean>().unwrap().value();
            let transit: bool   = transport_modes.get(cx, "transit")?.downcast::<JsBoolean>().unwrap().value();
            let time: f64       = destination.get(cx, "transitTime")?.downcast::<JsNumber>().unwrap().value();
            if time.fract() != 0.0 {
                return Err(ORSError::new("time must be an integral value"));
            }
            let id: String      = destination.get(cx, "id")?.downcast::<JsString>().unwrap().value();
            let destination = Destination { lat: lat, lon: lon, walk: walk, bike: bike, drive: drive, transit: transit, time: Duration::minutes(time as i64), id: id };
            return Ok(destination);
        }).collect();
    let destinations = match destinations {
        Ok(destinations) => destinations,
        Err(err) => return Err(err),
    };
    let mut destinations_map = HashMap::new();
    for destination in destinations {
        let id = destination.id.clone();
        destinations_map.insert(id, destination);
    }
    return Ok(destinations_map);
}

pub fn get_groups(cx: &mut FunctionContext, groups_js: Handle<JsObject>) -> Option<Vec<Group>> {
    let group_property_names = groups_js.get_own_property_names(cx);
    let group_property_names = match group_property_names {
        Ok(names) => names,
        Err(_) => return None,
    };
    let group_property_names = group_property_names.to_vec(cx);
    let group_property_names = match group_property_names {
        Ok(names) => names,
        Err(_) => return None,
    };

    let groups: Vec<Group> = group_property_names
        .iter()
        .filter_map(|js_group_id| {
            let group_id = js_group_id
                .downcast::<JsString>()
                // If downcast fails, default to using 0
                .unwrap_or(cx.string(""));
                // Get the value of the unwrapped value
            let group = groups_js.get(cx, group_id).ok()?
                                                   .downcast::<JsObject>().unwrap();
            let id: String = group.get(cx, "id").ok()?
                                         .downcast::<JsString>().unwrap().value();
            let destinations = group.get(cx, "destinationIds").ok()?
                                    .downcast::<JsObject>().unwrap();
            let destinations = destinations.get_own_property_names(cx).ok()?.to_vec(cx).ok()?;
            let mut destinations_set: HashSet<String> = HashSet::new();
            for destination_id in destinations {
                let destination_id = destination_id.downcast::<JsString>().unwrap().value();
                destinations_set.insert(destination_id);
            }
            let group = Group { id: id, destinations: destinations_set };
            return Some(group);
        }).collect();
    return Some(groups);
}

pub fn get_token(_cx: &mut FunctionContext, token_js: Handle<JsString>) -> Option<String> {
            let token: String = token_js.downcast::<JsString>().unwrap().value();
            return Some(token);
}
