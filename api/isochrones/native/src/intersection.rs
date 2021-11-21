extern crate geo_booleanop;
extern crate geo_types;

use std::collections::HashSet;
use std::collections::HashMap;
use crate::js_helpers::Group;
use crate::isochrones::{ORSError, Isochrone};
use geo_booleanop::boolean::BooleanOp;
use geo_types::{MultiPolygon};

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
