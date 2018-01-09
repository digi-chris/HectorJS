var controlFocus;
var currentDragSource;
var Controls = document.getElementById('Controls');
var canvasElement = document.getElementById('canvasElement');
var transportButtons = [];

transportButtons.push(document.getElementById('btnLive'));
transportButtons.push(document.getElementById('btnPlay'));
transportButtons.push(document.getElementById('btnRecord'));
if (document.getElementById('btnPause')) {
    transportButtons.push(document.getElementById('btnPause'));
}

var btnOpenTransport = document.getElementById('btnOpenTransport');

if (btnOpenTransport !== null) {
    btnOpenTransport.addEventListener('click', function () {
        var transportWindow = window.open("Transport.html", "_transport");
        transportWindow.addEventListener('load', function () {
            transportWindow.init(rView);
        });
    });
}

if(transportButtons[0] !== null) {
    transportButtons[0].onclick = function() {
        rView.SendCommand("setTransportMode", ['live']);
    };
}

if(transportButtons[1] !== null) {
    transportButtons[1].onclick = function() {
        rView.SendCommand("setTransportMode", ['play']);
    };
}

if(transportButtons[2] !== null) {
    transportButtons[2].onclick = function() {
        rView.SendCommand("setTransportMode", ['record']);
    };
}

if (transportButtons.length > 3) {
    if (transportButtons[3] !== null) {
        transportButtons[3].onclick = function () {
            rView.SendCommand("setTransportMode", ['pause']);
        };
    }
}

var btnForward = document.getElementById('btnForward');
var btnBack = document.getElementById('btnBack');

if(btnForward) {
    btnForward.onclick = function() {
        rView.SendCommand("getTransportPosition", [], function(resp) {
            rView.SendCommand("setTransportPosition", [resp + 10000]);
        });
    };
}

if(btnBack) {
    btnBack.onclick = function() {
        rView.SendCommand("getTransportPosition", [], function(resp) {
            rView.SendCommand("setTransportPosition", [resp - 10000]);
        });
    };
}

if (canvasElement) {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}

window.onresize = function() {
    //checkCanvasSize();
    rView.checkConnections(false);
};

var RackDiv = document.getElementById("RackDiv");

function checkCanvasSize() {
    if (canvasElement) {
        canvasElement.width = window.innerWidth - 242;
        canvasElement.height = window.innerHeight - 42;

        var body = document.body,
            html = document.documentElement;

        var width = Math.max(RackDiv.clientWidth, RackDiv.scrollWidth, RackDiv.offsetWidth);
        var height = Math.max( /*body.scrollHeight, body.offsetHeight, 
                           html.clientHeight, html.scrollHeight, html.offsetHeight,*/
                               RackDiv.clientHeight, RackDiv.scrollHeight, RackDiv.offsetHeight);
        if (canvasElement.height < height) {
            canvasElement.height = height;

            if (canvasElement.width < width) {
                canvasElement.width = width;
            }
        }
    }
}
checkCanvasSize();

window.onmousemove = function(event) {
    if(controlFocus) {
        if(event.buttons === 0) {
            controlFocus = null;
        } else {
            //console.log(event);
            //console.log(controlFocus);
            console.log('setting control', controlFocus.getValue(), event.movementY);
            console.log(controlFocus.maximum - controlFocus.minimum);
            console.log(event.movementY / 100);
            controlFocus.setValue(controlFocus.getValue() - ((event.movementY / 100) * (controlFocus.maximum - controlFocus.minimum)));
            /*if(controlFocus.codebehind) {
                controlFocus.codebehind.setValue(controlFocus.codebehind.getValue() - (event.movementY / 100));

                if(controlFocus.parentControl.property) {
                    controlFocus.parentControl.wayObj.applyControl(controlFocus);
                } else {
                    if(controlFocus.parentControl) {
                        var params = controlFocus.parentControl.parameters;
                        var outParams = [];
                        for(var p = 0; p < params.length; p++) {
                            var value = params[p].codebehind.getValue();
                            var valueRange = params[p].info["maximum-value"] - params[p].info["minimum-value"];
                            value = (value * valueRange) + params[p].info["minimum-value"];
                            console.log(value);
                            outParams.push(value);
                        }
                        outParams.push(function() {
                            console.log("No callback.");
                        });
                        console.log(outParams);
                        controlFocus.parentControl.callFunction.apply(this, outParams);
                    }
                }
            }*/
        }
    }
};

