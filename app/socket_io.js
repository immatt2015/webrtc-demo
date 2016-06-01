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
        rtc_ls[s_id][rtc_ls[rtc_ls[s_id][2]][1]]
        delete rtc_ls[s_id];
        console.log('disconnect  >> ', s_id);
    });

    socket.on('join', (data) => {
        rtc_ls[s_id][0] = data;

        let ls = Object.keys(rtc_ls);
        let name_ls = [];
        for (let i = 0, l = ls.length; i < l; i++) {
            name_ls.push([ls[i], rtc_ls[ls[i]][0]]);
        }
        console.log('>>', name_ls);
        socket.broadcast.emit('list', name_ls);
        socket.emit('list', name_ls);
    });

    socket.on('call_out', (data) => {
        console.log('_call_out');
        if (rtc_ls[s_id][2])
        if (rtc_ls[data]) rtc_ls[data][1].emit('call_in', s_id); // 这里是有问题的
    });

    socket.on('refused', (data) => {
        if (rtc_ls[data]) rtc_ls[data][1].emit('_refused', s_id);
    });

    socket.on('accept', (data) => {
        console.log('accept');
        if (rtc_ls[data]) {
            rtc_ls[data][1].emit('accept', s_id);
            rtc_ls[s_id][2] = rtc_ls[data][1].id;
            rtc_ls[data][2] = s_id;
        }
    });

    // 消息连接 建立
    socket.on('msg_answer', (d) => {
        console.log('msg_answer');
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_answer', d);
    });
    socket.on('msg_candidate', (d) => {
        console.log('msg_candidate ' + s_id + ' ' + JSON.stringify(d));
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_candidate', d);
    });

    socket.on('msg_offer', (d) => {
        console.log('msg_offer', d);
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('msg_offer', d);
    });

    // 音视频连接 建立
    socket.on('meida_answer', (d) => {
        console.log('media_answer');
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('meida_answer', d);
    });
    socket.on('media_candidate', (d) => {
        console.log('msg_candidate ' + s_id + ' ' + JSON.stringify(d));
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_candidate', d);
    });

    socket.on('media_offer', (d) => {
        console.log('msg_offer', d);
        if (rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('media_offer', d);
    });

    // 文件连接 建立
    // socket.on('_file', (filename) => {
    //     console.log('filename', filename);
    //     rtc_ls[rtc_ls[s_id][2]][1].emit('_file', filename);
    // });
    // socket.on('_refused_file', () => {
    //     rtc_ls[rtc_ls[s_id][2]][1].emit('_refused_file');
    // });
    // socket.on('_accept_file', () => {
    //     console.log('accept file');
    //     rtc_ls[rtc_ls[s_id][2]][1].emit('_accept_file');
    // });
};

exports.use = socketIO;
