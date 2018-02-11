options = {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: 99999
};

var socket;

connect = function() {
    socket = io.connect('/', options);
    socket.emit("key", {
        key: location.pathname.replace(/\//g, ""),
        isServer: true
    });
};
connect();

socket.on("disconnect", function(attempNumber) {
    connect();
});

$(document).ready(function() {
    var uploading = false;
    $(".select").click(function() {
        if(uploading) return;
        $("#file").click();
    });
    $("#file").change(function(e) {
        var files = e.target.files;

        if(files.length == 0) return;

        uploading = true;
        $(".select").css("min-width", "50%");
        $(".select span").html("Đang tải lên...");

        var size = 0;
        var totalSize = 0;

        for(var i=0; i<files.length; i++) {
            var file = e.target.files[i];
            var stream = ss.createStream();
            totalSize += file.size;
            console.log(file);
            
            ss(socket).emit('file', stream, {size: file.size, name: file.name, key: location.pathname.replace(/\//g, "")});
            var blobStream = ss.createBlobReadStream(file);
            
            blobStream.on('data', function(chunk) {
                size += chunk.length;
                $(".select .progress").css("right", (100-size / totalSize * 100) + "%");

                if(size >= totalSize) {
                    setTimeout(function() {
                        uploading = false;
                        $(".select").css("min-width", "0%");
                        $(".select span").html("Chọn ảnh từ điện thoại của bạn");
                        $(".select .progress").css("right", "100%");
                    },500);
                }
            });

            blobStream.pipe(stream);
        }
    });
});

function FacebookLoaded() {
    $(".login-fb").click(function() {
        FB.login(function(res) {

            if(res.status == "connected") {
                FB.api('/me/permissions', function(data) {
                    for(var i=0; i<data.data.length; i++) {
                        if(data.data[i].permission == "user_photos" && data.data[i].status == "granted") {
                            alert("Đăng nhập thành công!");
                            
                            // socket.emit("user", {"key": location.pathname.replace(/\//g, ""), "id": FB.getUserID()});

                            var images = [];
                            var loadUploaded = false;
                            var loadTagged = false;
                            var trySubmitPhotos = function() {
                                if(loadUploaded && loadTagged) {
                                    socket.emit("facebook", {
                                        "key": location.pathname.replace(/\//g, ""),
                                        "images": images
                                    });
                                }
                            }

                            FB.api("/me/photos/uploaded?limit=100", function(photos) {
                                
                                if(photos.data.length == 0) {
                                    loadUploaded = true;
                                    trySubmitPhotos();
                                }
                                for(var i=0; i<photos.data.length; i++) {
                                    FB.api("/"+photos.data[i].id+"?fields=images", function(link) {
                                        images.push(link.images[0].source);
                                        if(images.length == photos.data.length) {
                                            loadUploaded = true;
                                            trySubmitPhotos();
                                        }
                                    });
                                }
                            });

                            FB.api("/me/photos/tagged?limit=100", function(photos) {
                                
                                if(photos.data.length == 0) {
                                    loadTagged = true;
                                    trySubmitPhotos();
                                }
                                for(var i=0; i<photos.data.length; i++) {
                                    FB.api("/"+photos.data[i].id+"?fields=images", function(link) {
                                        images.push(link.images[0].source);
                                        if(images.length == photos.data.length) {
                                            loadTagged = true;
                                            trySubmitPhotos();
                                        }
                                    });
                                }
                            });

                            return;
                        }
                    }
                    alert("Lỗi truy cập ảnh, xin mời bạn đăng nhập lại!");
                });
            }

        }, {scope: 'user_photos', auth_type: 'rerequest'});
    });
}