window.onmouseup = function() {

};

var dragging = false;

function allowDrop(ev) {
    console.log('allowdrop');
    console.log("src: " + ev.srcElement.getAttribute('data-type'));
    console.log("target: " + ev.target.getAttribute('data-type'));
    console.log(ev.dataTransfer.getData("type"));
    console.log(ev);

    if(ev.target.getAttribute('data-type') === 'output' || ev.target.getAttribute('data-type') === 'input') {
        if(currentDragSource.getAttribute('data-type') !== ev.target.getAttribute('data-type')) {
            ev.preventDefault();
            console.log(ev.target.parentNode.parentNode.deviceIndex);
        }
    }
}

function drag(ev) {
    dragging = true;
    //console.log(ev);
    currentDragSource = ev.target;
    //console.log('drag', currentDragSource);
    var guid = ev.target.getAttribute('guid');
    //console.log('connection:', connectionList[guid]);
    ev.dataTransfer.setData("type", ev.target.getAttribute('data-type'));
    ev.dataTransfer.setData("src", ev.target);
}

function drop(ev) {
    dragging = false;
    console.log('drop');
    console.log(ev);
    console.log(this);
    ev.preventDefault();
    var type = ev.dataTransfer.getData("type");
    var src = ev.dataTransfer.getData("src");
    console.log(src);

    //var connectFrom = currentDragSource.parentNode.parentNode.deviceIndex;
    //var connectTo = ev.target.parentNode.parentNode.deviceIndex;
    //var connectFrom = connectionList[currentDragSource.getAttribute('guid')];
    //var connectTo = connectionList[ev.target.getAtrribute('guid')];
    console.log(currentDragSource);
    console.log(ev.target);
    var connectFrom = currentDragSource.parentNode.getAttribute('guid');
    var connectTo = ev.target.parentNode.getAttribute('guid');

    console.log('connect ' +  connectFrom + ' to ' + connectTo);

    rView.connect(currentDragSource.parentNode, ev.target.parentNode);
    //ev.target.appendChild(document.getElementById(data));
}

function dragend(ev) {
    if(dragging) {
        console.log('Still dragging');
        dragging = false;
        var connectFrom = currentDragSource.parentNode.getAttribute('guid');
        rView.connect(currentDragSource.parentNode, null);
    }
}

var cableColours = {
    "default" : {
        "cable" : '#2233FF',
        "highlight" : '#8899FF',
        "shadow" : '#1122AA'
    },
    "VideoFrame" : {
        "cable" : '#DD2211',
        "highlight" : '#EE7766',
        "shadow" : '#882211'                    
    },
    "AudioFrame" : {
        "cable" : '#11CC22',
        "highlight" : '#77DD88',
        "shadow" : '#009911'
    },
    "SyncFrame" : {
        "cable" : '#DDBB22',
        "highlight" : '#FFCC99',
        "shadow" : '#AA8811'
    }
};

function GetAllChildren(childArray, node) {
    for(var i = 0; i < node.children.length; i++) {
        childArray.push(node.children[i]);
        if(node.children[i].children.length > 0) {
            GetAllChildren(childArray, node.children[i]);
        }
    }
}

function InitControl(node) {
    var control = {};
    var children = [];
    GetAllChildren(children, node);
    for(var i = 0; i < children.length; i++) {
        //console.log(i, children[i]);
        if(children[i].getAttribute) {
            if(children[i].getAttribute("data-name")) {
                control[children[i].getAttribute("data-name")] = children[i];
            }
        }
    }
    return control;
}

