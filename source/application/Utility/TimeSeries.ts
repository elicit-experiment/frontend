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

function postTimeSeriesAsJson(body: any, seriesType: string) {
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
export { postTimeSeriesAsFile, postTimeSeriesAsJson, postTimeSeriesRawAsJson, postTimeSeriesRawAsMsgPack };
