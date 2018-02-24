var HectorCore = require(process.cwd() + '/HectorCore.js');
var Graphics = require('./Graphics.js');
//const bitmapManipulation = require('bitmap-manipulation');

module.exports.GraphicsRenderer = function() {
    var objs = [];
    var device = new HectorCore.IODevice();
    device.Name = "GraphicsRenderer";

    var gIn = new HectorCore.IOConnection(device);
    gIn.Name = "In";
    gIn.ConnType = 1;
    device.Connections.push(gIn);

    var gOut = new HectorCore.IOConnection(device);
    gOut.Name = "Out";
    gOut.ConnType = 0;
    device.Connections.push(gOut);

    var _width = 1920;
    var _height = 1080;

    var optWidth = new HectorCore.IOOption("float", "1920", device, "text");
    var optHeight = new HectorCore.IOOption("float", "1080", device, "text");
    device.Options.width = optWidth;
    device.Options.height = optHeight;

    optWidth.OnValueChanged = (option) => {
        _width = parseInt(option.Value);
        if(isNaN(_width)) {
            option.Value = "0";
        }
    };

    optHeight.OnValueChanged = (option) => {
        _height = parseInt(option.Value);
        if(isNaN(_height)) {
            option.Value = "0";
        }
    };

    gIn.OnFrameArrived = (frame) => {
        if(Array.isArray(frame.Children)) {
            let bitmapFrame = new HectorCore.BitmapFrame(_width, _height);
            //console.log('Children: ' + frame.Children.length);
            for(var i = 0; i < frame.Children.length; i++) {
                var gFrame = frame.Children[i];
                if(gFrame.BackgroundImage) {
                    bitmapFrame.DrawBitmap(gFrame.BackgroundImage, gFrame.Properties.X, gFrame.Properties.Y);
                }
            }
            //console.log('Bitmap created');
            //console.log(bitmap.getPixel(0, 0));
            //console.log(bitmap.getPixel(10, 0));
            gOut.FrameArrived(bitmapFrame);
        }
    };

    return device;
};
