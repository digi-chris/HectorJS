const MatrixFrame = require('./MatrixFrame.js');
var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.MatrixBitmapConverter = function() {
    var device = new HectorCore.IODevice();
    device.Name = "MatrixBitmapConverter";

    var bitmapIn = new HectorCore.IOConnection(device);
    bitmapIn.ConnType = 1;
    bitmapIn.Name = "Bitmap In";
    device.Connections.push(bitmapIn);

    var mWidth = 8;
    var mHeight = 8;

    var matrices = [];
    var pixelLookup = {};
    function createMatrixOut(X, Y, width, height) {
        var mOut = new HectorCore.IOConnection(device);
        mOut.ConnType = 0;
        mOut.Name = "Out " + (matrices.length + 1);
        for(var y = Y; y < Y + height; y++) {
            for(var x = X; x < X + width; x++) {
                pixelLookup[x + 'x' + y] = matrices.length;
            }
        }
        device.Connections.push(mOut);
        matrices.push(mOut);
    }

    for(var i = 0; i < 4; i++) {
        createMatrixOut(i * mWidth, 0, mWidth, mHeight);
    }

    bitmapIn.OnFrameArrived = function(frame) {
        console.log('BitmapFrame in: ' + frame.Width + frame.Height);
        var outArray = new Array(matrices.length);//.fill(new MatrixFrame(mWidth, mHeight));
        for(var i = 0; i < outArray.length; i++) {
            outArray[i] = new MatrixFrame(mWidth, mHeight);
        }
        for(var y = 0; y < frame.Height; y++) {
//            var textLine = '';
            for(var x = 0; x < frame.Width; x++) {
                var mIndex = pixelLookup[x + 'x' + y];
                xShift = -mWidth * mIndex;
                if(frame.GetPixel(x, y) > 0) {
//                    textLine += '1';
                    outArray[mIndex].SetPixel(x + xShift, y, 1);
                } else {
                    outArray[mIndex].SetPixel(x + xShift, y, 0);
//                    textLine += '0';
                }
//                textLine += mIndex;
            }
//            console.log(textLine);
        }
        for(var i = 0; i < outArray.length; i++) {
            matrices[i].FrameArrived(outArray[i]);
        }
    };

    device.Init = function() {
    };

    device.Shutdown = function() {
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
