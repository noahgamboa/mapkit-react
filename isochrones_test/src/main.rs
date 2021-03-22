use futures::executor::block_on;

#[tokio::main]
pub async fn query_ors() -> Result<String, reqwest::Error> {
    let url = "https://api.openrouteservice.org/v2/isochrones/".to_owned();
    println!("Running request...");
    let res = reqwest::Client::new()
        .post(url)
        .send()
        .await?
        .text()
        .await?;
    println!("text: {:?}", res);

    return Ok(res);
}

// fn main() {
// }


use std::collections::HashMap;

fn main() {
    let query_result = query_ors();
    let query_result = match query_result {
        Ok(result) => result,
        Err(error) => return 
    };
    println!("{}", query_result);
}
