var HectorCore = require(process.cwd() + '/HectorCore.js');

module.exports.Switcher = function() {
    var device = new HectorCore.IODevice();
    device.Name = "Switcher";

    var _resend = false;
    var currentOut = 0;
    var inputs = [];
    var inputBtns = [];
    function buildConnection(index) {
        var conn = new HectorCore.IOConnection(device);
        conn.Name = 'In ' + (index + 1);
        conn.ConnType = 1;
        device.Connections.push(conn);
        inputs.push(conn);
        var optBtn = new HectorCore.IOOption("trigger", false, device, "button");
        device.Options[(index + 1) + ''] = optBtn;
        inputBtns.push(optBtn);
        var _lastFrame = null;
        optBtn.OnValueChanged = (option) => {
            //console.log('SWITCHER onValueChanged ' + typeof option.GetValue());
            if(option.GetValue()) {
                for(var i = 0; i < inputBtns.length; i++) {
                    if(i !== index) {
                        inputBtns[i].SetValue(false);
                    } else {
                        inputBtns[i].SetValue(true);
                        currentOut = index;
                        if(_resend && _lastFrame !== null) {
                            console.log('Resending last frame.');
                            connOut.FrameArrived(_lastFrame);
                        }
                    }
                }
            }
        };

        conn.OnFrameArrived = (frame) => {
            _lastFrame = frame;
            if(index === currentOut) {
                connOut.FrameArrived(frame);
            }
        };
    }

    var numOuts = 4;
    for(var i = 0; i < numOuts; i++) {
        buildConnection(i);
    }

    var optResend = new HectorCore.IOOption("trigger", false, device, "button");
    optResend.OnValueChanged = (option) => {
        _resend = option.GetValue();
    };
    optResend.Label = "Resend on switch";
    device.Options.Resend = optResend;

    var optPrev = new HectorCore.IOOption("trigger", false, device, "button");
    optPrev.OnValueChanged = (option) => {
        if(option.GetValue()) {
            option.SetValue(false);
            currentOut--;
            if(currentOut < 0) {
                currentOut = numOuts - 1;
            }
            setLights();
        }
    };
    device.Options.Prev = optPrev;

    var optNext = new HectorCore.IOOption("trigger", false, device, "button");
    optNext.OnValueChanged = (option) => {
        if(option.GetValue()) {
            option.SetValue(false);
            currentOut++;
            if(currentOut > numOuts - 1) {
                currentOut = 0;
            }
            setLights();
        }
    };
    device.Options.Next = optNext;

    function setLights() {
        for(var i = 0; i < inputBtns.length; i++) {
            if(i !== currentOut) {
                //inputBtns[i].SetValue("False");
                device.SetOption(i + 1, false);
            } else {
                //inputBtns[i].SetValue("True");
                device.SetOption(i + 1, true);
            }
        }
    }


    var connOut = new HectorCore.IOConnection(device);
    connOut.ConnType = 0;
    connOut.Name = "Out";
    device.Connections.push(connOut);

    //connIn.OnFrameArrived = (frame) => {
    //    outputs[i].FrameArrived(frame);
    //};

    device.Init = function() {
    };

    device.Shutdown = function() {
    };

    return device;
}
