var key = process.argv[2];
var sqlite3 = require('sqlite3').verbose();
db = new sqlite3.Database(key + '.db');
db.each("SELECT * FROM log", function(err, row) {
    console.log(row);
});