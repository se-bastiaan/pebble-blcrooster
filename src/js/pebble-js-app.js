// 2013 Thomas Hunsaker @thunsaker (original code for Spoon)
// 2013 Sébastiaan Versteeg

var maxAppMessageBuffer = 100;
var maxAppMessageTries = 3;
var appMessageRetryTimeout = 3000;
var appMessageTimeout = 100;
var httpTimeout = 12000;
var appMessageQueue = [];
var day;

function notifyPebbleConnected(token) {
        var transactionId = Pebble.sendAppMessage( { "user_id" : token },
                function(e) {
                        console.log("Successfully delivered token message with transactionId=" + e.data.transactionId);
                },
                function(e) {
                        console.log("Unable to deliver token message with transactionId="
                                                + e.data.transactionId
                                                + " Error is: " + e.error.message);
                        }
                );
}

function processData(data, day) {
        items = data.message; 
        day_value = items[day];
        if(day_value != null && day_value.length > 0) {
                no_lessons = true;
                day_value.forEach(function(hour_value, hour_key, array) {
                        hour = hour_key + 1;
                        if(hour_value !== null && hour_value.length > 0) {
                                no_lessons = false;                                
                                hour_value.forEach(function(lesson_value, lesson_key, array) {
                                        value1 = lesson_value[0]; if(value1 == undefined) value1 = "";
                                        value2 = lesson_value[1]; if(value2 == undefined) value2 = "";
                                        value3 = lesson_value[2]; if(value3 == undefined) value3 = "";
                                        pushMessage(hour_key, hour + ". " + value1, value2, value3);                                        
                                });
                        } else if(checkIfHoursFollowing(hour_key, day_value)) {
                                pushMessage(hour_key, hour + ". Geen les", "", "");
                        }
                }); 
                if(no_lessons) {
                        pushMessage(0, "Geen lessen", "", "");
                }
        }
}

function pushMessage(index, value1, value2, value3) {
        if(isNewList == true) {
                appMessageQueue.push({'message': {'value1': value1, 'value2': value2, 'value3': value3, 'index': index, 'refresh': true }});
        } else {
                appMessageQueue.push({'message': {'value1': value1, 'value2': value2, 'value3': value3, 'index': index }});
        }
}

function checkIfHoursFollowing(key, day) {
        for(i = key; i < day.length; i++) {
                if(day[i] !== null) return true;
        }
        return false;
}

function getData(day) {
	if(navigator.onLine) {
		console.log("Online");
		var userId = localStorage['user_id'].toString();
		var userType = localStorage['user_type'].toString();
		if(userId && userType) {
		        var req = new XMLHttpRequest();
		        var requestUrl = 'http://rooster.se-bastiaan.eu/v1/timetable/' + userType + '/' + userId;
		        req.open('GET', requestUrl, true);
		        req.onload = function(e) {
		                if (req.readyState == 4) {
		                        if (req.status == 200) {
		                                if (req.responseText) {
                                                        console.log(req.responseText);
                                                        var response = JSON.parse(req.responseText);                                                        
                                                        isNewList = true;   
                                                        if(response.success) {
                                                                localStorage["data"] = req.responseText;
                                                                processData(response, day);
                                                        } else {
                                                                console.log('Invalid response received! ' + JSON.stringify(req));
                                                                appMessageQueue.push({'message': {'error': 'Error with request :(' }});
                                                        }
		                                } else {
		                                        console.log('Invalid response received! ' + JSON.stringify(req));
		                                        appMessageQueue.push({'message': {'error': 'Error with request :(' }});
		                                }
		                        } else {
		                                console.log('Request returned error code ' + req.status.toString());
		                        }
		                }
		                sendAppMessage();
		        }
		        
		        req.ontimeout = function() {
		                console.log('HTTP request timed out');
		                appMessageQueue.push({'message': {'error': 'Request timed out!'}});
		                sendAppMessage();
		        };
		        req.onerror = function(e) {
		                console.log('HTTP request return error');
		                appMessageQueue.push({'message': {'error': 'Failed to connect!'}});
		                sendAppMessage();
		        };
		        req.send(null);
		}
	} else {
		console.log("Offline");
                isNewList = true;
                console.log(localStorage["data"]);            

                if(IsJson(localStorage["data"]) && localStorage["data"] != null && localStorage["data"] != "null" && localStorage["data"] != undefined) {
                        var response = JSON.parse(localStorage["data"]);
                        processData(response, day);                                               
                } else {                        
                        localStorage["data"] = null;
                        console.log("invalid data");
                        appMessageQueue.push({'message': {'error': 'Device is offline!'}});
                }
                sendAppMessage(); 
	}
}

function IsJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function sendAppMessage() {
        if (appMessageQueue.length > 0) {
                currentAppMessage = appMessageQueue[0];
                currentAppMessage.numTries = currentAppMessage.numTries || 0;
                currentAppMessage.transactionId = currentAppMessage.transactionId || -1;
                if (currentAppMessage.numTries < maxAppMessageTries) {
                        Pebble.sendAppMessage(
                                currentAppMessage.message,
                                function(e) {
                                        appMessageQueue.shift();
                                        setTimeout(function() {
                                                sendAppMessage();
                                        }, appMessageTimeout);
                                }, function(e) {
                                        console.log('Failed sending AppMessage for transactionId:' + e.data.transactionId + '. Error: ' + e.data.error.message);
                                        appMessageQueue[0].transactionId = e.data.transactionId;
                                        appMessageQueue[0].numTries++;
                                        setTimeout(function() {
                                                sendAppMessage();
                                        }, appMessageRetryTimeout);
                                }
                        );
                } else {
                        console.log('Failed sending AppMessage for transactionId:' + currentAppMessage.transactionId + '. Error: ' + JSON.stringify(currentAppMessage.message));
                }
        }
}

Pebble.addEventListener("ready",
        function(e) {
                if(localStorage["user_id"] || localStorage["user_type"]) {
                        var d = new Date();
                        var day = d.getDay() - 1;
                        if(day < 5 && d.getHours() > 17) day++;
                        if(day < 0 || day > 4) day = 0;
                        getData(day);
                }
        }
);

Pebble.addEventListener("appmessage",
        function(e) {
                console.log("Received message: " + JSON.stringify(e.payload));                
                if (e.payload.refresh) {
                        getData(e.payload.refresh - 1);
                } else if(e.payload.load) {
                        day = e.payload.load - 1;
                        if(IsJson(localStorage["data"]) && localStorage["data"] != null && localStorage["data"] != "null" && localStorage["data"] != undefined) {
                                var response = JSON.parse(localStorage["data"]);
                                processData(response, day);
                                sendAppMessage();                                                
                        } else {                        
                                getData(day);
                        }
                }
        }
);

Pebble.addEventListener("showConfiguration",
        function(e) {
                console.log("Showing config...");
                Pebble.openURL('http://rooster.se-bastiaan.eu/pebble');
        }
);

Pebble.addEventListener("webviewclosed",
        function(e) {
                var configuration = JSON.parse(e.response);
                console.log("Configuration window returned: ", e.response);
                if(configuration['status']) {
                        localStorage["user_id"] = configuration['user'];
			localStorage["user_type"] = configuration['type'];
                        notifyPebbleConnected(localStorage["user_id"])
                        isNewList = true;
                        var d = new Date();
                        var day = d.getDay() - 1;
                        if(day < 5 && d.getHours() > 17) day++;
                        if(day < 0 || day > 4) day = 0;
                        getData(day);
                } else {
                        Pebble.showSimpleNotificationOnPebble("BLC Rooster", ":( Connection Failed. Try Again.");
                }
        }
);
