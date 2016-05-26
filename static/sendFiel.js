
function createConnection() {
  var servers = null;
  pcConstraint = null;

  // Add localConnection to global scope to make it visible
  // from the browser console.
  window.localConnection = localConnection = new RTCPeerConnection(servers,
      pcConstraint);
  trace('Created local peer connection object localConnection');

  sendChannel = localConnection.createDataChannel('sendDataChannel');
  sendChannel.binaryType = 'arraybuffer';
  trace('Created send data channel');

  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  localConnection.onicecandidate = iceCallback1;

  localConnection.createOffer().then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
  // Add remoteConnection to global scope to make it visible
  // from the browser console.
  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers,
      pcConstraint);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = receiveChannelCallback;

  fileInput.disabled = true;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function sendData() {
  var file = fileInput.files[0];

  // Handle 0 size files.
  statusMessage.textContent = '';
  downloadAnchor.textContent = '';

  var chunkSize = 16384;
  var sliceFile = function(offset) {
    var reader = new window.FileReader();
    reader.onload = (function() {
      return function(e) {
        sendChannel.send(e.target.result);
        if (file.size > offset + e.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        }
      };
    })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };
  sliceFile(0);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  if (receiveChannel) {
    receiveChannel.close();
    trace('Closed data channel with label: ' + receiveChannel.label);
  }
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  trace('Closed peer connections');

  // re-enable the file select
  fileInput.disabled = false;
}

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  trace('Offer from localConnection \n' + desc.sdp);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  trace('Answer from remoteConnection \n' + desc.sdp);
  localConnection.setRemoteDescription(desc);
}

function iceCallback1(event) {
  trace('local ice callback');
  if (event.candidate) {
    remoteConnection.addIceCandidate(
      event.candidate
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  trace('remote ice callback');
  if (event.candidate) {
    localConnection.addIceCandidate(
      event.candidate
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

  receivedSize = 0;
  bitrateMax = 0;
  downloadAnchor.textContent = '';
  downloadAnchor.removeAttribute('download');
  if (downloadAnchor.href) {
    URL.revokeObjectURL(downloadAnchor.href);
    downloadAnchor.removeAttribute('href');
  }
}

function onReceiveMessageCallback(event) {
  // trace('Received Message ' + event.data.byteLength);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;

  receiveProgress.value = receivedSize;

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  var file = fileInput.files[0];
  if (receivedSize === file.size) {
    var received = new window.Blob(receiveBuffer);
    receiveBuffer = [];

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = file.name;
    downloadAnchor.textContent =
      'Click to download \'' + file.name + '\' (' + file.size + ' bytes)';
    downloadAnchor.style.display = 'block';

    var bitrate = Math.round(receivedSize * 8 /
        ((new Date()).getTime() - timestampStart));
    bitrateDiv.innerHTML = '<strong>Average Bitrate:</strong> ' +
        bitrate + ' kbits/sec (max: ' + bitrateMax + ' kbits/sec)';

    if (statsInterval) {
      window.clearInterval(statsInterval);
      statsInterval = null;
    }

    closeDataChannels();
  }
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    sendData();
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
  if (readyState === 'open') {
    timestampStart = (new Date()).getTime();
    timestampPrev = timestampStart;
    statsInterval = window.setInterval(displayStats, 500);
    window.setTimeout(displayStats, 100);
    window.setTimeout(displayStats, 300);
  }
}