// Helper functions for the WASM module
use wasm_bindgen::prelude::*;

// Performance timing for debugging
#[wasm_bindgen]
pub fn get_performance_now() -> f64 {
    let window = web_sys::window().expect("should have a window in this context");
    let performance = window.performance().expect("performance should be available");
    performance.now()
}

// Memory info for debugging
#[wasm_bindgen]
pub fn memory_info() -> JsValue {
    let mem_info = js_sys::Object::new();

    // Get memory information from the browser
    if let Some(window) = web_sys::window() {
        if let Some(performance) = window.performance() {
            if let Ok(memory) = js_sys::Reflect::get(&performance, &JsValue::from_str("memory")) {
                // Return the memory object if available
                return memory;
            }
        }
    }

    // Return empty object if not available
    mem_info.into()
}

// Add timestamp to object for benchmarking
#[wasm_bindgen]
pub fn add_timestamp(obj: &js_sys::Object, name: &str) -> js_sys::Object {
    let performance = web_sys::window()
        .expect("window")
        .performance()
        .expect("performance");
    
    let time = performance.now();
    js_sys::Reflect::set(obj, &JsValue::from_str(name), &JsValue::from_f64(time)).unwrap();
    
    obj.clone()
}
