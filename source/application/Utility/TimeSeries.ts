import Configuration from 'Managers/Configuration';

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

function postTimeSeriesRawAsJson(seriesType: string, sessionGuid: string, body: Array<object>) {
  const jsonString = body.map((row) => JSON.stringify(row)).join('\n'); // NDJSON

  const blob = new Blob([jsonString], { type: 'application/json' });
  const readableStream = blob.stream();

  const compressedReadableStream = readableStream.pipeThrough(new CompressionStream('gzip'));
  const url = new URL(`/v6/time_series/${seriesType}/file_raw`, Configuration.PortalPath);

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
      .then((json) => resolve(json))
      .catch((err) => reject(err));
  });
}

export { postTimeSeriesAsFile, postTimeSeriesAsJson, postTimeSeriesRawAsJson };
