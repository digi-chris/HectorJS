var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.SyncGenerator = function() {
    var _fps = 0.5;
    var device = new HectorCore.IODevice();
    device.Name = "SyncGenerator";

    var optFps = new HectorCore.IOOption('list', 0, device, 'list');
    optFps.Data = ['0.5', '1', '2', '10'];
    device.Options.fps = optFps;

    var syncOut = new HectorCore.IOConnection(device);
    syncOut.ConnType = 0;
    syncOut.Name = "Out";

    device.Connections.push(syncOut);

    optFps.OnValueChanged = (option) => {
        //console.log('incoming value = ' + option.Value);
        _fps = parseFloat(option.GetValue());
        //console.log('FPS = ' + _fps);
        startInterval();
    }

    var intervalID;
    device.Init = function() {
        startInterval();
    };

    function startInterval() {
        if(intervalID) {
            clearInterval(intervalID);
        }

        if(_fps > 0) {
            intervalID = setInterval(function() {
                // TODO: SyncFrame should be implemented
                syncOut.FrameArrived({});
            }, 1000 / _fps);
        }
    }

    device.Shutdown = function() {
        clearInterval(intervalID);
    };

    return device;
}
