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

    var servers = null;
    var pcConstraints = {
        'optional': []
    };

    var stream = null;
    var pc = null;
    var io_type = undefined;   //发起角色 in 被发起者, out 发起者
    join.disabled = true;
    var called = false;
    /**
     * end
     */

    /**
    * media
    */
    function createMedia(video, audio) {      //创建媒体信息
        return navigator.mediaDevices.getUserMedia({
            audio: audio,
            video: video
        });
    }
    /**
     * end
     */

    /**
     * socket.io 初始化
     * socket.io 建立连接
     * @type {null}
     */
    var socket = io('http://127.0.0.1:8686');

    socket.on('connect', function () {   // socket 连接建立, 连接按钮不可用
        join.disabled = false;
    });

    socket.on('disconnect', function () {    // socket 断开连接, 连接按钮恢复可用
        join.disabled = true;
    });
    socket.on('get list', function (list) {  // 服务器推送在线名单, 更新联系人列表
        connect_list.innerHTML = null;

        console.log(list);
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
        console.log(ls);
    });

    socket.on('_offer', function (desc) {             // 接收方 处理处理发起方提交offer事件
        console.log('==  _offer', desc);
        if(!desc) return false;
        _setRemoteDescription(desc)
            .then(() => {
                return _createAnswer();
            })
            .then((desc) => {
                return _setLocalDescription(desc);
            })
            .then((desc) => {
                socket.emit('_answer', desc);
                console.log('>> _setRemoteDescription ' + io_type);
            })
            .catch((e) => {
                console.log(e);
            })
    });
    socket.on('_answer', function (desc) {              // 发起方 处理接收方接受offer后的answer事件
        pc.setRemoteDescription(desc, function (d) {
            console.log(d);
            console.log('==  _answer');
        }, function (e) {
            console.log(e);
        });
    });

    socket.on('_call_in', function (user_id) {            // 接收方 处理发起方的发起请求
        if (!confirm('接受 ' + user_id + ' 的连接')) {
            socket.emit('_refused', user_id);
            return false;
        }
        io_type = 'in';
        console.log('==  _call_in ' + io_type);

        createMedia(c_video.checked, c_audio.checked)
            .then((stream) => {
                addStream(stream);
            })
            .catch((e) => {
                console.log(e);
            });

        socket.emit('_accept', user_id);
    });
    socket.on('_refused', function () {                // 发起方 处理接收方的拒绝事件
        console.log('杯具了(＞﹏＜)');
        console.log('==  _refused');
        return false;
    });
    socket.on('_accept', function (user_id) {          // 发起方 处理接收方同意事件  
        io_type = 'out';
        console.log('==  _accept, ' + io_type);
        console.log(c_video.checked, c_audio.checked);
        createMedia(c_video.checked, c_audio.checked)
            .then((stream) => {
                addStream(stream);
                return Offer();
            })
            .catch((e) => {
                console.log(e);
            });
    });

    socket.on('_candidate', function (candidate) {       // 双方 处理candidate候选信息  
        candidate = new RTCIceCandidate(candidate);
        console.log('==  _candidate ' + io_type + JSON.stringify(candidate));
        console.log(candidate);
        pc.addIceCandidate(candidate).then(function (d) {
            console.log('=== addIceCandidate');
            console.log(d);
        }, function (e) {
            console.log(e);
        });
    });
    /**
        * 方法
        */
    function callOut(evt) {
        console.log(evt.target.id);
        var user_id = evt.target.id;
        socket.emit('_call_out', user_id);
    }

    function buildSocket(name) {
        socket.emit('join', name);  // 提交登录名
        console.log('connect');
    };
    /**
        * end
        */

    /**
     * end
     */

    /**
     * rtc初始化
     * 创建RTCPeerConnection,为创建peers之间的连接做准备.
     * 同时,注册收集好候选信息之后的调用的回调函数,以及添加stream后的回调函数.
     * @type {null}
     */
    pc = new window.RTCPeerConnection(servers, pcConstraints);
    pc.onicecandidate = function (event) {
        console.log('>>  on_candidate ' + io_type);
        console.log(event.candidate);
        if (event.candidate) {
            // if (io_type === 'out') {
                socket.emit('_candidate', event.candidate);
                console.log('emit candidate');
            // }
        }
    };
    pc.onaddstream = function (e) {
        console.log('add stream');
        console.log(e);
        from1.srcObject = stream;
        to1.srcObject = e.stream;
    };


    /**
     * 方法
     */
    function _createOffer() {                       // rtc 创建offer
        return new Promise((res, rej) => {
            pc.createOffer(function (desc) {
                console.log('>>  _createOffer');
                console.log(desc);
                return res(desc);
            }, (e) => {
                console.log(e);
                return rej(e);
            });
        });
    }
    function _setLocalDescription(desc) {
        return new Promise((res, rej) => {
            pc.setLocalDescription(desc, function (d) {   // 这里会触发pc.oncandidate 事件
                console.log('>>  _setLocalDescription');
                console.log(d);
                return res(d);
            }, function (e) {
                console.log(e);
                return rej(e);
            });
        });
    }
    function _setRemoteDescription(desc) {
        return new Promise((res, rej) => {
            desc = new window.RTCIceCandidate(desc);
            pc.setRemoteDescription(desc, function (d) {
                console.log('>>  _setRemoteDescription')
                console.log(d);
                return res(d);
            }, function (e) {
                console.log(e);
                return rej(e);
            });
        });
    }
    function _createAnswer() {
        return new Promise((res, rej) => {
            pc.createAnswer(function (desc) {
                console.log('>>  _createAnswer');
                console.log(desc);
                return res(desc);
            }, function (e) {
                console.log(e);
                return rej(e);
            });
        });
    }
    function addStream(localStream) {
        console.log('>>  _addstream');
        pc.addStream(localStream);
    }
    /**
     * end
     */
    /**
     * end
     */


    /** 
     * 点击动作
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
        buildSocket(username);
    };
    var Offer = function () {
        _createOffer()     // createOffer 过程
            .then((desc) => {
                return _setLocalDescription(desc);   
            })
            .then(function (desc) {
                socket.emit('_offer', desc);
            });
    };
    /**
     * end
     */


};