var media = {
    addMediaStream: function (video, audio) {
        return navigator.mediaDevices.getUserMedia({
            audio: audio,
            video: video
        })
            .then((localStream)=> {
                stream = localStream;
                pc.addStream(localStream, console.log, console.log);
                utils.log(utils.ioType)('addstream');
            });
    },

    registerMedia: function (video, audio) {
        return Promise.resolve({})
            .then((m)=> {
                m.media = this.addMediaStream({video: true, audio: true});
                return m;
            })
            .then((m)=> {
                m.file = this.transferFiles();
                return m;
            })
            .then((m)=> {
                m.msg = this.sendMsg();
                return m;
            });
    },

    transferFiles: function (pc) {
        return new Promise((res)=> {
            var dc = pc.createDataChannel('file');
            // dc.binaryType = 'arraybuffer';

            dataChannel = dc;

            utils.log(utils.ioType)('data channel');

            dc.onopen = function (evt) {
                utils.log(utils.ioType)('on_openchannel');
                console.log(evt, ioType, ' <<<<)))))))))))))((((((((((())))))))))');
                // // cb(datachannel);
                // dc.send('hi world' + ioType);
            };

            dc.onerror = function (e) {
                console.log(e, 'on_error');
            };

            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
            };
            return res(dc);
        });
    },

    sendFile: function (filename) {
        utils.log(utils.ioType)('send file');
        socket.emit('_file', filename);
    },

    _sendFile: function (dc, file) {
        // var file = file_input.files[0];
        utils.log(utils.ioType)('status ', dc.readyState);
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
    },

    sendMsg: function (msg) {
        return new Promise((res, rej)=> {
            var dc = pc.createDataChannel('msg');

            utils.log(utils.ioType)('msg channel');

            dc.onerror = function (e) {
                console.log(e, 'on_error');
            };

            dc.onclose = function (evt) {
                console.log(evt, 'on_close');
            };

            dc.onopen = function (evt) {
                utils.log(utils.ioType)('on_openchannel');
                
            };

            return res(dc);
        })
    },

    media: null,

    datachannel: null,
};