var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');

var allowedKeys = [
    "bigcvinhyen"
];
var uploads = {};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/check/:key", function(req, res) {
    res.send(allowedKeys.includes(req.params.key) ? "1" : "0");
});

app.use(express.static('home'), {maxage : 0});
for(var i=0; i<allowedKeys.length; i++) {
    
    app.use("/" + allowedKeys[i], express.static('public'));
    uploads[allowedKeys[i]] = [];

}

io.on('connection', function (socket) {

    var socketKey = "";

    socket.on("key", function(data) {
        socketKey = data; 
        console.log(data);       
        console.log(socketKey);
        io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
    });

    ss(socket).on('file', function(stream, data) {
        if(socketKey == "")
            return;

        console.log(data);

        var r = data.name.match(/\.([^.]+)/g);
        var filename = "image" + uploads[socketKey].length + r[r.length-1];
        uploads[socketKey].push(filename);
        
        var path = "home/images/" + filename;
        stream.pipe(fs.createWriteStream(path));

        var size = 0;
        stream.on('data', function(chunk) {
            size += chunk.length;
            if(size >= data.size) {
                io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
            }
        });
    });

    socket.on("clear", function(data) {        
        for(var i=0; i<uploads[socketKey].length; i++) {
            fs.unlink("home/images/" + uploads[socketKey][i]);
        }
        uploads[socketKey] = [];
        io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
    });

    socket.on("user", function(data) {
        io.emit("user", {"key": socketKey, "id": data.id});
    });
});

server.listen(8085, function() {
    console.log('Example app listening on port 8085!');
});