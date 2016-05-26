'use strict';

var socket_list = new Map();

exports.set = function(k, v) {
    socket_list.set(k, v);
};

exports.get = function (k){
  return socket_list.get(k);  
};

exports.del = function (k){
    return socket_list.delete(k);
};

exports.has = function (k){
    return socket_list.has(k);
};

exports.size = function(k){
    return socket_list.size;
};