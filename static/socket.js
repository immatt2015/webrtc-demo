'use strict';

/**
 *  初始化socket.io
 */
class SocketIO {
    constructor(username) {
        let socket = io();
        socket.emit('join', username);
        document.querySelector('span#my-name').innerText = username;
        this.socket = socket;
        this.username = username;
    }

    __init(peers) {
        var c_video = document.getElementById('s-video');
        var c_audio = document.getElementById('s-audio');
        var s_media = document.getElementById('stop-media');
        var c_list = document.getElementById('c_list');

        this.socket.on('connect', ()=> {   // socket 连接建立, 连接按钮不可用
            c_video.disabled = false;
            c_audio.disabled = false;
            s_media.disabled = false;
        });

        this.socket.on('disconnect', ()=> {    // socket 断开连接, 连接按钮恢复可用
            c_video.disabled = false;
            c_audio.disabled = false;
            s_media.disabled = false;
        });
        this.socket.on('list', (list)=> {  // 服务器推送在线名单, 更新联系人列表
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
                ls[i].onclick = this.callOut.bind(this);
            }
        });
        
        this.socket.on('_call_in', (user_id)=> {            // 接收方 处理发起方的发起请求
            if (!confirm('接受 ' + user_id + ' 的连接')) {
                this.socket.emit('_refused', user_id);
                utils.log(utils.ioType)(' emit _refused');
                return false;
            }
            utils.ioType = 'in';
            console.log('==  _call_in ' + utils.ioType);

            this.socket.emit('_accept', user_id);
            utils.log(utils.ioType)(' emit _accpet');

            console.log(c_video.checked, c_audio.checked);
            // return media.registerMedia(c_video.checked, c_audio.checked)
            //     .then(()=> {
            //         return createOffer();
            //     })
            //     .catch((e)=> {
            //         console.log(e);
            //     });
        });
        this.socket.on('_refused', ()=> {                // 发起方 处理接收方的拒绝事件
            console.log('杯具了(＞﹏＜)');
            return false;
        });
        this.socket.on('_accept', (user_id)=> {          // 发起方 处理接收方同意事件
            utils.ioType = 'out';
            console.log(c_video.checked, c_audio.checked);
            // return media.registerMedia(c_video.checked, c_audio.checked)
            //     .catch((e)=> {
            //         console.log(e);
            //     });
        });

        this.socket.on('_file', (evt)=> {
            if (!confirm('接受文件')) socket.emit('_refused_file');

            function cb() {
                this.socket.emit('_accept_file');
            }

            media.transferFiles(cb);
        });
        this.socket.on('_refused_file', (evt)=> {
            alert('拒绝接受文件');
        });
        this.socket.on('_accept_file', ()=> {
            utils.log(utils.ioType)('accept files');
            media.transferFiles();
        });

        this.socket.on('_offer', (d)=> {             // 接收方 处理处理发起方提交offer事件
            utils.log(utils.ioType)('offer', d.desc);
            if (!desc) return false;

            return peers[d.type].createAnswer(d.desc)
                .catch(function (e) {
                    console.log(e);
                })
        });
        this.socket.on('_answer', (d)=> {              // 发起方 处理接收方接受offer后的answer事件
            peers[d.type].setRemoteDescription(d.desc)
                .then(()=> {
                    utils.log(utils.ioType)('set remote description');
                }).catch((e)=> {
                console.log(e);
            });
        });

        this.socket.on('_candidate', (d)=> {       // 双方 处理candidate候选信息
            peers[d.type].addCandidate(d.candidate).catch((e)=> {
                console.log(e);
            });
        });
    }

    callOut(evt) {
        this.socket.emit('_call_out', evt.target.id);
        utils.log(utils.ioType)('emit _call_out');
    }

    emit(evt, data) {
        this.socket.emit(evt, data);
    }

}