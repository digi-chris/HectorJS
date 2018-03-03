var HectorCore = require(process.cwd() + '/HectorCore.js');
var WeatherAPI = require('node-openweathermap');
var apiKey = '14533986b32c77588a91e4af5d128236';

module.exports.WeatherData = function() {
    var _fps = 0.5;
    var device = new HectorCore.IODevice();
    device.Name = "WeatherData";

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

    var optCity = new HectorCore.IOOption("text", "London, UK", device, "text");
    optCity.OnValueChanged = (option) => {
        opts.location = option.GetValue();
    };
    device.Options.City = optCity;

    var optUnit = new HectorCore.IOOption("list", "C", device, "list");
    optUnit.Data = ["C", "F"];
    optUnit.OnValueChanged = (option) => {
        opts.temp_unit = option.GetValue();
    };
    device.Options.Unit = optUnit;

    var lblTemperature = new HectorCore.IOOption("label", "", device, "label");

    device.Options.Temp = lblTemperature;

    var _data = {};

    var weatherInterval;

    device.Init = function() {
        dataIn.OnFrameArrived = (frame) => {
            // Incoming data - add our time data and send it on
            _data = frame;
            if(!_data) {
                _data = {};
            }
            sendData();
        };

        weatherInterval = setInterval(getWeather, 60000);

        syncIn.OnFrameArrived= (frame) => {
            sendData();
        };

        getWeather();
    };

    var weather = new WeatherAPI(apiKey);

    var opts = {
        location : 'London, UK',
        temp_unit : 'C'
    };

    function getWeather() {
        console.log("Getting weather...");
        weather.getWeather(opts).then((response) => {
            console.log(response);
            var temp = response.main.temp;
            //temp = (temp < 10 ? "0": "") + temp;
            _data.temperature = temp;
            _data.temperature_unit = opts.temp_unit;
            _data.allWeather = response;
            // TODO: How do we get sunrise/sunset time? This doesn't work.
            //var sunriseTime = new Date(response.sys.sunrise);
            lblTemperature.SetValue(temp + ' ' + opts.temp_unit);
        });
    }

    function sendData() {
        dataOut.FrameArrived(_data);
    }

    device.Shutdown = function() {
        clearInterval(weatherInterval);
    };

    return device;
}
