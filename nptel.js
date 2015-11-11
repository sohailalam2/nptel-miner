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
var COUNT = 0 // the current download count
    , DOWNLOAD_LIST = [] // list of all downloads
    , WAIT_COUNTER = 0 // the wait counter for http HEAD responses
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

// helper function to download the video file
function download(data) {
    if (!data || !data.url || !data.path) {
        console.log('>>>> All Downloads Completed');
        return;
    }
    console.log('>> Downloading %s - %s', data.filename, data.url);
    data.startTime = new Date().getTime();
    http
        .get(data.url, function (response) {
            response.pipe(fs.createWriteStream(data.path));
        })
        .on('close', function () {
            data.endTime = new Date().getTime();
            var time = (data.endTime - data.startTime) / 1000;
            if (time > 120) {
                console.log('> Download completed :: %s - (%s minutes)', data.filename, String(time / 60))
            } else {
                console.log('> Download completed :: %s - (%s seconds)', data.filename, String(time))
            }

            // download the next file(s)
            if (config.max_parallel_downloads > 0) {
                for (var i = 0; i < config.max_parallel_downloads; i++) {
                    download(DOWNLOAD_LIST[COUNT++]);
                }
            } else {
                download(DOWNLOAD_LIST[COUNT++]);
            }
        })
        .on('error', function (err) {
            console.log("Error while download", err);
        });
}

var waitTimer; // the timer interval id
// this function will check WAIT_COUNTER and wait for some time until
// all http HEAD responses are back
function startAllDownloads() {
    clearInterval(waitTimer);
    if (WAIT_COUNTER > 0) {
        waitTimer = setInterval(function () {
            startAllDownloads();
        }, 2000);
    } else {
        console.log('>> Starting download of %s items', DOWNLOAD_LIST.length);
        // Start the download
        if (config.max_parallel_downloads > 0) {
            for (var i = 0; i < config.max_parallel_downloads; i++) {
                download(DOWNLOAD_LIST[i]);
            }
        } else {
            download(DOWNLOAD_LIST[0]);
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

            // add to download list if not already downloaded
            if (!fs.existsSync(downloadFilePath)) {
                DOWNLOAD_LIST.push({
                    url: downloadUrl,
                    path: downloadFilePath,
                    filename: downloadFilename
                })
            } else {
                // increment the wait counter
                WAIT_COUNTER++;
                // check file size and if it differs then download the new one
                var fileStats = fs.statSync(downloadFilePath);
                var size = 0;
                if (fileStats) {
                    size = fileStats.size;
                }
                // parse the downloadUrl string into url object
                var url = URL.parse(downloadUrl);
                var options = {method: 'HEAD', host: url.host, port: url.port, path: url.path};
                // make a http HEAD request to check the download file size
                (function (size, downloadUrl, downloadFilePath, downloadFilename) {
                    var req = http.request(options, function (res) {
                            if (res && res.headers) {
                                var headers = res.headers;
                                // if the download filesize is not same as the file size then add it to download list
                                if (size != headers['content-length']) {
                                    DOWNLOAD_LIST.push({
                                        url: downloadUrl,
                                        path: downloadFilePath,
                                        filename: downloadFilename
                                    })
                                }
                            }
                            // increment the wait counter
                            WAIT_COUNTER--;
                        }
                    );
                    // end the http request
                    req.end();
                })(size, downloadUrl, downloadFilePath, downloadFilename);
            }
        }
    }

    // start all downloads
    startAllDownloads();
})();
