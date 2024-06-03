import Configuration from 'Managers/Configuration';

function postTimeSeriesAsFile(tsv: string, seriesType: string, sessionGuid: string) {
  if (sessionGuid === '') console.error('no session GUID');

  return new Promise((resolve, reject) => {
    const url = new URL(`/v6/time_series/${seriesType}/file`, Configuration.PortalPath);
    const formData = new FormData();
    formData.append('seriesType', seriesType);
    formData.append('sessionGUID', sessionGuid);
    formData.append('file', new Blob([tsv]), 'file');

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
  return new Promise((resolve, reject) => {
    const url = new URL(`/v6/time_series/${seriesType}`, Configuration.PortalPath);
    console.log(`MouseTrackingManager: Sending points to ${url.href}`);
    fetch(url.href, {
      method: 'POST',
      //credentials: 'include', // include the sessionGUID cookie
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
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

export { postTimeSeriesAsFile, postTimeSeriesAsJson };
