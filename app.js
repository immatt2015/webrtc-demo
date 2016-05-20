var http = require('http');
var express = require('express');
var serverStatic = require('serve-static');
var socketIO = require('socket.io');
var IO  = require('./socket_io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.use(serverStatic('static', {index: ['index.html']}));

app.get('/index', function(req, res){
    res.redirect('/static')
});

IO.use(io);

server.listen(8686);  // 这里有个天坑
// app.listen(8686);        // 这样启动服务器失败!!!