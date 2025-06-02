import Configuration from 'Managers/Configuration';
import * as msgpack from 'msgpack-lite';

function postTimeSeriesAsFile(tsv: string, seriesType: string, sessionGuid: string) {
  if (sessionGuid === '') console.error('no session GUID');

  return new Promise((resolve, reject) => {
    const url = new URL(`/v6/time_series/${seriesType}/file`, Configuration.PortalPath);
    const formData = new FormData();
    formData.append('seriesType', seriesType);
    formData.append('sessionGUID', sessionGuid);
    formData.append('file', new Blob([tsv], { type: 'text/tab-separated-values' }), `#{seriesType}.tsv`);

    fetch(url.href, {
      method: 'POST',
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
      body: formData,
    })
      .then((rawResponse) => {
        if (rawResponse.ok) {
          return rawResponse;
        } else {
          throw Error(`Request rejected with status ${rawResponse.status}`);
        }
      })
      .then((rawResponse) => rawResponse.json())
      .then((json) => resolve(json))
      .catch((err) => reject(err));
  });
}

function postTimeSeriesAsJson(body: object | Array<object>, seriesType: string) {
  const jsonString = JSON.stringify(body);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const readableStream = blob.stream();

  const compressedReadableStream = readableStream.pipeThrough(new CompressionStream('gzip'));
  const url = new URL(`/v6/time_series/${seriesType}`, Configuration.PortalPath);

  return new Promise(async (resolve, reject) => {
    console.log(`TimeSeries: Sending points to ${url.href}`);
    const compressedResponse = new Response(compressedReadableStream);
    const timeSeriesBlob = await compressedResponse.blob();
    fetch(url.href, {
      method: 'POST',
      //credentials: 'include', // include the sessionGUID cookie
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      credentials: 'include',
      body: timeSeriesBlob,
    })
      .then((rawResponse) => {
        if (rawResponse.ok) {
          return rawResponse;
        } else {
          throw Error(`Request rejected with status ${rawResponse.status}`);
        }
      })
      .then((rawResponse) => rawResponse.json())
      .then((json) => resolve(json))
      .catch((err) => reject(err));
  });
}

function postTimeSeriesRawAsJson(seriesType: string, sessionGuid: string, body: Array<object> | string) {
  const jsonString = typeof body === 'string' ? body : body.map((row) => JSON.stringify(row)).join('\n') + '\n'; // NDJSON
  const rawBytes = jsonString.length;

  const blob = new Blob([jsonString], { type: 'application/json' });
  const readableStream = blob.stream();

  const compressedReadableStream = readableStream.pipeThrough(new CompressionStream('gzip'));
  const url = new URL(`/v6/time_series/${seriesType}/file_raw`, Configuration.PortalPath);

  return new Promise(async (resolve, reject) => {
    console.log(`TimeSeries: Sending points to ${url.href}`);
    const compressedResponse = new Response(compressedReadableStream);
    const timeSeriesBlob = await compressedResponse.blob();
    const compressedBytes = timeSeriesBlob.size;

    fetch(url.href, {
      method: 'POST',
      //credentials: 'include', // include the sessionGUID cookie
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-CHAOS-SESSION-GUID': sessionGuid,
      },
      credentials: 'include',
      body: timeSeriesBlob,
    })
      .then((rawResponse) => {
        if (rawResponse.ok) {
          return rawResponse;
        } else {
          throw Error(`Request rejected with status ${rawResponse.status}`);
        }
      })
      .then((rawResponse) => rawResponse.json())
      .then((json) => {
        resolve({ ...json, rawBytes, compressedBytes });
      })
      .catch((err) => reject(err));
  });
}

// Create a stream that emits each object as a JSON line (NDJSON format)
function createNDJSONStream(body: Array<object | string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const newline = encoder.encode('\n');

  return new ReadableStream({
    start(controller) {
      // Process each object one at a time
      body.forEach((item) => {
        if (typeof item === 'string') {
          controller.enqueue(encoder.encode(item));
        } else {
          // Convert the object to a JSON string and add a newline
          const jsonString = JSON.stringify(item);
          controller.enqueue(encoder.encode(jsonString));
          controller.enqueue(newline);
        }
      });

      // Signal that we're done
      controller.close();
    },
  });
}

// Apply gzip compression to a stream
function compressStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return stream.pipeThrough(new CompressionStream('gzip'));
}

