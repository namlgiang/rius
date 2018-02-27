var key = process.argv[2];
var fn = process.argv[3];
var sqlite3 = require('sqlite3').verbose();
db = new sqlite3.Database(key.indexOf(".db") == -1 ? key + '.db' : key);
db.each("SELECT * FROM log", function(err, row) {
    console.log(row);
});

if(fn == "clear-today") {
    var d = new Date();
    d.setHours(0);d.setMinutes(0);d.setSeconds(0);d.setMilliseconds(0);
    db.run("DELETE FROM log WHERE time>=" + d.getTime());
}