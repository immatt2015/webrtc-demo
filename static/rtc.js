/**
 * Created by Inter on 16/5/30.
 */

/**
 * rtc配置
 * @type {{iceServers: *[]}}
 */
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
    media_local.srcObject = stream;
    media_remote.srcObject = e.stream;
};
pc.ondatachannel = function (e) {
    console.log(e);
    var dc = e.channel;
    log()('on_data_channel');
    dc.onmessage = function (evt) {
        log()('on_msg');
        console.log(evt);
        console.log(evt.data, ioType, '>>>>*((((((((((())))))))))))');
    };

    dc.onerror = function (e) {
        console.log(e, 'on_error');
    };

    dc.onclose = function (evt) {
        console.log(evt, 'on_close');
    };

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

    //     return addMediaStream(video, audio)
    //         .then(()=>{
    //             return transferFiles()
    //         });
    return Promise.all([
        addMediaStream(video, audio),
        transferFiles(),
        sendMsg()
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
 * 发送/接收文件相关
 * @param cb
 */
function transferFiles(cb) {
    return new Promise((res)=> {
        var dc = pc.createDataChannel('dc');
        // dc.binaryType = 'arraybuffer';

        dataChannel = dc;

        log()('data channel');
        setInterval(()=> {
            log()('status ' + dc.readyState);
        }, 1000);

        dc.onopen = function (evt) {
            log()('on_openchannel');
            console.log(evt, ioType, ' <<<<)))))))))))))((((((((((())))))))))');
            // cb(datachannel);
            dc.send('hi world' + ioType);
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
 *  发送消息
 */
function sendMsg() {
    return new Promise((res, rej)=> {
        var dc = pc.createDataChannel('msg');

        log()('msg channel');

        dc.onerror = function (e) {
            console.log(e, 'on_error');
        };

        dc.onclose = function (evt) {
            console.log(evt, 'on_close');
        };

        // dc.send()
        return res(dc);
    })
}