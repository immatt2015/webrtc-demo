/**
 * Created by Inter on 16/5/30.
 */


/**
 * socket.io 初始化
 * socket.io 建立连接
 * @type {null}
 */
var socket_init = function (socket){
    var s_video = document.querySelector('input#s-video');
    var s_audio = document.querySelector('input#s-audio');
    var m_stop = document.querySelector('input#stop-media');
    var c_list = document.getElementById('c_list');

    socket.on('connect', ()=> {   // socket 连接建立, 连接按钮不可用
        s_video.disabled = false;
        s_audio.disabled = false;
        m_stop.disabled = true;
    });

    socket.on('disconnect', ()=> {    // socket 断开连接, 连接按钮恢复可用
        s_video.disabled = false;
        s_audio.disabled = false;
        m_stop.disabled = false;
    });
    socket.on('join_list', (list)=> {  // 服务器推送在线名单, 更新联系人列表
        console.log(list, 'list');
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
            a = null;
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
};