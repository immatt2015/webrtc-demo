'use strict';

var audio2 = document.querySelector('#audio2');
var audio1 = document.querySelector('#audio1');
var callButton = document.querySelector('#callButton');
var hangupButton = document.querySelector('#hangupButton');
var codecSelector = document.querySelector('#codec');
var pc1;
var pc2;
var localStream;

hangupButton.disabled = true;
callButton.onclick = function () {
  callButton.disabled = true;
  codecSelector.disabled = true;
  // trace('Starting call');
  var servers = null;
  var pcConstraints = {
    'optional': []
  };
  pc1 = new RTCPeerConnection(servers, pcConstraints);
  pc1.onicecandidate = function (event) {
    if (event.candidate) {
      pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
        function () {
          trace('AddIceCandidate success.');
        }
        , function (error) {
          trace('Failed to add ICE Candidate: ' + error.toString());
        }
      );
      trace('Local ICE candidate: \n' + event.candidate.candidate);
    }
  };
  pc2 = new RTCPeerConnection(servers, pcConstraints);
  pc2.onicecandidate = function (event) {
    if (event.candidate) {
      pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
        function () {
          trace('AddIceCandidate success.');
        }
        , function (error) {
          trace('Failed to add ICE Candidate: ' + error.toString());
        }
      );
      trace('Remote ICE candidate: \n ' + event.candidate.candidate);
    }
  };
  pc2.onaddstream = function (e) {
    audio1.srcObject = localStream;
    audio2.srcObject = e.stream;
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  }).then(gotStream).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
};
hangupButton.onclick = function () {
  // trace('Ending call');
  localStream.getTracks().forEach(function (track) {
    track.stop();
  });
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  codecSelector.disabled = false;
};

var offerOptions = {

};

function gotStream(stream) {
  hangupButton.disabled = false;
  localStream = stream;
  pc1.addStream(localStream);

  pc1.createOffer(function (desc) {
      pc1.setLocalDescription(desc, function () {
          pc2.setRemoteDescription(desc, function () {
              pc2.createAnswer(function (desc) {
                  pc2.setLocalDescription(desc, function () {
                      pc1.setRemoteDescription(desc, function () {
                        }, function (error) {
                          trace('Failed to set session description: ' + error.toString());
                        }
                      );
                    }, function (error) {
                      trace('Failed to set session description: ' + error.toString());
                    }
                  );
                }
                , function (error) {
                  trace('Failed to create session description: ' + error.toString());
                }
              );
            }, function (error) {
              trace('Failed to set session description: ' + error.toString());
            }
          );
        }, function (error) {
          trace('Failed to set session description: ' + error.toString());
        }
      );
    }
    , function (error) {
      trace('Failed to create session description: ' + error.toString());
    }
    ,
    offerOptions);
}