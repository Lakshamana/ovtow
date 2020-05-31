function authDrive() {
  const base = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = {
    client_id:
      "507116598248-19pjssod2ij6auhoq0fknkgoqsippt8s.apps.googleusercontent.com",
    redirect_uri: "http://localhost:5500",
    scope: "https://www.googleapis.com/auth/drive",
    response_type: "token",
    state: Math.random().toString(36)
  };
  const uriParams = new URLSearchParams();
  for (const i in params) {
    uriParams.set(i, params[i]);
  }
  window.location = base + "?" + uriParams.toString();
}

function displayContent() {
  const token = sessionStorage.getItem("token");
  const query = new URLSearchParams(window.location.search);
  if (token || query.has("access_token")) {
    if (!token) {
      const token = query.get("access_token");
      sessionStorage.setItem("token", token);
    }
    app.innerHTML = `
  <label for="ipt-files">Send a file to Drive</label>
		<br>
  <input id="ipt-files" type="file" name="files" oninput="uploadFile(event)">`;
  }
}

function runAnimation(delay) {
  const animation = ["-", "\\", "|", "/"];
  const app = document.getElementById("app");
  let i = 0;
  return setInterval(() => {
    const animStep = animation[i % animation.length];
    app.innerHTML = "Uploading... " + animStep;
    ++i;
  }, delay);
}

async function uploadFile(e) {
  const token = sessionStorage.getItem("token");
  const interval = runAnimation(100);
  const headers = {
    Authorization: 'Bearer ' + token
  }
  let response
  try {
    response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers
    })
  } catch (e) {
    throw e
  }
  const sessionUri = response.headers.get('location')
  const reader = new FileReader()
  /**
   * @type {File} file
   */
  const file = e.target.files[0];
  let loaded = 0
  const step = 256 * 1024 // 256KB step
  const { size } = file
  let chunk = file.slice(loaded, step)
  reader.readAsBinaryString(chunk)
  const status = document.getElementById('upload-status')
  reader.onload = () => {
    const chunkSize = chunk.size
    // const upperBound = loaded + chunkSize - +(loaded + chunkSize < size)
    fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${loaded}-${loaded + chunkSize - 1}/${size}`,
        ...headers
      },
      body: chunk
    }).then(res => {
      loaded += step
      if (loaded < size && res.status === 308) {
        chunk = file.slice(loaded, loaded + step)
        reader.readAsBinaryString(chunk)
        status.innerHTML = (loaded * 100 / size).toFixed(2) + '%'
      } else {
        console.log(loaded, size)
        app.innerHTML = 'Upload Completed!'
        status.innerHTML = ''
        setTimeout(() => {
          displayContent()
        }, 1000)
        clearInterval(interval)
      }
    }).catch(res => {
      throw res
    })
  }
}
