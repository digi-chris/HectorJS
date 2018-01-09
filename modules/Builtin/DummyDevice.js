var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.DummyDevice = function() {
    var device = new HectorCore.IODevice();
    device.Name = "DummyDevice";

    var opt = new HectorCore.IOOption("trigger", 0, device, 'button');
    device.Options.ButtonTest = opt;

    var connInput = new HectorCore.IOConnection(device);
    connInput.ConnType = 1;
    connInput.Name = "In";
    connInput.OnFrameArrived = function(frame) {
        console.log('Frame arrived on input.', frame);
    };

    var connOutput = new HectorCore.IOConnection(device);
    connOutput.ConnType = 0;
    connOutput.Name = "Out";

    device.Connections.push(connInput);
    device.Connections.push(connOutput);

    //device.ConnectionUpdated = connUpdated;

    //connInput.DataArrived = dataArrived;
    //connOutput.DataArrived = dataArrived;
    //connOutput.ConnectionUpdated = connUpdated;

    var sendCount = 0;
    setInterval(function() {
        connOutput.FrameArrived( sendCount, false );
        sendCount++;
    }, 1000);
    return device;
}