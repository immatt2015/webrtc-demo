'use strict';

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
var ioType = undefined;   //发起角色 in 被发起者, out 发起者

window.onload = function () {
    var username = undefined;
    do {
        username = (new Date() / 1000).toString() //|| prompt('输入昵称');
    } while (username !== null && username.trim().length < 1);
    if (!username) {
        alert('取消通信');
        return false;
    }

    var v_local = document.getElementById('c_video_local');
    var v_remote = document.getElementById('c_video_remote');
    var c_list = document.getElementById('c_list');
    var c_video = document.getElementById('s-video');
    var c_audio = document.getElementById('s-audio');
    var s_media = document.getElementById('stop-media');

    function callOut(evt) {
        socket.emit('call_out', evt.target.id);
        log()('emit call_out');
    }


    var socket = io();
    var pc = new WebRTC();

    socket.on('connect', () => {   // socket 连接建立, 连接按钮不可用
        c_video.disabled = false;
        c_audio.disabled = false;
        s_media.disabled = false;
    });

    socket.on('list', (list) => {  // 服务器推送在线名单, 更新联系人列表
        c_list.innerHTML = null;
        for (let i = 0, l = list.length; i < l; i++) {
            let li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#';
            a.id = list[i][0];
            a.innerHTML = list[i][1];
            li.className = 'user-list';
            li.appendChild(a);
            c_list.appendChild(li);
            li = null;
        }
        let ls = document.getElementsByClassName('user-list');
        for (let i = 0, l = ls.length; i < l; i++) {
            ls[i].onclick = callOut;
        }
    });

    socket.on('disconnect', () => {    // socket 断开连接, 连接按钮恢复可用
        c_video.disabled = false;
        c_audio.disabled = false;
        s_media.disabled = false;
    });

    socket.emit('join', username);
    document.querySelector('span#my-name').innerText = username;

    socket.on('refused', () => {                // 发起方 处理接收方的拒绝事件
        alert('连接被拒！');
        return false;
    });
    socket.on('accept', (user_id) => {          // 发起方 处理接收方同意事件
        ioType = 'out';

        return pc.createChannel('msg', null)
            .then((channel) => {
                document.querySelector('form#text-form input.sender').onclick = function (e) {
                    var content = document.querySelector('form#text-form input.form-input').value;
                    var msg = { username: username, content: content };
                    channel.send(JSON.stringify(msg));
                    var t = document.createTextNode('<< 自己 : ' + msg.content);
                    var p = document.createElement('p');
                    p.appendChild(t);

                    document.querySelector('div#msg-list').appendChild(p);
                };
            });
    });

    socket.on('call_in', (user_id) => {            // 接收方 处理发起方的发起请求
        if (!confirm('接受 ' + user_id + ' 的连接')) {
            socket.emit('refused', user_id);
            log()(' emit _refused');
            return false;
        }

        socket.emit('accept', user_id);
        log()('accpet');

        return pc.createChannel('msg', null)
            .then((channel) => {
                document.querySelector('form#text-form input.sender').onclick = function (e) {
                    var content = document.querySelector('form#text-form input.form-input').value;
                    var msg = { username: username, content: content };
                    channel.send(JSON.stringify(msg));
                    var t = document.createTextNode('<< 自己 : ' + msg.content);
                    var p = document.createElement('p');
                    p.appendChild(t);

                    document.querySelector('div#msg-list').appendChild(p);
                };

                return pc.createOffer((desc) => {
                    socket.emit('msg_offer', desc);
                });
            });
    });

    socket.on('pause', (data) => {
        alert('对方终止连接');
        // 处理已存在的连接，， 去掉关联, 在peer 中也要进行处理
    })

    // 消息连接建立
    socket.on('msg_candidate', (candidate) => {       // 双方 处理candidate候选信息
        pc.addIceCandidate(candidate).then((d) => {
            log()('addIceCandidate');
        }).catch((e) => {
            console.log(e);
        });
    });
    socket.on('msg_offer', (desc) => {             // 接收方 处理处理发起方提交offer事件
        log()('msg_offer', desc);
        if (!desc) return false;

        return pc.createAnswer(desc)
            .then((desc) => {
                socket.emit('msg_answer', desc);
            })
            .catch(function (e) {
                console.log(e);
            });
    });
    socket.on('msg_answer', (desc) => {              // 发起方 处理接收方接受offer后的answer事件
        pc.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
            }).catch((e) => {
                console.log(e);
            });
    });

    // 音视频连接建立
    socket.on('meida_candidate', (candidate) => {       // 双方 处理candidate候选信息
        pc.addIceCandidate(candidate).then((d) => {
            log()('addIceCandidate');
        }).catch((e) => {
            console.log(e);
        });
    });
    socket.on('media_offer', (desc) => {             // 接收方 处理处理发起方提交offer事件
        log()('media_offer', desc);
        if (!desc) return false;

        return pc.createAnswer(desc)
            .then((desc) => {
                socket.emit('media_answer', desc);
            })
            .catch(function (e) {
                console.log(e);
            });
    });
    socket.on('media_answer', (desc) => {              // 发起方 处理接收方接受offer后的answer事件
        pc.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
            }).catch((e) => {
                console.log(e);
            });
    });

    // 文件传输

