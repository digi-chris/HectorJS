var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.Splitter = function() {
    var device = new HectorCore.IODevice();
    device.Name = "Splitter";

    var outputs = [];
    function buildConnection(index) {
        var conn = new HectorCore.IOConnection(device);
        conn.Name = 'Out ' + (index + 1);
        conn.ConnType = 0;
        device.Connections.push(conn);
        outputs.push(conn);
    }

    var connIn = new HectorCore.IOConnection(device);
    connIn.ConnType = 1;
    connIn.Name = "In";
    device.Connections.push(connIn);

    connIn.OnFrameArrived = (frame) => {
        // TODO: We should copy the frame so it can't be altered downstream and affect all routes
        for(var i = 0; i < outputs.length; i++) {
            outputs[i].FrameArrived(frame);
        }
    };

    var numOuts = 4;
    for(var i = 0; i < numOuts; i++) {
        buildConnection(i);
    }

    device.Init = function() {
    };

    device.Shutdown = function() {
    };

    return device;
}
