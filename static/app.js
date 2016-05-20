'use strict';

window.onload = function () {
    var servers = null;
    var pcConstraints = {
        'optional': []
    };

    var stream = null;
    var pc =     null;
    var in_out= -1;   // in : -1, ,,, out: 1

    var from1 =        document.getElementById('from');
    var to1 =          document.getElementById('to');
    var connect_list = document.getElementById('connectList');
    var join =         document.getElementById('join');
    var user_name =    document.getElementById('userName');
    var call_in =      document.getElementById('call');
    var c_video =      document.getElementById('c_video');
    var c_audio =      document.getElementById('c_audio');

    join.disabled = true;

    /**
     * socket.io 建立连接
     */
    var socket = io('http://127.0.0.1:8686');
    socket.on('connect', function(){
        join.disabled = false;
    });

    socket.on('disconnect', function(){
        join.disabled = true;
    });
    /**
     * end
     */

    /**
     * 创建RTCPeerConnection,为创建peers之间的连接做准备.
     * 同时,注册收集好候选信息之后的调用的回调函数,以及添加stream后的回调函数.
     */
    pc = new RTCPeerConnection(servers, pcConstraints);
    pc.onicecandidate = function (event) {
        console.log('candidate');
        if (event.candidate){
            // 这里其实是相当于发生了一次通信过程.
            socket.emit('_candidate',{cd: event.candidate, user: user_id});
        }
    };
    pc.onaddstream = function (e) {
        console.log('add stream');
        console.log(e);
        from1.srcObject = stream;
        to1.srcObject = e.stream;
    };
    /**
     * end
     */

    join.onclick = function(){
        join.disabled = true;
        var username = (user_name.value || '').trim();
        username = encodeURI(username);

        if(!username) return alert('no found username');
        if(!io)       return alert('socket not built!  wait');

        buildSocket(username);
    };

    function buildSocket (name){
        /**
         * socket.io 事件处理
         */
        socket.emit('join', name);  // 提交登录名
        console.log('connect');
        socket.on('get list', function(list){
            connect_list.innerHTML = null;

            console.log(list);
            for(let i=0, l=list.length; i<l; i++){
                let li = document.createElement('li');
                var a  = document.createElement('a');
                a.href='#';
                a.id = list[i][0];
                a.innerHTML = list[i][1];
                li.className = 'user-list';
                li.appendChild(a);
                connect_list.appendChild(li);
                li = null;
            }
            let ls = document.getElementsByClassName('user-list');
            for(let i=0, l=ls.length; i<l; i++){
                ls[i].onclick = callOut;
            }
            console.log(ls);

        });

        socket.on('_call_in', function(user_id){
            if(!confirm('接受 ' + user_id + ' 的连接')) {
                socket.emit('_refused', user_id);
                return false;
            }
            socket.emit('_accept', user_id);
            in_out = -1;
            buildRTC(user_id);
        });
        socket.on('_refused', function(){
            alert('杯具了(＞﹏＜)');
            return false;
        });
        socket.on('_accept', function(user_id){
            alert('accepted!!');
            in_out = 1;
            buildRTC(user_id);
        });

        socket.on('_candidate', function(candidate){
            pc.addIceCandidate(new RTCIceCandidate(event.candidate), console.log.bind(console), console.log.bind(console));
        });

        function callOut(evt){
            console.log(evt.target.id);
            var user_id = evt.target.id;
            socket.emit('_call_out', user_id);
        }
        /**
         * socket.io end
         */
    };

    /**
     * 注册媒体连接的响应事件
     * @type {boolean}
     */
    var called = false;
    function buildRTC(){
        call_in.onclick = function () {
            let video = c_video.checked;
            let audio = c_audio.checked;
            console.log('rtc!!');

            if (called) return;
            console.log('called!!');

            called = true;
            navigator.mediaDevices.getUserMedia({
                audio: audio,
                video: video
            }).then(function (localStream) {
                stream = localStream;
                pc.addStream(localStream);
                to1.srcObject = localStream;
                if (in_out === -1) {
                    pc.createOffer(function (desc) {
                        pc.setLocalDescription(desc, function () {
                            socket.emit('_offer', desc);
                        }, function(e){
                            console.log(e);
                        });
                    });

                    socket.on('_answer', function(desc){
                        pc.setRemoteDescription(desc, function () {

                        }, function(e){
                            console.log(e);
                        });
                    })

                }

                socket.on('_offer', function (desc) {
                    pc.setRemoteDescription(desc, function () {
                        if (1 === in_out) {
                            pc.createAnswer(function (desc) {
                                pc.setLocalDescription(desc, function () {
                                    socket.emit('_answer', desc);
                                });
                            }, function(e){
                                console.log(e);
                            })
                        }
                    }, function (e) {
                        console.log(e);
                    });
                });
            });
        };

    }


    //    Ignore
    /**
     * 注册关闭媒体连接的事件回调
     * @returns {boolean}
     */
//        document.getElementById('hangup').onclick = function () {
//            if (!called) return false;
//            if (stream)stream.stop();
//            called = false;
//        };


//        // >>>>>>>>>>    传输文件 <<<<<<<<<<<<<
//        let data_ended = true;
//        let dc1 = null;
//        let dc2 = null;
//        dc1 = pc1.createDataChannel('file');
//        dc2 = pc2.createDataChannel('file');
//
//        dc1.binaryType = 'arraybuffer';
//        dc2.binaryType = 'arraybuffer';
//
//        document.getElementById('s_start').onclick = function(){
//            if (!data_ended) return false;
//            let file = document.getElementById('file');
//            console.log(file.files[0], 1);
//            dc1.onopen = function (){
//                alert('open');
//                let f_reader = new window.FileReader();
//                f_reader.onload = function (e){
//                    dc1.send(e.target.result);
//                    console.log(e.target.result);
//                };
//                f_reader.readAsArrayBuffer(file.files[0].slice(0));
//            }
//        };
//
//        dc2.onmessage = function(e){
//            console.log(e, 1);
//        }
//
//        document.getElementById('s_stop').onclick = function (){
//            data_ended = true;
//            if(data_ended) return false;
//
//            if(dc) dc1.close();
//        };

};