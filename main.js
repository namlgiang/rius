var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');

app.use(express.static('public'));

io.on('connection', function (socket) {
    ss(socket).on('file', function(stream, data) {
        var filename = "images/" + path.basename(data.name);
        stream.pipe(fs.createWriteStream(filename));
    });
});

server.listen(8085, function() {
    console.log('Example app listening on port 8085!');
});