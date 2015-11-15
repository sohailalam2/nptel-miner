/**
 * Created by sohail on 10/11/2015.
 */
var http = require('http')
    , fs = require('fs')
    , path = require('path')
    , URL = require('url')
    , config = require('./config.json')
    ;

// global variables
var DOWNLOAD_LIST = [] // list of all downloads
    , WAIT_FOR_RESPONSE = 0
    ;

/**
 * A method to format a string with values in place of placeholder dynamically
 *                                           +
 * Usage:
 *
 * "Hello{0}World".format(5) = Hello5World
 *
 * @returns {String}
 */
String.prototype.format = function () {
    var content = this;
    for (var i = 0; i < arguments.length; i++) {
        var replacement = '{' + i + '}';
        content = content.replace(replacement, arguments[i]);
    }
    return content;
};

/**
 * This normalizes the filename, removes unwanted characters from filename
 * @param filename
 * @returns {*}
 */
function normalizeFilename(filename) {
    // replace the following characters
    // ? : / , <space> <tabs>
    if (filename) {
        filename = filename.replace(/[?:\s/,]/g, '_');
    }
    return filename;
}

function downloadSize(downloadUrl, callback) {
    setTimeout(function () {
        // parse the downloadUrl string into url object
        var url = URL.parse(downloadUrl);
        // make a http HEAD request to check the download file size
        http.request({
            method: 'HEAD'
            , host: url.host
            , port: url.port
            , path: url.path
        }, function (res) {
            if (res && res.headers) {
                var dSize = res.headers['content-length'];
                if (dSize)
                    dSize = parseInt(dSize);
                else
                    dSize = 0;
                callback(dSize);
            }
        }).end();
    }, 500);
}

// helper function to download the video file
function download(data) {
    if (!data || !data.url || !data.path) {
        console.log('>>>> All Downloads Completed');
        return;
    }

    var dSize = data.size, dSizeUnit = 'bytes';
    if (dSize > 1024) {
        dSize = dSize / 1024;
        dSizeUnit = 'KB';
    }
    if (dSize > 1024) {
        dSize = dSize / 1024;
        dSizeUnit = 'MB';
    }

    console.log('>> Downloading %s - (%s %s)', data.filename, String(Math.ceil(dSize)), dSizeUnit);
    data.startTime = new Date().getTime();
    http
        .get(data.url, function (response) {
            response
                .pipe(fs.createWriteStream(data.path))
                .on('close', function () {
                    data.endTime = new Date().getTime();
                    var time = (data.endTime - data.startTime) / 1000
                        , timeunit = 'seconds';
                    if (time > 120) {
                        time = time / 60;
                        timeunit = 'minutes'
                    }
                    console.log('>> Download completed :: %s - (%s %s)', data.filename, String(time), timeunit);

                    // download the next file
                    download(DOWNLOAD_LIST.pop());
                })
                .on('error', function (err) {
                    console.log("Error while download", err);
                });
        })
}

var waitTimer; // the timer interval id
// this function will check WAIT_COUNTER and wait for some time until
// all http HEAD responses are back
function startAllDownloads() {
    clearInterval(waitTimer);
    if (WAIT_FOR_RESPONSE > 0) {
        console.log('>> Waiting for response for download size...');
        waitTimer = setInterval(function () {
            startAllDownloads();
        }, 5000);
    } else {
        console.log('>> Starting download of %s items', DOWNLOAD_LIST.length);
        // Start the download
        if (config.max_parallel_downloads > 0) {
            for (var i = 0; i < config.max_parallel_downloads; i++) {
                download(DOWNLOAD_LIST.pop());
            }
        } else {
            download(DOWNLOAD_LIST.pop());
        }
    }
}

// application starts here
(function () {
    var downloadPath
        , configFileBuffer
        , downloadConfig
        , downloadNumber
        , downloadFilename
        , downloadFilePath
        , downloadUrl;

    for (var i = 0; i < config.downloads.length; i++) {
        var topicName = config.downloads[i];
        // download path - downloads/Artificial Intelligence
        downloadPath = path.join(config.download_path, topicName, 'videos');
        if (!fs.existsSync(downloadPath)) {
            fs.mkdir(downloadPath);
        }

        // read the config file for the topic, this contains the URL information
        configFileBuffer = fs.readFileSync(path.join(config.download_path, topicName, 'config.json'));
        downloadConfig = JSON.parse(configFileBuffer.toString());

        // loop the titles - there must be as many titles as there are videos
        for (var index = 0; index < downloadConfig.download_titles.length; index++) {
            var title = downloadConfig.download_titles[index];
            // this is the download file number, in two digits - 01 to 99
            downloadNumber = ("0" + (index + 1)).slice(-2);
            // the download link
            downloadUrl = downloadConfig.links.download_link.format(downloadNumber);
            downloadFilename = normalizeFilename(downloadNumber + "." + title + downloadUrl.substring(downloadUrl.lastIndexOf('.')));
            // the filename by which the video will be saved
            downloadFilePath = path.join(downloadPath, downloadFilename);

            (function (downloadFilePath, downloadUrl, downloadFilename) {
                WAIT_FOR_RESPONSE++;
                downloadSize(downloadUrl, function (dSize) {
                    // add to download list if not already downloaded
                    if (!fs.existsSync(downloadFilePath)) {
                        DOWNLOAD_LIST.push({
                            url: downloadUrl,
                            path: downloadFilePath,
                            filename: downloadFilename,
                            size: dSize
                        })
                    } else {
                        // check file size and if it differs then download the new one
                        var fileStats = fs.statSync(downloadFilePath);
                        var size = 0;
                        if (fileStats) {
                            size = fileStats.size;
                        }
                        if (size != dSize) {
                            DOWNLOAD_LIST.push({
                                url: downloadUrl,
                                path: downloadFilePath,
                                filename: downloadFilename,
                                size: dSize
                            })
                        }
                    }
                    WAIT_FOR_RESPONSE--;
                });
            })(downloadFilePath, downloadUrl, downloadFilename);
        }
    }

    // start all downloads
    startAllDownloads();
})();
