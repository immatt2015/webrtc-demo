class RTC {
    constructor(type) {
        this.type = type;
        var servers = {
            'iceServers': [{
                'url': 'stun:stun.fwdnet.net'
            }, {
                'url': 'stun:stun.example.org'
            }]
        };
        var pcConstraints = {
            'optional': []
        };

        var pc = new window.RTCPeerConnection(servers, pcConstraints);
        this.rtc = pc;
    }

    __init() {
        this.rtc.onicecandidate = function (event) {
            utils.log(utils.ioType)('on ice candidate');
            if (event.candidate) {
                socket.emit('_candidate', {type: this.type, candidate:event.candidate});
                utils.log(utils.ioType)('emit _candidate');
            }
        };

        this.rtc.onerror = function (e) {
            console.log(e, 'on_error');
        };
    }

    __init_media() {
        var v_local = document.getElementById('c_video_local');
        var v_remote = document.getElementById('c_video_remote');

        this.rtc.onaddstream = function (e) {
            console.log(e);
            utils.log(utils.ioType)('on add stream');
            v_local.srcObject = stream;
            v_remote.srcObject = e.stream;
        };
    }

    __init_channel() {
        this.rtc.ondatachannel = function (e) {
            console.log(e);
            var dc = e.channel;
            utils.log(utils.ioType)('on_data_channel');

            dc.onmessage = function (evt) {
                utils.log(utils.ioType)('on_msg');
                console.log(evt);
                // 文件相关
            };
            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
            };

        };
    }

    __init_msg(socket) {
        this.rtc.ondatachannel = function (e) {
            console.log(e);
            var dc = e.channel;
            utils.log(utils.ioType)('on_data_channel');

            document.querySelector('form#text-form input.sender').disabled = false;

            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
                document.querySelector('form#text-form input.sender').disabled = true;
            };

            dc.onmessage = function (evt) {
                var msg = JSON.parse(evt.data);
                var t = document.createTextNode('>> ' +msg.username + ': ' + msg.content);
                var p = document.createElement('p');
                p.appendChild(t);

                document.querySelector('div#msg-list').appendChild(p);
            };
            return dc;
        };
    }

    setRemoteDescription(des) {
        let desc = new RTCSessionDescription((des));

        return this.rtc.setRemoteDescription(desc)
            .then(()=> {
                utils.log(utils.ioType)('set remote description');
            });
    }

    createOffer() {
        return this.rtc.createOffer()      // createOffer 过程
            .then((desc)=> {
                utils.log(utils.ioType)('create offer');
                return desc;
            })
            .then(function (desc) {
                return this.rtc.setLocalDescription(desc)
                    .then(()=> {
                        return desc;
                    });
            })
            .then((desc)=> {
                utils.log(utils.ioType)('set local description');
                return desc;
            })
            .then((desc)=> {
                console.log(desc);
                socket.emit('_offer', {type: this.type, desc: desc});
                utils.log(utils.ioType)('emit _offer');
            });
    }

    createAnswer(desc) {
        return setRemoteDescription(desc)
            .then(()=> {
                return this.rtc.createAnswer();
            })
            .then((desc)=> {
                utils.log(utils.ioType)('create answer');
                return desc;
            })
            .then((desc)=> {
                return this.rtc.setLocalDescription(desc)
                    .then(()=> {
                        return desc;
                    });
            })
            .then((desc)=> {
                utils.log(utils.ioType)('set local description');
                return desc;
            })
            .then((desc)=> {
                utils.log(utils.ioType)(' emit _answer');
                this.socket.emit('_answer', {type: this.type, desc: desc});
            });
    }

    addCandidate(desc) {
        var cand = new window.RTCIceCandidate(candidate);
        pc.addIceCandidate(cand).then((d)=> {
            utils.log(utils.ioType)('addIceCandidate');
        })
    }

    destory() {

    }

}