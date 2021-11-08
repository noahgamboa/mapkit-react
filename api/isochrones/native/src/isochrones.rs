use std::error::Error;
use std::fmt;
use neon::result::Throw;
use geo_types::Polygon;

#[derive(Debug)]
pub struct ORSError {
    pub details: String
}

impl ORSError {
    pub fn new(msg: &str) -> ORSError {
        ORSError{details: msg.to_string()}
    }
}

impl fmt::Display for ORSError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f,"{}",self.details)
    }
}

impl Error for ORSError {
    fn description(&self) -> &str {
        &self.details
    }
}

impl From<reqwest::Error> for ORSError {
    fn from(err: reqwest::Error) -> Self {
        ORSError::new(&err.to_string())
    }
}

impl From<ORSError> for String {
    fn from(err: ORSError) -> Self {
        return err.to_string();
    }
}

impl From<Throw> for ORSError {
    fn from(throw: Throw) -> Self {
        ORSError::new(format!("JS Throw! {}", throw).as_str())
    }
}

impl From<serde_json::Error> for ORSError {
    fn from(err: serde_json::Error) -> Self {
        ORSError::new(format!("serde_json error! {}", err).as_str())
    }
}


#[derive(Debug)]
pub struct Isochrone {
    pub id: String,
    pub mode: String,
    pub polygon: Polygon<f64>
}
