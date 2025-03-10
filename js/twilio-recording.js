;
window.TWILIO = window.TWILIO || {};

TWILIO.recording = (function ($, window, document, undefined) {
    "use strict";

    var response = [];

    var headerAdded = false;

    function fetch(sidArray, sidIndex, pageNum, pageToken = '') {
        if (!TWILIO.util.validateSidToken(sidArray[sidIndex])) {
            fetchNextSidOrFinish(sidArray, sidIndex);
            return;
        }
        TWILIO.util.progress("Fetching recordings, SID: " + sidArray[sidIndex][0] + ", page: " + pageNum);
        $.ajax({
            type: "GET",
            url: "rest/recordings/all/" + sidArray[sidIndex][0] + "/" + sidArray[sidIndex][1] + "/" + pageNum + "/" + pageToken,
            dataType: "json",
            xhrFields: {
                withCredentials: false
            },
            success: function (jsonResult) {
                if (jsonResult.error) {
                    TWILIO.util.error("Failed: " + sidArray[sidIndex][0] + ". " + jsonResult.error);
                    fetchNextSidOrFinish(sidArray, sidIndex);
                }
                else {
                    if (!headerAdded) {
                        response.push(jsonResult.header);
                        headerAdded = true;
                    }
                    response = response.concat(jsonResult.data);
                    if (jsonResult.hasNextPage) {
                        fetch(sidArray, sidIndex, pageNum + 1, jsonResult.pageToken);
                    }
                    else {
                        fetchNextSidOrFinish(sidArray, sidIndex);
                    }
                }
            }
        });
    }

    function fetchNextSidOrFinish(sidArray, sidIndex) {
        if (sidIndex + 1 < sidArray.length) {
            fetch(sidArray, sidIndex + 1, 0);
        }
        else {
            TWILIO.util.download("recordings.csv", response).done();
        }
    }

    $("#fetch-recordings").on("click", function (event) {
        event.preventDefault();
        TWILIO.util.start("Start fetching recordings...");
        var file = $('#list-recordings-file')[0].files[0];
        if (file) {
            response = [];
            headerAdded = false;
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (e) {
                var parsed = $.csv.toArrays(e.target.result);
                if (parsed.length > 0) {
                    fetch(parsed, 0, 0);
                }
                else {
                    TWILIO.util.error("No data found in file, exiting...").done();
                }
            };
        }
        else {
            TWILIO.util.error("No input CSV file selected, exiting...").done();
        }
    });

    $("#delete-recordings").on("click", function (event) {
        event.preventDefault();
        TWILIO.util.start("Deleting recordings...");
        var file = $('#delete-recordings-file')[0].files[0];
        if (file) {
            response = [];
            headerAdded = false;
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (e) {
                var parsed = $.csv.toArrays(e.target.result);
                if (parsed.length > 0) {
                    BootstrapDialog.show({
                        title: 'Delete Recordings',
                        closable: false,
                        message: 'You are about to delete ' + parsed.length + ' recordings! Would you like to continue?',
                        buttons: [{
                            label: 'Yes',
                            action: function (dialog) {
                                dialog.close();
                                deleteRecording(parsed);
                            }
                        }, {
                            label: 'No',
                            action: function (dialog) {
                                TWILIO.util.progress("Action canceled by user.").done();
                                dialog.close();
                            }
                        }]
                    });
                }
                else {
                    TWILIO.util.error("No data found in file, exiting...").done();
                }
            };
        }
        else {
            TWILIO.util.error("No input CSV file selected, exiting...").done();
        }
    });

    function deleteRecording(sidArray) {
        var hasValidInput = false;
        $.each(sidArray, function (index, item) {
            if (TWILIO.util.validateSidTokenRecSid(item)) {
                hasValidInput = true;
                $.ajax({
                    type: "DELETE",
                    url: "rest/recordings/delete/" + item[0] + "/" + item[1] + "/" + item[2],
                    dataType: "json",
                    xhrFields: {
                        withCredentials: false
                    },
                    success: function (jsonResult) {
                        if (jsonResult.error) {
                            TWILIO.util.error(jsonResult.error);
                        }
                        else {
                            TWILIO.util.success(jsonResult.success);
                        }
                    }
                });
            }
        });
        if (!hasValidInput) {
            TWILIO.util.done();
        }
    }

}(jQuery, window, document));