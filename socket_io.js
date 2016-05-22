'use strict';

var rtc_ls = {};

var socketIO =  function(io){
    console.log('onload');
    io.on('connection', handle);

};

var handle = function (socket){
    let s_id = socket.id;
    
    // 缓存 socket
    rtc_ls[s_id] = [null, socket];

    socket.on('disconnect', function(){
        delete rtc_ls[s_id];
        console.log('disconnect  >> ', s_id);
    });
    
    socket.on('join', (data)=>{
        rtc_ls[s_id][0] = data;

        let ls = Object.keys(rtc_ls);
        let name_ls = [];
        for(let i=0,l=ls.length; i<l; i++){
            if(socket.id !== ls[i] && rtc_ls[ls[i]][0])
            name_ls.push([ls[i], rtc_ls[ls[i]][0]]);
        }
        console.log('>>', name_ls);
        socket.emit('get list', name_ls);

        if(rtc_ls[s_id]) return false;

    });

    socket.on('_answer', (d)=>{
        console.log('_answer');
        if(rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('_answer', d);
    });
    socket.on('_candidate', (d)=>{
        console.log('_candidate ' + s_id + ' ' + JSON.stringify(d));
        if(rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('_candidate', d);
    });

    socket.on('_offer', (d)=>{
        console.log('_offer', d);
        if(rtc_ls[rtc_ls[s_id][2]]) rtc_ls[rtc_ls[s_id][2]][1].emit('_offer', d);
    });

    socket.on('_call_out', (data)=>{
        console.log('_call_out');
        if(rtc_ls[data]) rtc_ls[data][1].emit('_call_in', s_id);
    });
    socket.on('_accept', (data)=>{
        console.log('_accept');
        if(rtc_ls[data]) {
            rtc_ls[data][1].emit('_accept', s_id);
            rtc_ls[s_id][2] = rtc_ls[data][1].id;
            rtc_ls[data][2] = s_id;
        }
    });
    socket.on('_refused', (data)=>{
       if(rtc_ls[data])  rtc_ls[data][1].emit('_refused', s_id);
    });
};

exports.use =socketIO;