// RTC 事件注册
    pc.regIceCandidate((candidate) => {
        socket.emit('msg_candidate', candidate);
    });
    pc.regDataChannel((evt) => {
        if (typeof evt.data === 'string') {
            console.log(evt.data);
            var msg = JSON.parse(evt.data);
            var t = document.createTextNode('>> ' + msg.username + ': ' + msg.content);
            var p = document.createElement('p');
            p.appendChild(t);

            document.querySelector('div#msg-list').appendChild(p);
        }
    });



};

class WebRTC {
    constructor() {
        var pc = new window.RTCPeerConnection(servers, pcConstraints);
        this.pc = pc;
    }

    regStream(cb) {
        this.pc.onaddstream = function (e) {
            log()('on add stream');
            cb(e);
        };
    }

    regDataChannel(cb) {
        this.pc.ondatachannel = function (e) {
            console.log(e);
            var dc = e.channel;
            log()('on_data_channel');
            dc.onmessage = function (evt) {
                log()('on_msg');
                cb(evt);
            };

            dc.onerror = function (e) {
                console.log(e, 'on_error');
            };

            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
            };
        };
    }

    regIceCandidate(cb) {
        this.pc.onicecandidate = function (event) {
            log()('on ice candidate');
            if (event.candidate) {
                cb(event.candidate);
                log()('emit _candidate');
            }
        };
    }

    addIceCandidate(candidate) {
        var cand = new window.RTCIceCandidate(candidate);
        return this.pc.addIceCandidate(cand);
    }

    setRemoteDescription(des) {
        let desc = new window.RTCSessionDescription((des));

        return this.pc.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
                return;
            });
    }

    createOffer(cb) {
        var self = this;
        return self.pc.createOffer()      // createOffer 过程
            .then((desc) => {
                log()('create offer');
                return desc;
            })
            .then((desc) => {
                return this.pc.setLocalDescription(desc)
                    .then(() => {
                        return desc;
                    });
            })
            .then((desc) => {
                log()('set local description');
                return desc;
            })
            .then((desc) => {
                cb(desc);
                log()('emit _offer');
            });
    };

    createAnswer(desc) {
        return this.setRemoteDescription(desc)
            .then(() => {
                return this.pc.createAnswer();
            })
            .then((desc) => {
                log()('create answer');
                return desc;
            })
            .then((desc) => {
                return this.pc.setLocalDescription(desc)
                    .then(() => {
                        return desc;
                    });
            })
            .then((desc) => {
                log()('set local description');
                log()(' emit _answer');
                return desc;
            });
    };

    createChannel(name, encodeing) {
        return new Promise((res) => {
            var dc = this.pc.createDataChannel(name);
            if (encodeing) dc.binaryType = encodeing;

            log()('data channel');

            dc.onopen = function (evt) {
                log()('on_openchannel');
            };

            dc.onerror = function (e) {
                console.log(e, 'on_error');
            };

            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
            };
            return res(dc);
        });
    }

    addStream(localStream) {
        this.pc.addStream(localStream);
    }
};

var utils = {
    addMediaStream(video, audio, rtc) {
        return navigator.mediaDevices.getUserMedia({
            audio: audio,
            video: video
        })
            .then((localStream) => {
                rtc.addStream(localStream);
                log()('addstream');
                return localStream;
            });
    },

    sendFile(file, channel) {
        log()('status ', dc.readyState);
        var chuncksize = 1024;
        var filesize = file.size;
        var offset = 0;

        function send(e) {
            channel.send(e.target.result);
        }

        for (; ;) {
            let reader = new FileReader();
            reader.onload = send;

            let slice = file.slice(offset, offset + chuncksize);
            reader.readAsArrayBuffer(slice);

            offset = offset + chuncksize;
            if (offset > filesize) break;
        }
    }

};

function log() {
    let symbols;
    if ('in' === ioType) symbols = '>> ';
    if ('out' === ioType) symbols = '<< ';

    return console.log.bind(console, symbols);
}

