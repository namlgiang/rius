var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var sharp = require('sharp');

var allowedKeys = [
    "bigcvinhyen",
    "namlgiang"
];
var uploads = {};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/printerreport/:key", function(req,res) {
    db = new sqlite3.Database("printer-report.db");
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS log (time integer, printer text)");
        db.run("INSERT INTO log (time, printer) VALUES ("+(new Date()).getTime()+", '"+req.params.key+"')");
    });
});

app.get("/check/:key", function(req, res) {
    res.send(allowedKeys.includes(req.params.key) ? "1" : "0");
});

app.get("/sale/:key", function(req, res) {
    if(allowedKeys.includes(req.params.key)) {
        db = new sqlite3.Database(req.params.key + ".db");
        db.all("SELECT * FROM log", function(err, rows) {
            res.send(rows);
        });
    } else {
        res.send("Key not available");
    }
});

app.use(express.static('home'));
for(var i=0; i<allowedKeys.length; i++) {
    
    app.use("/" + allowedKeys[i], express.static('public'));
    app.use("/manage/" + allowedKeys[i], express.static('manage'));
    uploads[allowedKeys[i]] = [];

}

io.on('connection', function (socket) {

    var socketKey = "";
    var isServer = false;
    var db = undefined;

    socket.on("key", function(data) {
        console.log(data);
        if(data.key) {
            socketKey = data.key;
            isServer = data.isServer;
            if(!isServer)
                io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
            else
                io.emit("new user", socketKey);

            db = new sqlite3.Database(socketKey + '.db');
            db.run("CREATE TABLE IF NOT EXISTS log (time integer, action text, value integer)");
        } else {
            socketKey = data;
            io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
        }
    });

    if(!isServer) {
        socket.on("clear", function(data) {        
            for(var i=0; i<uploads[socketKey].length; i++) {
                var fn = uploads[socketKey][i];
                fs.unlink("home/images/" + fn);
                fs.unlink("home/images/" + fn.match(/[^.]+/g)[0] + "-min." + filename.match(/[^.]+/g)[1]);
            }
            uploads[socketKey] = [];
            io.emit("photos", {"key": socketKey, "images": uploads[socketKey]});
        });
    }

    ss(socket).on('file', function(stream, data) {
        console.log(data);
        if(!allowedKeys.includes(data.key))
            return;

        var r = data.name.match(/\.([^.]+)/g);
        var filename = data.key + "-" + uploads[data.key].length + r[r.length-1];
        uploads[data.key].push(filename);
        
        var path = "home/images/" + filename;
        stream.pipe(fs.createWriteStream(path));

        var size = 0;
        stream.on('data', function(chunk) {
            size += chunk.length;
            if(size >= data.size) {
                sharp(path).resize(200,200).max().toFile(
                    "home/images/" + filename.match(/[^.]+/g)[0] + "-min." + filename.match(/[^.]+/g)[1]
                ).then(function() {
                    io.emit("photos", {"key": data.key, "images": uploads[data.key]});
                });
            }
        });
    });

    socket.on("user", function(data) {
        io.emit("user", data);
    });

    socket.on("facebook", function(data) {
        io.emit("facebook", data);
    });

    socket.on("money", function(money) {
        if(db) {
            db.run("INSERT INTO log (time, action, value) VALUES ("+(new Date()).getTime()+", 'cash in', "+money+")");
        }
    });

    socket.on("print", function(count) {
        if(db) {
            db.run("INSERT INTO log (time, action, value) VALUES ("+(new Date()).getTime()+", 'print', "+count+")");
        }
    });
});

server.listen(8085, function() {
    console.log('Example app listening on port 8085!');
});