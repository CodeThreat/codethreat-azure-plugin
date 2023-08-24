"use strict";
exports.__esModule = true;
exports.cL = exports.findWeaknessTitles = exports.countBySeverity = exports.getScore = exports.scores = exports.convertToHHMMSS = exports.countAndGroupByTitle = void 0;
exports.countAndGroupByTitle = function (arr) {
    try {
        var result_1 = [];
        arr.forEach(function (obj) {
            var title = obj.issue_state.weakness_id;
            var severity = obj.issue_state.severity;
            if (!result_1.find(function (o) { return o.title === title; })) {
                result_1.push({
                    title: title,
                    count: 1,
                    severity: severity
                });
            }
            else {
                var item = result_1.find(function (o) { return o.title === title; });
                item.count++;
            }
        });
        return result_1;
    }
    catch (error) {
        console.log("countAndGroupByTitle -- " + error);
    }
};
exports.convertToHHMMSS = function (endedAt, startedAt) {
    try {
        var durationInMilliseconds = endedAt - startedAt;
        var durationInMinutes = durationInMilliseconds / (1000 * 60);
        var hours = Math.floor(durationInMinutes / 60);
        var minutes = Math.floor(durationInMinutes % 60);
        var seconds = Math.floor((durationInMilliseconds % (1000 * 60)) / 1000);
        return (hours.toString().padStart(2, "0") +
            ":" +
            minutes.toString().padStart(2, "0") +
            ":" +
            seconds.toString().padStart(2, "0"));
    }
    catch (error) {
        console.log("convertToHHMMSS --- " + error);
    }
};
exports.scores = [
    {
        score: "A+",
        startingPerc: 97,
        endingPerc: 100,
        color: "#109146"
    },
    {
        score: "A",
        startingPerc: 93,
        endingPerc: 96,
        color: "#109146"
    },
    {
        score: "A-",
        startingPerc: 90,
        endingPerc: 92,
        color: "#7DBC41"
    },
    {
        score: "B+",
        startingPerc: 87,
        endingPerc: 89,
        color: "#7DBC41"
    },
    {
        score: "B",
        startingPerc: 83,
        endingPerc: 86,
        color: "#7DBC41"
    },
    {
        score: "B-",
        startingPerc: 80,
        endingPerc: 82,
        color: "#FFCC06"
    },
    {
        score: "C+",
        startingPerc: 77,
        endingPerc: 79,
        color: "#FFCC06"
    },
    {
        score: "C",
        startingPerc: 73,
        endingPerc: 76,
        color: "#FFCC06"
    },
    {
        score: "C-",
        startingPerc: 70,
        endingPerc: 72,
        color: "#F58E1D"
    },
    {
        score: "D+",
        startingPerc: 67,
        endingPerc: 69,
        color: "#F58E1D"
    },
    {
        score: "D",
        startingPerc: 63,
        endingPerc: 66,
        color: "#EF4722"
    },
    {
        score: "D-",
        startingPerc: 60,
        endingPerc: 62,
        color: "#EF4722"
    },
    {
        score: "F",
        startingPerc: 0,
        endingPerc: 59,
        color: "#BD2026"
    },
];
exports.getScore = function (percentage) {
    try {
        for (var i = 0; i < exports.scores.length; i++) {
            if (percentage >= exports.scores[i].startingPerc &&
                percentage <= exports.scores[i].endingPerc) {
                return exports.scores[i];
            }
        }
    }
    catch (error) {
        console.log("getScore --- " + error);
    }
};
exports.countBySeverity = function (arr) {
    try {
        var counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var obj = arr_1[_i];
            if (obj.severity) {
                counts[obj.severity] += obj.count;
            }
        }
        return counts;
    }
    catch (error) {
        console.log("countBySeverity --- " + error);
    }
};
exports.findWeaknessTitles = function (arr, keywords) {
    try {
        var regexArray_1 = keywords.map(function (str) { return new RegExp(str); });
        var failedWeaknesss_1 = [];
        arr.forEach(function (element) {
            var found = regexArray_1.find(function (r) {
                return r.test(element.issue_state.weakness_id);
            });
            if (found)
                failedWeaknesss_1.push(element);
        });
        return failedWeaknesss_1;
    }
    catch (error) {
        console.log("findWeaknessTitles --- " + error);
    }
};
exports.cL = function (value, value1) {
    var valueLength = value.toString().length;
    var valueLength1 = value1.toString().length;
    var space = "\xa0".repeat(12 - valueLength);
    var space1 = "\xa0".repeat(12 - valueLength1);
    var result = "\u00A0" + value + space + "\u00A0" + value1 + space1;
    return result;
};
