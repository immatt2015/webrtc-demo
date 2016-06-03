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
    var p_media = document.getElementById('stop-media');
    var s_media = document.getElementById('start-media');
    var i_file = document.getElementById('file');
    var b_file = document.querySelector('form#file-form .sender');

    function callOut(evt) {
        socket.emit('call_out', evt.target.id);
        log()('emit call_out');
    }


    var socket = io();
    var msg_pc = new WebRTC();

    socket.on('connect', () => {   // socket 连接建立, 连接按钮不可用
        c_video.disabled = false;
        c_audio.disabled = false;
        s_media.disabled = false;
        p_media.disabled = true;
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
        // ioType = 'out';

        s_media.disabled = false;
        p_media.disabled = true;

        return msg_pc.createChannel('msg', null)
            .then((channel) => {
                channel.onopen = function () {
                    document.querySelector('form#text-form input.sender').onclick = function (e) {
                        var content = document.querySelector('form#text-form input.form-input').value;
                        var msg = { username: username, content: content };
                        channel.send(JSON.stringify(msg));
                        var t = document.createTextNode('<< 自己 : ' + msg.content);
                        var p = document.createElement('p');
                        p.appendChild(t);

                        document.querySelector('div#msg-list').appendChild(p);
                    };
                }
            })
            .catch((e) => {
                console.log(e);
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

        return msg_pc.createChannel('msg', null)
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

                return msg_pc.createOffer();
            })
            .then((desc) => {
                socket.emit('msg_offer', desc);
            })
            .catch((e) => {
                console.log(e);
            });
    });

    socket.on('pause', (data) => {
        alert('对方终止连接');
        // 处理已存在的连接，， 去掉关联, 在peer 中也要进行处理
    });



    // 消息连接建立
    socket.on('msg_candidate', (candidate) => {       // 双方 处理candidate候选信息
        msg_pc.addIceCandidate(candidate).then((d) => {
            log()('addIceCandidate');
        }).catch((e) => {
            console.log(e);
        });
    });
    socket.on('msg_offer', (desc) => {             // 接收方 处理处理发起方提交offer事件
        log()('msg_offer', desc);
        if (!desc) return false;

        return msg_pc.createAnswer(desc)
            .then((desc) => {
                socket.emit('msg_answer', desc);
            })
            .catch(function (e) {
                console.log(e);
            });
    });
    socket.on('msg_answer', (desc) => {              // 发起方 处理接收方接受offer后的answer事件
        msg_pc.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
            }).catch((e) => {
                console.log(e);
            });
    });

    // RTC 事件注册
    msg_pc.regIceCandidate((candidate) => {
        socket.emit('msg_candidate', candidate);
    });
    msg_pc.regDataChannel((evt) => {
        if (typeof evt.data === 'string') {
            // console.log(evt.data);
            var msg = JSON.parse(evt.data);
            var t = document.createTextNode('>> ' + msg.username + ': ' + msg.content);
            var p = document.createElement('p');
            p.appendChild(t);

            document.querySelector('div#msg-list').appendChild(p);
        }
    });


    // 音视频连接建立
    var media_pc_in = null;
    var media_pc_out = null;

    var media_pc = new WebRTC();

    media_pc.regStream((e) => {
        log()('on add stream');
        console.log('on_add_stream')
        v_remote.srcObject = e.stream;
    });

    media_pc.regIceCandidate((candidate) => {
        console.log('on_ice_candidate')
        socket.emit('media_candidate', candidate);
    });

    media_pc_in = media_pc_out = media_pc;

    s_media.onclick = function (evt) {     // 发起者发起音视频聊天
        if (!c_video.checked && !c_audio.checked) {
            alert('音频\视频 至少选择一项');
            return false;
        }

        ioType = 'out';

        socket.emit('media_start');
    };
    socket.on('media_start', () => {     // 接受者 接受请求， 并且创建媒体流
        if (!confirm('接受视频请求')) {
            socket.emit('media_refused');
        }

        ioType = 'in';

        socket.emit('media_accept');

    });


    socket.on('media_accept', () => {       // 发起者 建立媒体流， 并回应接受者媒体准备就绪的响应
        utils.getMediaStream(c_video.checked, c_audio.checked, media_pc_out)
            .then((localStream) => {
                v_local.srcObject = localStream;
                socket.emit('media_ready');
            })
            .catch((e) => {
                console.log(e);
            });
    });
    socket.on('media_refused', () => {
        alert('对方拒绝音视频');
    });
    socket.on('media_ready', () => {    // 接受者开始创建offer
        utils.getMediaStream(c_video.checked, c_audio.checked, media_pc_in)
            .then((localStream) => {
                v_local.srcObject = localStream;
                return media_pc_in.createOffer();
            })
            .then((desc) => {
                log()('media_offer');
                socket.emit('media_offer', desc);
            })
            .catch((e) => {
                console.log(e);
            });

    });
    socket.on('media_paused', () => {
        // end answer
        // end media
    });
    socket.on('media_candidate', (candidate) => {       // 双方 处理candidate候选信息
        (media_pc_out || media_pc_in).addIceCandidate(candidate)
            .then((d) => {
                log()('addIceCandidate');
            }).catch((e) => {
                console.log(e);
            });
    });
    socket.on('media_offer', (desc) => {             // 接收方 处理处理发起方提交offer事件
        log()('media_offer', desc);
        if (!desc) return false;

        return media_pc_out.createAnswer(desc)
            .then((desc) => {
                socket.emit('media_answer', desc);
            })
            .catch(function (e) {
                console.log(e);
            });
    });
    socket.on('media_answer', (desc) => {              // 发起方 处理接收方接受offer后的answer事件
        media_pc_in.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
            }).catch((e) => {
                console.log(e);
            });
    });





























    // 文件传输
    var file_pc = new WebRTC();

    file_pc.regDataChannel((e) => {
        log()('on datachannel');
        console.log('on_datachannel')
        console.log(e);
        console.log('receive hi');
        // 下载文件的逻辑
        utils.receiveFile(e);

    });

    file_pc.regIceCandidate((candidate) => {
        console.log('on_ice_candidate');
        socket.emit('file_candidate', candidate);
    });

    b_file.onclick = function (evt) {     // 发起者发起音视频聊天
        var file = i_file.files[0];
        if (!file) {
            alert('文件不能为空');
            return false;
        }
        socket.emit('file_start', file.name);
        console.log('file start');
    };
    socket.on('file_start', (file_name) => {     // 接受者  创建接受通道
        if (!confirm('对方发送一个<' + file_name + '>文件,是否接收?')) {
            socket.emit('file_refused');
            return false;
        }

        ioType = 'in';
        console.log('file accepts');

        return file_pc.createChannel('file', 'arraybuffer')
            .then((channel) => {
                console.log('create channel');

                socket.emit('file_accept');

                return file_pc.createOffer();
            })
            .then((desc) => {
                socket.emit('file_offer', desc);
            })
            .catch((e) => {
                console.log(e);
            });
    });


    socket.on('file_accept', () => {       //  发送文件  创建发送通道... 进行发送文件即可
        console.log('file accepted');
        return file_pc.createChannel('file', 'arraybuffer')
            .then((channel) => {
                // 发送文件
                socket.emit('')
                channel.onopen = function () {
                    channel.send('hi');
                    console.log('send hi');
                    return utils.sendFile(i_file.files[0], channel)
                    .then(()=>{
                        alert('done');
                    })
                    .catch((e)=>{
                        console.log(e);
                    })
                };
            })
            .catch((e) => {
                console.log(e);
            })
    });
    socket.on('file_refused', () => {
        alert('对方拒绝接收文件');
    });


    socket.on('file_candidate', (candidate) => {       // 双方 处理candidate候选信息
        file_pc.addIceCandidate(candidate)
            .then((d) => {
                log()('addIceCandidate');
            }).catch((e) => {
                console.log(e);
            });
    });
    socket.on('file_offer', (desc) => {             // 接收方 处理处理发起方提交offer事件
        log()('file_offer', desc);
        if (!desc) return false;

        return file_pc.createAnswer(desc)
            .then((desc) => {
                socket.emit('file_answer', desc);
            })
            .catch(function (e) {
                console.log(e);
            });
    });
    socket.on('file_answer', (desc) => {              // 发起方 处理接收方接受offer后的answer事件
        file_pc.setRemoteDescription(desc)
            .then(() => {
                log()('set remote description');
            }).catch((e) => {
                console.log(e);
            });
    });
































};

class WebRTC {
    constructor() {
        var pc = new window.RTCPeerConnection(servers, pcConstraints);
        this.pc = pc;
    }

    regStream(cb) {
        this.pc.onaddstream = cb;
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
        console.log('reg candidate callback');
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
    getMediaStream(video, audio, rtc) {
        return navigator.mediaDevices.getUserMedia({
            audio: audio,
            video: video
        })
            .then((localStream) => {
                log()('addstream');
                rtc.addStream(localStream);
                return localStream;
            });
    },

    sendFile(file, channel) {
        return Promise.resolve()
            .then(() => {
                log()('status ', channel.readyState);
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
            });
    },

    receiveFile(e) {
        console.log('receive', e);
        return false;
    }

};

function log() {
    let symbols;
    if ('in' === ioType) symbols = '>> ';
    if ('out' === ioType) symbols = '<< ';

    // return console.log.bind(console, ioType, symbols);
    return function () { };
}

