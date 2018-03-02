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
    $(".modal .back").click(function() {
        // $(".modal").removeClass("active");
        location.reload();
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
                        $(".modal").addClass("active");
                    },500);
                }
            });

            blobStream.pipe(stream);
        }
    });
});

function FacebookLoaded() {
    var uploading = false;
    $(".login-fb").click(function() {

        FB.login(function(res) {

            if(res.status == "connected") {
                FB.api('/me/permissions', function(data) {
                    for(var i=0; i<data.data.length; i++) {
                        if(data.data[i].permission == "user_photos" && data.data[i].status == "granted") {

                            if(uploading) 
                                return;
                            uploading = true;
                            $(".login-fb").css("min-width", "50%");
                            $(".login-fb span").html("Đang tải lên...");

                            // alert("Đăng nhập thành công!");
                            
                            // socket.emit("user", {"key": location.pathname.replace(/\//g, ""), "id": FB.getUserID()});

                            var imagesUpload = [];
                            var imagesTagged = [];
                            var loadUploaded = false;
                            var loadTagged = false;
                            var trySubmitPhotos = function() {
                                if(loadUploaded || loadTagged) {
                                    $(".login-fb .progress").css("right", "50%");
                                }
                                if(loadUploaded && loadTagged) {
                                    socket.emit("facebook", {
                                        "key": location.pathname.replace(/\//g, ""),
                                        "images": imagesUpload.concat(imagesTagged)
                                    });
                                    $(".login-fb .progress").css("right", "0%");

                                    setTimeout(function() {
                                        uploading = false;
                                        $(".login-fb").css("min-width", "0%");
                                        $(".login-fb span").html("Tiếp tục với Facebook");
                                        $(".login-fb .progress").css("right", "100%");
                                        $(".modal").addClass("active");
                                    },500);
                                }
                            }

                            FB.api("/me/photos/uploaded?limit=100", function(photos) {
                                
                                if(photos.data.length == 0) {
                                    loadUploaded = true;
                                    trySubmitPhotos();
                                }
                                for(var i=0; i<photos.data.length; i++) {
                                    FB.api("/"+photos.data[i].id+"?fields=images", function(link) {
                                        imagesUpload.push(link.images[0].source);
                                        if(imagesUpload.length == photos.data.length) {
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
                                        imagesTagged.push(link.images[0].source);
                                        if(imagesTagged.length == photos.data.length) {
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