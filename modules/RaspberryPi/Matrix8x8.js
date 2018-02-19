var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.Matrix8x8 = function() {
    var device = new HectorCore.IODevice();
    device.Name = "Matrix8x8";
    var display;

    var matrixAddress = new HectorCore.IOOption('list', '0x70', device, 'list');
    matrixAddress.Data = [ '0x70', '0x71', '0x72', '0x73' ];
    matrixAddress.OnValueChanged = function(option) {
        display = new (require('8x8-matrix'))(option.Value);
    };
    device.Options.MatrixAddress = matrixAddress;

    var connInput = new HectorCore.IOConnection(device);
    connInput.ConnType = 1;
    connInput.Name = "In";
    connInput.OnFrameArrived = function(frame) {
        if(display) {
            if(Array.isArray(frame)) {
                for(var x = 0; x < 8; x++) {
                    for(var y = 0; y < 8; y++) {
                        display.setPixel(x, y, frame[x + (y * 8)]);
                    }
                }
            }
        }
    };

    device.Connections.push(connInput);

    device.Init = function() {
    };

    device.Shutdown = function() {
        clearInterval(intervalID);
    };

    return device;
}
