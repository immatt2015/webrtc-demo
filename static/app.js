'use strict';

window.onload = function () {
    var username = undefined;
    do {
        username = (new Date() / 1000).toString() //|| prompt('输入昵称');
    } while (username !== null && username.trim().length < 1);
    if (!username) {
        alert('取消通信');
        return false;
    }

    var c_list = document.getElementById('c_list');
    var c_video = document.getElementById('s-video');
    var c_audio = document.getElementById('s-audio');
    var s_media = document.getElementById('stop-media');

    var rtc_map = {};

    var socketio = new SocketIO(username);
    socketio.__init(rtc_map);

    var msg_peer = new RTC('msg');
    msg_peer.__init();
    var msg_dc = msg_peer.__init_msg();
    rtc_map.msg = msg_peer;

    var msg_sender = document.querySelector('form#text-form input.sender');

    msg_sender.onclick = function (e) {
        var content = document.querySelector('form#text-form input.form-input').value;
        var msg = {username: username, content: content};
        msg_dc.send(JSON.stringify(msg));
        var t = document.createTextNode('<< 自己 : ' + msg.content);
        var p = document.createElement('p');
        p.appendChild(t);

        document.querySelector('div#msg-list').appendChild(p);
    };

    
    
};