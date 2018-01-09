var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime-types')

var wwwroot = './wwwroot';

module.exports.WebServer = function(listenPort) {
    http.createServer(function (req, res) {
        var filename = req.url;
        if(filename.indexOf('?') > -1) {
            filename = filename.substr(0, filename.indexOf('?'));
        }
        var fullpath = path.join(wwwroot, filename);

        var contentType = mime.lookup(fullpath);
        if(contentType === false) {
            console.log('Unrecognized MIME type for "' + filename + '".');
            contentType = 'application/octet-stream';
        }
        var readType;

        if(contentType.indexOf('text/') === 0 || contentType.indexOf('application/javascript') === 0) {
            readType = 'utf8';
        } else {
            readType = 'binary';
        }

        // TODO: not very neat - duplication of fs.readFile with checkMatch below
        fs.readFile(fullpath, readType, function(err, contents) {
            if(err) {
                res.writeHead(404, {'content-type' : 'text/text' });
                res.end();
            } else {
                //console.log(readType, fullpath, contentType);
                
                if(readType === 'utf8') {
                    parseContents(contents, function(r) {
                        console.log('sending...', fullpath, contentType);
                        res.writeHead(200, {'content-type' : contentType , 'content-length' : r.length});
                        //console.log('RETURN:');
                        //console.log(r);
                        res.write(r);
                        res.end();
                    });
                } else {
                    res.writeHead(200, {'content-type' : contentType , 'content-length' : contents.length});
                    res.write(contents, 'binary');
                    res.end();
                }
                //res.write(contents);
                //res.end();
            }
        });
    }).listen(listenPort);
};

function checkMatch(match, callback) {
    if(match !== null) {
        //console.log(matches[0]);
        var re = /(\[#INCLUDE\(")(.*)("\)\])/;
        var m = match[0].match(re);
        //console.log(m);
        if(m !== null) {
            if(m.length > 2) {
                var fullpath = path.join(wwwroot, m[2]);
                fs.readFile(fullpath, 'utf8', function(err, contents) {
                    // TODO: call back to parseContents here to allow nested includes
                    if(err) {
                        callback(match[0], '');
                    } else {
                        callback(match[0], contents);
                    }
                });
            }
        }
    }
}

function parseContents(contents, callback) {
    var regex = /\[#.*\]/g;
    var matches;
    var hasMatched = false;
    var parse = function() {
        matches = regex.exec(contents);
        if(matches !== null) {
            hasMatched = true;
            checkMatch(matches, function(original, replacement) {
                //console.log('replacing ' + original + ' with ' + replacement.substr(0, 20));
                contents = contents.replace(original, replacement);
                parse();
            });
        } else {
            //if(hasMatched) {
            //    console.log('returning matched contents...')
            //    console.log(contents);
            //}
            callback(contents);
        }
    }
    parse();
}