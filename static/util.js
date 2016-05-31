'use strict';

var utils = {
    __init: function () {

    },
    destory: function () {

    },

    log: function (ioType) {
        let symbol;
        if ('in' === ioType) symbol = '>> ';
        if ('out' === ioType) symbol = '<< ';

        return console.log.bind(console, symbol);
    },

    ioType: undefined, 
};
