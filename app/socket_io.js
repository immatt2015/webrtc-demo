'use strict';

var rtc_ls = {}; // { socekt_id: [sockeet, name, 对方socket_id]}

var socketIO = function (io) {
    console.log('onload');
    io.on('connection', handle);

};

var handle = function (socket) {
    let s_id = socket.id;

    // 缓存 socket
    rtc_ls[s_id] = [null, socket];

    socket.on('disconnect', function () {
        if (rtc_ls[s_id][2]) rtc_ls[rtc_ls[s_id][2]][2] = null;
        delete rtc_ls[s_id];
    });

    socket.on('join', (data) => {
        rtc_ls[s_id][0] = data;

        let ls = Object.keys(rtc_ls);
        let name_ls = [];
        for (let i = 0, l = ls.length; i < l; i++) {
            name_ls.push([ls[i], rtc_ls[ls[i]][0]]);
        }
        socket.broadcast.emit('list', name_ls);
        socket.emit('list', name_ls);
    });

    socket.on('call_out', (data) => {
        if (data === s_id) return false;
        if (rtc_ls[s_id][2]) {
            rtc_ls[rtc_ls[s_id][2]][1].emit('pause');
            // 去掉双方存储的信息， 终端要断开连接，， 收尾操纵。
        }
        if (rtc_ls[data]) rtc_ls[data][1].emit('call_in', s_id); // 这里是有问题的
    });

    socket.on('refused', (data) => {
        if (rtc_ls[data]) rtc_ls[data][1].emit('_refused', s_id);
    });

    socket.on('accept', (data) => {
        if (rtc_ls[data]) {
            rtc_ls[data][1].emit('accept', s_id);
            rtc_ls[s_id][2] = rtc_ls[data][1].id;
            rtc_ls[data][2] = s_id;
        }
    });

    // 消息连接 建立
    socket.on('msg_answer', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_answer', d);
    });
    socket.on('msg_candidate', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_candidate', d);
    });

    socket.on('msg_offer', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_offer', d);
    });

    // 音视频连接 建立
    socket.on('media_start', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_start');
    });
    socket.on('media_accept', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_accept');
    });
    socket.on('media_ready', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_ready');
    });
    socket.on('media_refused', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_refused');
    });
    socket.on('media_paused', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_paused');
    });
    socket.on('media_answer', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_answer', d);
    });
    socket.on('media_candidate', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_candidate', d);
    });

    socket.on('media_offer', (d) => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_offer', d);
    });


    // 文件连接 建立
    socket.on('file_start', (filename) => {
        console.log('file_start', filename);
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_start', filename);
    });
    socket.on('file_refused', () => {
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_refused');
    });
    socket.on('file_accept', () => {
        console.log('file_accept file');
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_accept');
    });

    socket.on('file_answer', (d) => {
        console.log('file_answer');
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_answer', d);
    });
    socket.on('file_candidate', (d) => {
        console.log('file_candidate ' + s_id);
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_candidate', d);
    });

    socket.on('file_offer', (d) => {
        console.log('file_offer');
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('file_offer', d);
    });
};

exports.use = socketIO;
