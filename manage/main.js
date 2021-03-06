var to = new Date();
var from = new Date();
from.setDate(from.getDate() - 14);
var sale = [];
var key = location.pathname.split("/")[2];
var chart;

function sameDate(d0, d1) {
    return Math.abs(d0.getTime() - d1.getTime()) < 1000*60*60*24 && d0.getDate() == d1.getDate();
}

function setDate(input, time) {
    input.val(time.toISOString().substring(0,10));
}

$(document).ready(function() {

    $.get("/online", function(data) {
        if(data[key] && data[key] > 0) {
            $(".online").addClass("active").text("ONLINE");
        }
    });

    $(".title").text("Analytics: " + key);
    $.get("/printerstatus/" + key, function(data) {
        if(data == "0") {
            $(".status").addClass("normal").text("RUNNING");
            $(".fix").hide();
        } else {
            $(".status").addClass("error").text("ERROR");
            $(".fix").show();
        }
    });

    setDate($(".date-from"), from);
    setDate($(".date-to"), to);

    updateChart();

    $(".date-from, .date-to").change(function() {
        from = new Date($(".date-from").val());
        to = new Date($(".date-to").val());
        updateChart();
    });
    
    $(".fix").click(function() {
        $.get("/fixprinter/" + key);
        setTimeout(function() {
            location.reload();
        }, 1000);
    });
});

function updateChart() {
    $.get("/sale/" + key, function(data) {
        sale = data;

        var labels = [];
        var data = [];
        var print = [];
        var sumSale = 0;
        var sumPrint = 0;
        var d = new Date(from);
        var i = 0;
        var max = 0;
        while(d.getTime() <= to.getTime()) {
            labels.push(d.getDate() + "/" + (d.getMonth()+1));
            var count = 0;
            var count1 = 0;

            while( i < sale.length && (
            sale[i].time < d.getTime() || sameDate(new Date(sale[i].time), d))
             ) {
                if(sameDate(new Date(sale[i].time), d)) {
                    if(sale[i].action == "cash in")
                        count += sale[i].value;
                    if(sale[i].action == "print")
                        count1 += sale[i].value;
                }
                i++;
            }            

            data.push(count);
            max = Math.max(max, count);
            sumSale += count;
            print.push(count1);
            max = Math.max(max, count1*10000);
            sumPrint += count1;
            d.setDate(d.getDate() + 1);
        }

        console.log(max);

        if(chart)
            chart.destroy();
        $(".total-sales").text(sumSale.toLocaleString() + "VND");
        $(".total-print").text(sumPrint.toLocaleString());
        chart = new Chart($("#sale"), {
            type: 'bar',
            data: {
                labels: labels, 
                datasets: [{
                    label: 'Sales',
                    yAxisID: 'A',
                    data: data,
                    backgroundColor: '#33a7ff'
                }, {
                    label: 'Print',
                    yAxisID: 'B',
                    data: print,
                    backgroundColor: '#000'
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        id: 'A',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero:true,
                            stepSize: 10000,
                            max: max
                        }
                      }, {
                        id: 'B',
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            beginAtZero:true,
                            stepSize: 1,
                            max: max/10000
                        }
                      }]
                }
            }
        });
    });
}