use neon::prelude::*;
use std::collections::HashSet;
use std::collections::HashMap;

#[derive(Debug)]
pub struct Destination {
    pub lat: f64,
    pub lon: f64,
    pub walk: bool,
    pub bike: bool,
    pub drive: bool,
    pub transit: bool,
    pub time: f64,
    pub id: String
}

#[derive(Debug)]
pub struct Group {
    pub id: String,
    pub destinations: HashSet<String>
}

pub fn get_destinations(cx: &mut FunctionContext, destinations_js: Handle<JsObject>) -> Option<HashMap<String, Destination>> {
    let destination_property_names = destinations_js.get_own_property_names(cx);
    let destination_property_names = match destination_property_names {
        Ok(names) => names,
        Err(_) => return None,
    };
    let destination_property_names = destination_property_names.to_vec(cx);
    let destination_property_names = match destination_property_names {
        Ok(names) => names,
        Err(_) => return None,
    };

    let destinations: Vec<Destination> = destination_property_names
        .iter()
        .filter_map(|js_dest_id| {
            let dest_id = js_dest_id
                .downcast::<JsString>()
                // If downcast fails, default to using 0
                .unwrap_or(cx.string(""));
                // Get the value of the unwrapped value
            let destination = destinations_js.get(cx, dest_id).ok()?
                                             .downcast::<JsObject>().unwrap();
            let coordinate = destination.get(cx, "coordinate").ok()?
                                        .downcast::<JsObject>().unwrap();
            let lat: f64 = coordinate.get(cx, "latitude").ok()?.downcast::<JsNumber>().unwrap().value();
            let lon: f64 = coordinate.get(cx, "longitude").ok()?.downcast::<JsNumber>().unwrap().value(); 

            let transport_modes = destination.get(cx, "transportModes").ok()?
                                             .downcast::<JsObject>().unwrap();
            let walk: bool = transport_modes.get(cx, "walk").ok()?
                                            .downcast::<JsBoolean>().unwrap().value();
            let bike: bool = transport_modes.get(cx, "bike").ok()?
                                            .downcast::<JsBoolean>().unwrap().value();
            let drive: bool = transport_modes.get(cx, "drive").ok()?
                                            .downcast::<JsBoolean>().unwrap().value();
            let transit: bool = transport_modes.get(cx, "transit").ok()?
                                            .downcast::<JsBoolean>().unwrap().value();

            let time: f64 = destination.get(cx, "transitTime").ok()?
                                       .downcast::<JsNumber>().unwrap().value();

            let id: String = destination.get(cx, "id").ok()?
                                        .downcast::<JsString>().unwrap().value();

            let destination = Destination { lat: lat, lon: lon, walk: walk, bike: bike, drive: drive, transit: transit, time: time, id: id };
            return Some(destination);
        }).collect();
    let mut destinations_map = HashMap::new();
    for destination in destinations {
        let id = destination.id.clone();
        destinations_map.insert(id, destination);
    }
    return Some(destinations_map);

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