function getFrameBaseType(frameType) {
    if(frameType) {
        if(frameType.length > 20 && frameType.indexOf(',') > 20) {
            //console.log('FrameType: ' + frameType);
            var fType = frameType.substring(20, frameType.indexOf(','));
            //console.log(fType);
            //var fType = frameType.substring(0, fType.indexOf(','));
            //console.log(fType);
            return fType;
        }
    }
    return "";
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var controlCodebehind = {
    "default" : function() {
        var tobj = this;
        var value = '';
        //var inputBox = getElementByDataname(this.element, 'value');

        this.setValue = function(theValue, dontCallback) {
            value = theValue;

            getElementByDataname(this.element, 'value').value = value;
            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        setTimeout(function() {
            var inputBox = getElementByDataname(tobj.element, 'value');
            inputBox.onchange = function(e) {
                tobj.setValue(inputBox.value);
            };
        }, 100);
    },
    "label" : function() {
        var tobj = this;
        var value = '';
        //var inputBox = getElementByDataname(this.element, 'value');

        this.setValue = function(theValue, dontCallback) {
            value = theValue;

            getElementByDataname(this.element, 'value').innerText = value;
            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        /*setTimeout(function() {
            var inputBox = getElementByDataname(tobj.element, 'value');
            inputBox.onchange = function(e) {
                tobj.setValue(inputBox.value);
            };
        }, 100);*/
    },
    "fileupload" : function() {
        var tobj = this;
        var value = '';
        var progressbar;

        function uploadFile(file) {
            console.log(tobj);
            var guid = tobj.Device.Options[tobj.Option].guid;
            var reader = new FileReader();
            var rawData = new ArrayBuffer();
            reader.onloadend = function(e) {
                console.log('loadend', e);
                //value = rawData;
                //tobj.valueCallback();
            };
            reader.onload = function(e) {
                rawData = e.target.result;
                //var rawString = bufferToBase64(rawData);
                //var rawString = btoa(rawData);
                console.log("DEVICE", tobj.Device);
                console.log("data read");
                //console.log(e);
                //console.log('data = ', rawData);

                var filesize = file.size;
                rView.SendCommand("startFileUpload", [tobj.Device.Index, guid, file.name, file.size]);
                //SendCommand("continueFileUpload", [guid, file.files[0].name, rawString]);
                var len = 1024 * 10;
                var pos = 0;
                //while(rawData.length > 0) {
                function doNextChunk() {
                    //console.log('getting next chunk', rawData.length);
                    if(rawData.length > 0) {
                        var fileChunk = '';
                        for (var i = 0; i < len; i++) {
                            if(rawData.length > 0) {
                                fileChunk += rawData.charAt(0);
                                rawData = rawData.substr(1);
                            }
                        }
                        rView.SendCommand("continueFileUpload", [tobj.Device.Index, guid, file.name, btoa(fileChunk)], doNextChunk);
                        if(progressbar) {
                            var pcnt = Math.round(((filesize - rawData.length) / filesize) * 100);
                            //console.log(pcnt);
                            progressbar.style.width = pcnt + "px";
                        }
                    } else {
                        rView.SendCommand("finishFileUpload", [tobj.Device.Index, guid, file.name]);
                    }
                }

                doNextChunk();
            };

            reader.onprogress = function(e) {
                console.log(e);
            };
            //reader.readAsArrayBuffer(file.files[0]);
            reader.readAsBinaryString(file);
        }

        setTimeout(function() {
            //console.log(tobj.element);
            var btnUpload = getElementByDataname(tobj.element, 'btnUpload');
            if(btnUpload) {
                btnUpload.onclick = function() {
                    console.log("UPLOAD!");
                    var file = getElementByDataname(tobj.element, 'filename');
                    console.log(file.files[0]);
                    //SendCommand("setTransportMode", ['live']);
                    console.log(tobj);
                };
            }

            progressbar = getElementByDataname(tobj.element, 'progressbar');
            console.log('progressbar ', progressbar, tobj.element);
            var dropzone = getElementByDataname(tobj.element, 'dropzone');
            dropzone.ondragover = function(ev) {
                console.log('drag over');
                ev.preventDefault();
            };
            dropzone.ondragenter = function(ev) {
                console.log('drag enter');
                ev.preventDefault();
            };
            dropzone.ondrop = function(ev) {
                console.log('drop');
                ev.preventDefault();
                var dt = ev.dataTransfer;
                if(dt.items) {
                    for(var i = 0; i < dt.items.length; i++) {
                        if(dt.items[i].kind === "file") {
                            uploadFile(dt.items[i].getAsFile());
                        }
                    }
                } else {
                    for(var i = 0; i < dt.files.length; i++) {
                        uploadFile(dt.files[i]);
                    }
                }
            };
        }, 100);

        this.setValue = function(theValue, dontCallback) {
            value = theValue;

            //getElementByDataname(this.element, 'value').innerText = value;
            //if(!dontCallback && this.valueCallback) {
            //    this.valueCallback();
            //}
        };

        this.getValue = function() {
            return value;
        };

        /*setTimeout(function() {
            var inputBox = getElementByDataname(tobj.element, 'value');
            inputBox.onchange = function(e) {
                tobj.setValue(inputBox.value);
            };
        }, 100);*/
    },
    "json" : function() {
        var tobj = this;
        var value = '';
        //var inputBox = getElementByDataname(this.element, 'value');

        this.setValue = function(theValue, dontCallback) {
            value = theValue;

            getElementByDataname(this.element, 'value').value = value;
            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        setTimeout(function() {
            var inputBox = getElementByDataname(tobj.element, 'value');
            inputBox.onchange = function(e) {
                tobj.setValue(inputBox.value);
            };
        }, 100);
    },
    "list" : function(listItems, currentValue) {
        var tobj = this;
        var value = '';
        var selList;
        var sValue = parseInt(currentValue);

        this.setValue = function(theValue, dontCallback) {
            //console.log("List setValue");
            value = theValue;

            if(selList) {
                selList.selectedIndex = parseInt(value);
            }

            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.addItem = function(text, value) {
            var opt = document.createElement('option');
            opt.value = value;
            opt.innerText = text;
            selList.appendChild(opt);
        };

        setTimeout(function() {
            selList = getElementByDataname(tobj.element, 'option-list');
            for(var i = 0; i < listItems.length; i++) {
                tobj.addItem(listItems[i], i);
                if(i === sValue) {
                    selList.selectedIndex = i;
                }
            }

            selList.addEventListener('change', function(e) {
                tobj.setValue(selList.options[selList.selectedIndex].innerText);
            });
        }, 100);

                    /*var selList = document.createElement('select');
                    for(var i = 0; i < r.Options[obj].Data.length; i++) {
                        var opt = document.createElement('option');
                        opt.value = i;
                        opt.innerText = r.Options[obj].Data[i];
                        selList.appendChild(opt);

                        if(r.Options[obj].Value === i.toString()) {
                            selList.selectedIndex = i;
                        }
                    }
                    rackOptions.appendChild(selList);

                    selList.setAttribute('data-option', obj);
                    selList.addEventListener('change', function(e) {
                        var optionName = this.getAttribute('data-option');
                        var optionValue = this.options[this.selectedIndex].value;
                        //console.log('setting ' + this.getAttribute('data-option') + ' to ' + this.options[this.selectedIndex].value);
                        SendCommand("setOption", [deviceIndex, optionName, optionValue]);
                    });*/
    },
    "radial" : function() {
        var tobj = this;
        var value = 0;

        this.minimum = 0;
        this.maximum = 1;

        this.setMinimum = function(value) {
            if(typeof value === 'string') {
                value = parseFloat(value);
            }
            this.minimum = value;
        };

        this.setMaximum = function(value) {
            if(typeof value === 'string') {
                value = parseFloat(value);
            }
            console.log('setting maximum', value);
            this.maximum = value;
        };

        this.setValue = function(theValue, dontCallback) {
            //console.log('setValue', theValue);
            if(typeof theValue === 'string') {
                theValue = parseFloat(theValue);
            }
            value = (theValue - this.minimum) / (this.maximum - this.minimum);

            //console.log('corrected setValue', value);
            if(value > 1)
                value = 1;
            if(value < 0)
                value = 0;

            //console.log('Radial.setValue', value);

            var deg = 270 * value;
            //console.log("deg: " + deg);
            var encoder = getElementByDataname(this.element, 'encoder');

            encoder.style.transform = "rotate(" + deg + "deg)";

            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            //console.log('GETVALUE ', value, this.maximum);
            return (value * (this.maximum - this.minimum)) + this.minimum;
        };

        this.onmousedown = function(event) {
            //console.log("onmousedown");
            //console.log(tobj);
            controlFocus = tobj;
        };
    },
    "toggle" : function() {
        console.log("TOGGLE", this);
        var value = false;
        var _this = this;

        this.setValue = function(theValue, dontCallback) {
            //console.log("TOGGLE.SETVALUE", theValue);
            if(typeof theValue === 'string') {
                theValue = theValue.toLowerCase() === 'true' ? true : false;
            }
            value = theValue;

            var elements = getElementsByDataName(_this.element, "indicator");
            for(var i = 0; i < elements.length; i++) {
                if(value) {
                    elements[i].style.backgroundColor = "#ff0000";
                } else {
                    elements[i].style.backgroundColor = "#000000";
                }
            }

            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.onclick = function() {
            console.log("onclick");
            _this.setValue(!value);
            console.log(value);
            //console.log(this.parentControl);
            //this.parentControl.wayObj.applyControl(this);
        };
    },
    "switch" : function() {
            var value = "linein";
            var _this = this;

            this.setValue = function(theValue) {
                console.log("SWITCH SETVALUE");
                console.log(value);
                if(typeof theValue === 'string') {
                    theValue = theValue === 'true' ? true : false;
                }
                value = theValue;

                //console.log("SWITCH SETVALUE");
                //console.log(value);

                var elements = getElementsByDataName(_this.element.parentNode, "switch");
                for(var i = 0; i < elements.length; i++) {
                    //console.log(elements[i].option);
                    var indicators = getElementsByDataName(elements[i], "indicator");
                    if(indicators.length > 0) {
                        if(elements[i].option === theValue) {
                            indicators[0].style.backgroundColor = "#ff0000";
                        } else {
                            indicators[0].style.backgroundColor = "#000000";
                        }
                    }
                }
            };

            this.getValue = function() {
                    return value;
            };

            this.onclick = function() {
                    console.log("switch onclick");
                    //console.log(this);
                    //console.log(this.parentNode);
                    //console.log(this.option);

                    _this.setValue(this.option);
                    //applyControl(this);
                    this.parentControl.wayObj.applyControl(this);
            };
    },
    "button" : function() {
        var value = false;
        var _this = this;

        this.setValue = function(theValue, dontCallback) {
            //console.log("BUTTON.SETVALUE", theValue);
            if(typeof theValue === 'string') {
                theValue = theValue.toLowerCase() === 'true' ? true : false;
            }
            value = theValue;

            var elements = getElementsByDataName(_this.element, "indicator");
            for(var i = 0; i < elements.length; i++) {
                if(value) {
                    elements[i].style.backgroundColor = "#ff0000";
                } else {
                    elements[i].style.backgroundColor = "#000000";
                }
            }

            if(!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.onclick = function() {
            console.log("onclick");
            _this.setValue(!value);
            console.log(value);
            //console.log(this.parentControl);
            //this.parentControl.wayObj.applyControl(this);
        };
    },
    "editor": function () {
        var value = '';
        var _this = this;

        this.setValue = function (theValue, dontCallback) {
            //console.log("BUTTON.SETVALUE", theValue);
            value = theValue;

            if (!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function () {
            return value;
        };

        this.onclick = function () {
            console.log("onclick");
            console.log(this);
            var deviceGuid = this.getAttribute('data-device-guid');
            console.log('_devices/' + deviceGuid + '/' + value);
            window.open('_devices/' + deviceGuid + '/' + value);
        };
    },
    "link": function () {
        var value = '';
        var _this = this;

        this.setValue = function (theValue, dontCallback) {
            //console.log("BUTTON.SETVALUE", theValue);
            value = theValue;

            if (!dontCallback && this.valueCallback) {
                this.valueCallback();
            }
        };

        this.getValue = function () {
            return value;
        };

        this.onclick = function () {
            window.open(value);
        };
    }
};

function getElementByDataname(node, dataName) {
    for(var i = 0; i < node.children.length; i++) {
        if(node.children[i].getAttribute('data-name') === dataName) {
            return node.children[i];
        }
        if(node.children[i]) {
            var recursion = getElementByDataname(node.children[i], dataName);
            if(recursion) {
                return recursion;
            }
        }
    }
    return null;
}

function getElementsByDataName(element, dataName) {
    var elements = [];
    for(var i = 0; i < element.children.length; i++) {
        if(element.children[i].getAttribute("data-name") === dataName) {
            elements.push(element.children[i]);
        }
    }
    return elements;
}

function getQueryString(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}