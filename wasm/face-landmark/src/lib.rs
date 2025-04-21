use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use js_sys::{Array, Object};
use serde_json;

mod wasm_utils;
pub use wasm_utils::*;

const QUANTIZE_AMOUNT: f64 = 100000.0;

// Quantize to 6 significant figures, as an integer without a decimal place.
// This is done to save bytes over the wire and at-rest.
fn quantize(value: f64) -> i32 {
    if QUANTIZE_AMOUNT > 0.0 {
        (value * QUANTIZE_AMOUNT).round() as i32
    } else {
        value as i32
    }
}

#[derive(Serialize, Deserialize)]
pub struct NormalizedLandmark {
    x: f64,
    y: f64,
    z: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct NormalizedLandmarkComponentConfig {
    FaceTransformation: bool,
    Landmarks: bool,
    Blendshapes: bool,
    StripZCoordinates: bool,
}

#[derive(Serialize, Deserialize)]
pub struct FaceLandmarkerResult {
    faceLandmarks: Option<Vec<Vec<NormalizedLandmark>>>,
    facialTransformationMatrixes: Option<Vec<TransformationMatrix>>,
    faceBlendshapes: Option<Vec<Classifications>>,
}

#[derive(Serialize, Deserialize)]
pub struct Classifications {
    categories: Vec<Category>,
}

#[derive(Serialize, Deserialize)]
pub struct Category {
    score: f64,
    index: i32,
    categoryName: String,
}

#[derive(Serialize, Deserialize)]
pub struct TransformationMatrix {
    data: Vec<f64>,
}

#[derive(Serialize)]
pub struct CompressedNormalizedLandmark {
    p: Vec<i32>,
    z: bool,
}

#[derive(Serialize)]
pub struct CompressedClassifications {
    s: Vec<i32>,
    i: Vec<i32>,
    c: Vec<i32>,
}

#[derive(Serialize)]
pub struct CompressedFaceLandmarkerResult {
    #[serde(rename = "l", skip_serializing_if = "Option::is_none")]
    landmarks: Option<Vec<CompressedNormalizedLandmark>>,
    #[serde(rename = "b", skip_serializing_if = "Option::is_none")]
    blendshapes: Option<Vec<CompressedClassifications>>,
    #[serde(rename = "m", skip_serializing_if = "Option::is_none")]
    matrices: Option<Vec<Vec<f64>>>,
    t: f64,
    dt: f64,
}

#[wasm_bindgen(js_name = "compress_datapoint")]
pub fn compress_datapoint(
    config_js: JsValue, 
    datapoint_js: JsValue, 
    timestamp: f64,
    toJson: bool
) -> Result<JsValue, JsValue> {
    // Convert JS objects to Rust structs
    let config: NormalizedLandmarkComponentConfig = serde_wasm_bindgen::from_value(config_js)?;
    let datapoint: FaceLandmarkerResult = serde_wasm_bindgen::from_value(datapoint_js)?;
    
    // Check if data is valid
    if config.FaceTransformation && datapoint.facialTransformationMatrixes.is_none() {
        return Ok(JsValue::NULL);
    }
    
    // Process transformation matrices
    let mut result_matrix = None;
    if config.FaceTransformation && datapoint.facialTransformationMatrixes.is_some() {
        let matrices = datapoint.facialTransformationMatrixes.unwrap();
        result_matrix = Some(matrices.into_iter().map(|m| m.data).collect());
    }
    
    // Process landmarks
    let mut result_landmarks = None;
    if datapoint.faceLandmarks.is_none() {
        return Ok(JsValue::NULL);
    }
    
    if config.Landmarks && datapoint.faceLandmarks.is_some() {
        let landmarks = datapoint.faceLandmarks.unwrap();
        result_landmarks = Some(landmarks.into_iter().map(|landmarks_set| {
            let mut points = Vec::new();
            for val in landmarks_set {
                points.push(quantize(val.x));
                points.push(quantize(val.y));
                if !config.StripZCoordinates {
                    if let Some(z) = val.z {
                        points.push(quantize(z));
                    }
                }
            }
            
            CompressedNormalizedLandmark {
                z: !config.StripZCoordinates,
                p: points,
            }
        }).collect());
    }
    
    // Process blendshapes
    let mut result_blendshapes = None;
    if datapoint.faceBlendshapes.is_none() {
        return Ok(JsValue::NULL);
    }
    
    if config.Blendshapes && datapoint.faceBlendshapes.is_some() {
        let blendshapes = datapoint.faceBlendshapes.unwrap();
        result_blendshapes = Some(blendshapes.into_iter().map(|classifications| {
            let scores = classifications.categories.iter().map(|c| quantize(c.score)).collect();
            let indices = classifications.categories.iter().map(|c| c.index).collect();
            
            // Get category indices from names
            // In a real implementation, you would need the BLENDSHAPE_CATEGORY_INDICES mapping
            // Here we're returning the index directly for simplicity
            let categories = classifications.categories.iter().map(|c| {
                // In JavaScript, we'd look up the index from the name
                // Here we're just using the index directly
                c.index
            }).collect();
            
            CompressedClassifications {
                s: scores,
                i: indices,
                c: categories,
            }
        }).collect());
    }
    
    // Calculate timestamps
    let t = timestamp;
    let dt = js_sys::Date::now() - t;
    
    // Create result
    let result = CompressedFaceLandmarkerResult {
        landmarks: result_landmarks,
        blendshapes: result_blendshapes,
        matrices: result_matrix,
        t,
        dt,
    };
    
    if toJson {
        // Serialize result to JSON string
        let json_str = serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?
            + "\n";
        Ok(JsValue::from_str(&json_str))
    } else {
        // Convert result to JS object
        Ok(serde_wasm_bindgen::to_value(&result)?)
    }
}
