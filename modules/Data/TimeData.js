var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.TimeData = function() {
    var _fps = 0.5;
    var device = new HectorCore.IODevice();
    device.Name = "TimeData";

    var syncIn = new HectorCore.IOConnection(device);
    syncIn.ConnType = 1;
    syncIn.Name = "Sync";

    var dataIn = new HectorCore.IOConnection(device);
    dataIn.ConnType = 1;
    dataIn.Name = "In";

    var dataOut = new HectorCore.IOConnection(device);
    dataOut.ConnType = 0;
    dataOut.Name = "Out";

    device.Connections.push(syncIn);
    device.Connections.push(dataIn);
    device.Connections.push(dataOut);

    var _data = {};

    device.Init = function() {
        dataIn.OnFrameArrived = (frame) => {
            // Incoming data - add our time data and send it on
            _data = frame;
            if(!_data) {
                _data = {};
            }
            sendData();
        };

        syncIn.OnFrameArrived= (frame) => {
            sendData();
        };
    };

    function sendData() {
        var date = new Date();
        _data.hours = (date.getHours()<10?'0':'') + date.getHours();
        _data.minutes = (date.getMinutes()<10?'0':'') + date.getMinutes();
        _data.seconds = (date.getSeconds()<10?'0':'') + date.getSeconds();

        _data.date = date.getDate();
        _data.month = date.getMonth();
        _data.year = date.getYear();

        switch(date.getDay()) {
            case 0:
                _data.shortDay = "SUN";
                _data.longDay = "Sunday";
                break;
            case 1:
                _data.shortDay = "MON";
                _data.longDay = "Monday";
                break;
            case 2:
                _data.shortDay = "TUE";
                _data.longDay = "Tuesday";
                break;
            case 3:
                _data.shortDay = "WED";
                _data.longDay = "Wednesday";
                break;
            case 4:
                _data.shortDay = "THU";
                _data.longDay = "Thursday";
                break;
            case 5:
                _data.shortDay = "FRI";
                _data.longDay = "Friday";
                break;
            case 6:
                _data.shortDay = "SAT";
                _data.longDay = "Saturday";
                break;
        }

        dataOut.FrameArrived(_data);
    }

    device.Shutdown = function() {
    };

    return device;
}
