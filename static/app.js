'use strict';

window.onload = function () {
    /**
     * 全局变量
     */
    var from1 = document.getElementById('from');
    var to1 = document.getElementById('to');
    var connect_list = document.getElementById('connectList');
    var join = document.getElementById('join');
    var user_name = document.getElementById('userName');
    var call_in = document.getElementById('call');
    var c_video = document.getElementById('c_video');
    var c_audio = document.getElementById('c_audio');
    var file_input = document.getElementById('file');
    var send_file = document.getElementById('s_start');
    var datachannel = null;

    var servers = {
        'iceServers': [{
            'url': 'stun:stun.example.org'
        }]
    };
    var pcConstraints = {
        'optional': []
    };

    var stream = null;
    var ioType = undefined;   //发起角色 in 被发起者, out 发起者
    var called = false;
    var dataChannel = null;
    join.disabled = true;

    var pc = new window.RTCPeerConnection(servers, pcConstraints);
    var socket = io();

    /**
     * socket.io 初始化
     * socket.io 建立连接
     * @type {null}
     */
    socket.on('connect', ()=> {   // socket 连接建立, 连接按钮不可用
        join.disabled = false;
    });

    socket.on('disconnect', ()=> {    // socket 断开连接, 连接按钮恢复可用
        join.disabled = true;
    });
    socket.on('get list', (list)=> {  // 服务器推送在线名单, 更新联系人列表
        connect_list.innerHTML = null;
        for (let i = 0, l = list.length; i < l; i++) {
            let li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#';
            a.id = list[i][0];
            a.innerHTML = list[i][1];
            li.className = 'user-list';
            li.appendChild(a);
            connect_list.appendChild(li);
            li = null;
        }
        let ls = document.getElementsByClassName('user-list');
        for (let i = 0, l = ls.length; i < l; i++) {
            ls[i].onclick = callOut;
        }
    });

    socket.on('_offer', (desc)=> {             // 接收方 处理处理发起方提交offer事件
        log()(' _offer', desc);
        if (!desc) return false;

        return createAnswer(desc)
            .catch(function (e) {
                console.log(e);
            })
    });
    socket.on('_answer', (desc)=> {              // 发起方 处理接收方接受offer后的answer事件
        pc.setRemoteDescription(desc)
            .then(()=> {
                log()('set remote description');
            }).catch((e)=> {
            console.log(e);
        });
    });

    socket.on('_call_in', (user_id)=> {            // 接收方 处理发起方的发起请求
        if (!confirm('接受 ' + user_id + ' 的连接')) {
            socket.emit('_refused', user_id);
            log()(' emit _refused');
            return false;
        }
        ioType = 'in';
        console.log('==  _call_in ' + ioType);

        socket.emit('_accept', user_id);
        log()(' emit _accpet');

        console.log(c_video.checked, c_audio.checked);
        return registerMedia(c_video.checked, c_audio.checked)
            .then(()=> {
                return createOffer();
            })
            .catch((e)=> {
                console.log(e);
            });
    });
    socket.on('_refused', ()=> {                // 发起方 处理接收方的拒绝事件
        console.log('杯具了(＞﹏＜)');
        console.log('==  _refused');
        return false;
    });
    socket.on('_accept', (user_id)=> {          // 发起方 处理接收方同意事件
        ioType = 'out';
        console.log('==  _accept, ' + ioType);
        console.log(c_video.checked, c_audio.checked);
        return registerMedia(c_video.checked, c_audio.checked)
            .catch((e)=> {
                console.log(e);
            });
    });

    socket.on('_candidate', (candidate)=> {       // 双方 处理candidate候选信息
        var cand = new window.RTCIceCandidate(candidate);
        pc.addIceCandidate(cand).then((d)=> {
            log()('addIceCandidate');
        }).catch((e)=> {
            console.log(e);
        });
    });

    socket.on('_file', (evt)=> {
        if (!confirm('接受文件')) socket.emit('_refused_file');

        function cb() {
            socket.emit('_accept_file');
        }

        transferFiles(cb);
    });
    socket.on('_refused_file', (evt)=> {
        alert('拒绝接受文件');
    });
    socket.on('_accept_file', ()=> {
        log()('accept files');
        transferFiles(_sendFile);
    });

    /**
     *  socket 方法封装
     */
    function callOut(evt) {
        socket.emit('_call_out', evt.target.id);
        log()('emit _call_out');
    }

    function buildSocket(name) {
        socket.emit('join', name);  // 提交登录名
        log()(' emit _join');
    }

    /**
     * 发送/接收文件相关
     * @param cb
     */
    function transferFiles(cb) {
        return new Promise((res)=> {
            var dc = pc.createDataChannel('dc');
            dc.binaryType = 'arraybuffer';

            dataChannel = dc;

            log()('data channel');
            setInterval(()=> {
                log()('status ' + dc.readyState);
            }, 1000);

            dc.onmessage = function (evt) {
                console.log(evt);
            };

            dc.onopen = function (evt) {
                log()('open channel');
                console.log(evt);
                cb(datachannel);
            };

            dc.onerror = function (e) {
                console.log(e);
            };

            dc.onclose = function (evt) {
                console.log(evt);
            };
            return res(dc);
        });
    }

    function sendFile(filename) {
        log()('send file');
        socket.emit('_file', filename);
    }

    function _sendFile(dc) {
        var file = file_input.files[0];
        log()('status ', dc.readyState);
        var chuncksize = 1024;
        var filesize = file.size;
        var offset = 0;

        function send(e) {
            dc.send(e.target.result);
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

    /**
     * rtc初始化
     * 创建RTCPeerConnection,为创建peers之间的连接做准备.
     * 同时,注册收集好候选信息之后的调用的回调函数,以及添加stream后的回调函数.
     * @type {null}
     */
    pc.onicecandidate = function (event) {
        log()('on ice candidate');
        if (event.candidate) {
            socket.emit('_candidate', event.candidate);
            log()('emit _candidate');
        }
    };
    pc.onaddstream = function (e) {
        log()('on add stream');
        // from1.srcObject = stream;
        to1.srcObject = e.stream;
    };
    pc.ondatachannel = function (e) {
        datachannel = e.datachannel;
        log()('on data channel');
    };

    /**
     * rtc相关方法
     */
    function addMediaStream(video, audio) {
        return navigator.mediaDevices.getUserMedia({
            audio: audio,
            video: video
        })
            .then((localStream)=> {
                stream = localStream;
                pc.addStream(localStream);
            });
    }

    function registerMedia(video, audio) {
        return Promise.all([
            // addMediaStream(video, audio),
            transferFiles()
        ]);
    }

    function setRemoteDescription(des) {
        let desc = new RTCSessionDescription((des));

        return pc.setRemoteDescription(desc)
            .then(()=> {
                log()('set remote description');
                return;
            });
    }

    var createOffer = function () {
        return pc.createOffer()      // createOffer 过程
            .then((desc)=> {
                log()('create offer');
                return desc;
            })
            .then(function (desc) {
                return pc.setLocalDescription(desc)
                    .then(()=> {
                        return desc;
                    });
            })
            .then((desc)=> {
                log()('set local description');
                return desc;
            })
            .then((desc)=> {
                console.log(desc);
                socket.emit('_offer', desc);
                log()('emit _offer');
            });
    };

    var createAnswer = function (desc) {
        return setRemoteDescription(desc)
            .then(()=> {
                return pc.createAnswer();
            })
            .then((desc)=> {
                log()('create answer');
                return desc;
            })
            .then((desc)=> {
                return pc.setLocalDescription(desc)
                    .then(()=> {
                        return desc;
                    });
            })
            .then((desc)=> {
                log()('set local description');
                return desc;
            })
            .then((desc)=> {
                log()(' emit _answer');
                socket.emit('_answer', desc);
            });
    };

    /**
     * 点击事件绑定
     */
    join.onclick = function () {
        join.disabled = true;
        var username = encodeURI((user_name.value || '').trim());

        if (!username) {
            console.log('no found username');
            return;
        }
        if (!socket) {
            console.log('socket not built!  wait');
            return;
        }

        c_audio.disabled = false;
        c_video.disabled = false;

        buildSocket(username);
    };

    send_file.onclick = function () {
        sendFile(file_input.files[0].name);
    };

    /**
     * 自定义日志记录
     */
    function log() {
        let symbol;
        if ('in' === ioType) symbol = '>> ';
        if ('out' === ioType) symbol = '<< ';

        return console.log.bind(console, symbol);
    }

};