// Stream data to the server
async function streamToServer(
  stream: ReadableStream<Uint8Array>,
  url: URL,
  headers: HeadersInit,
  method = 'POST',
): Promise<[object, number, number]> {
  try {
    const compressedResponse = new Response(stream);
    const timeSeriesBlob = await compressedResponse.blob();
    const compressedBytes = timeSeriesBlob.size;

    const response = await fetch(url.href, {
      method,
      mode: 'cors',
      headers,
      credentials: 'include',
      body: timeSeriesBlob,
      // streaming is not widely supported, i.e. not on Firefox.
      // body: stream,
      // duplex: 'half',
    });

    if (!response.ok) {
      throw new Error(`Request rejected with status ${response.status}`);
    }

    return [(await response.json()) as object, compressedBytes, compressedBytes];
  } catch (err) {
    throw err;
  }
}

// Calculate the size of a stream (for metrics)
async function calculateStreamSize(stream: ReadableStream<Uint8Array>): Promise<number> {
  // Clone the stream so we don't consume it
  const clonedStream = stream.tee()[0];

  // Read all data and count bytes
  const reader = clonedStream.getReader();
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return size;
}

// Refactored version using composable stream pipelines
function postTimeSeriesRawAsJsonStream(
  seriesType: string,
  sessionGuid: string,
  body: Array<object | string> | ReadableStream<Uint8Array>,
  compress = true,
): Promise<object> {
  if (!sessionGuid) {
    console.error('Session GUID is required.');
    return Promise.reject('Session GUID is required.');
  }

  // Handle different input types
  let dataStream: ReadableStream<Uint8Array>;
  if (body instanceof ReadableStream) {
    dataStream = body;
  } else if (Array.isArray(body)) {
    if (body.length === 0) {
      return Promise.reject('Empty array provided');
    }
    dataStream = createNDJSONStream(body);
  } else {
    return Promise.reject('Invalid input type');
  }

  // Apply compression if requested
  if (compress) {
    dataStream = compressStream(dataStream);
  }

  // Construct the URL
  const url = new URL(`/v6/time_series/${seriesType}/file_raw`, Configuration.PortalPath);

  // Set up the headers
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CHAOS-SESSION-GUID': sessionGuid,
  };

  // Add Content-Encoding header if compressed
  if (compress) {
    headers['Content-Encoding'] = 'gzip';
  }

  // console.log(`TimeSeries: Streaming points to ${url.href}`);

  // Stream the data and return the result
  return streamToServer(dataStream, url, headers);
}

function postTimeSeriesRawAsMsgPack(seriesType: string, sessionGuid: string, body: Array<object>) {
  if (!sessionGuid) {
    console.error('Session GUID is required.');
    return Promise.reject('Session GUID is required.');
  }

  // Create a Blob with MessagePack data
  const blob = new Blob(
    body.map((datum: object) => msgpack.encode(datum)),
    { type: 'application/vnd.msgpack' },
  );

  // Create a readable stream from the Blob
  const readableStream = blob.stream();

  // Compress the stream using gzip
  const compressedReadableStream = readableStream.pipeThrough(new CompressionStream('gzip'));

  // Construct the API endpoint URL
  const url = new URL(`/v6/time_series/${seriesType}/file_raw`, Configuration.PortalPath);

  return new Promise(async (resolve, reject) => {
    try {
      console.log(`TimeSeries: Sending points to ${url.href}`);

      // Convert the compressed stream to a Blob for inclusion in the fetch body
      const compressedResponse = new Response(compressedReadableStream);
      const timeSeriesBlob = await compressedResponse.blob();

      // Perform the HTTP POST request
      const response = await fetch(url.href, {
        method: 'POST',
        mode: 'cors', // no-cors, cors, *same-origin
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/vnd.msgpack',
          'Content-Encoding': 'gzip',
          'X-CHAOS-SESSION-GUID': sessionGuid,
        },
        credentials: 'include',
        body: timeSeriesBlob,
      });

      // Check if the response is OK and resolve/reject accordingly
      if (response.ok) {
        const jsonResponse = await response.json();
        resolve(jsonResponse);
      } else {
        reject(new Error(`Request rejected with status ${response.status}`));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export {
  postTimeSeriesAsFile,
  postTimeSeriesAsJson,
  postTimeSeriesRawAsJson,
  postTimeSeriesRawAsMsgPack,
  postTimeSeriesRawAsJsonStream,
  createNDJSONStream,
  compressStream,
  streamToServer,
};
