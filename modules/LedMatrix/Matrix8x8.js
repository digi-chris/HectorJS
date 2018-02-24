const RunPython = require('./RunPython2.js');
const MatrixFrame = require('./MatrixFrame.js');

var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.Matrix8x8 = function() {
    var device = new HectorCore.IODevice();
    device.Name = "Matrix8x8";
    var display;

    var matrixAddress = new HectorCore.IOOption('list', '0x70', device, 'list');
    matrixAddress.Data = [ '0x70', '0x71', '0x72', '0x73' ];
    matrixAddress.OnValueChanged = function(option) {
        display = new Matrix(option.GetValue());
        display.clear();
//        console.log(display.setBrightness(15));
    };
    device.Options.MatrixAddress = matrixAddress;

    var connInput = new HectorCore.IOConnection(device);
    connInput.ConnType = 1;
    connInput.Name = "In";
    connInput.OnFrameArrived = function(frame) {
        if(display) {
            if(frame) {
                for(var y = 0; y < 8; y++) {
//                    var textLine = '';
                    for(var x = 0; x < 8; x++) {
//                        textLine += frame.GetPixel(x, y) + ' ';
                        display.setPixel(x, y, frame.GetPixel(x, y));
                    }
//                    console.log(textLine);
                }
            }
            display.writeDisplay();
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

const startUp = 'from Adafruit_LED_Backpack import Matrix8x8;display = Matrix8x8.Matrix8x8(address=%address%, busnum=1);display.begin()'

var Matrix = function(matrixAddress) {
  this.p = new RunPython();
  console.log(startUp.replace('%address%', matrixAddress));
  this.p.run(startUp.replace('%address%', matrixAddress));

  this.clear = function() {
    return this.p.run('display.clear()');
  };

  this.writeDisplay = function() {
    return this.p.run('display.write_display()');
  };

  this.setBrightness = function(brightness) {
    return this.p.run('display.set_brightness(' + brightness + ')');
  };

  this.setPixel = function(x, y, value) {
    if (value) {
      value = '1';
    } else {
      value = '0';
    }
    return this.p.run(`display.set_pixel(${x}, ${y}, ${value})`);
  };
}
