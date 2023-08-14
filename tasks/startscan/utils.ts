import * as request from "request";

export const countAndGroupByTitle = (arr) => {
    try {
      const result = [];
    arr.forEach((obj) => {
      const title = obj.issue_state.weakness_id;
      const severity = obj.issue_state.severity;
      if (!result.find((o) => o.title === title)) {
        result.push({
          title: title,
          count: 1,
          severity: severity,
        });
      } else {
        const item = result.find((o) => o.title === title);
        item.count++;
      }
    });
    return result;
    } catch (error) {
      console.log("countAndGroupByTitle -- " + error)
    }
  };
  
export const convertToHHMMSS = (endedAt, startedAt) => {
    try {
      let durationInMilliseconds = endedAt - startedAt;
    let durationInMinutes = durationInMilliseconds / (1000 * 60);
    let hours = Math.floor(durationInMinutes / 60);
    let minutes = Math.floor(durationInMinutes % 60);
    let seconds = Math.floor((durationInMilliseconds % (1000 * 60)) / 1000);
    return (
      hours.toString().padStart(2, "0") +
      ":" +
      minutes.toString().padStart(2, "0") +
      ":" +
      seconds.toString().padStart(2, "0")
    );
    } catch (error) {
      console.log("convertToHHMMSS --- " + error)
    }
  };
  
export const scores = [
    {
      score: "A+",
      startingPerc: 97,
      endingPerc: 100,
      color: "#109146",
    },
    {
      score: "A",
      startingPerc: 93,
      endingPerc: 96,
      color: "#109146",
    },
    {
      score: "A-",
      startingPerc: 90,
      endingPerc: 92,
      color: "#7DBC41",
    },
    {
      score: "B+",
      startingPerc: 87,
      endingPerc: 89,
      color: "#7DBC41",
    },
    {
      score: "B",
      startingPerc: 83,
      endingPerc: 86,
      color: "#7DBC41",
    },
    {
      score: "B-",
      startingPerc: 80,
      endingPerc: 82,
      color: "#FFCC06",
    },
    {
      score: "C+",
      startingPerc: 77,
      endingPerc: 79,
      color: "#FFCC06",
    },
    {
      score: "C",
      startingPerc: 73,
      endingPerc: 76,
      color: "#FFCC06",
    },
    {
      score: "C-",
      startingPerc: 70,
      endingPerc: 72,
      color: "#F58E1D",
    },
    {
      score: "D+",
      startingPerc: 67,
      endingPerc: 69,
      color: "#F58E1D",
    },
    {
      score: "D",
      startingPerc: 63,
      endingPerc: 66,
      color: "#EF4722",
    },
    {
      score: "D-",
      startingPerc: 60,
      endingPerc: 62,
      color: "#EF4722",
    },
    {
      score: "F",
      startingPerc: 0,
      endingPerc: 59,
      color: "#BD2026",
    },
  ];
  
export const getScore = (percentage) => {
    try {
      for (let i = 0; i < scores.length; i++) {
        if (
          percentage >= scores[i].startingPerc &&
          percentage <= scores[i].endingPerc
        ) {
          return scores[i];
        }
      }
    } catch (error) {
      console.log("getScore --- " + error)
    }
  };
  
export const countBySeverity = (arr) => {
    try {
      const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
      for (const obj of arr) {
        if (obj.severity) {
          counts[obj.severity] += obj.count;
        }
      }
      return counts;
    } catch (error) {
      console.log("countBySeverity --- " + error)
    }
  };
   
export const findWeaknessTitles = (arr, keywords) => {
    try {
      const regexArray = keywords.map((str) => new RegExp(str));
  
    let failedWeaknesss = [];
  
    arr.forEach((element) => {
      const found = regexArray.find((r) => {
        return r.test(element.issue_state.weakness_id);
      });
      if (found) failedWeaknesss.push(element);
    });
  
    return failedWeaknesss;
    } catch (error) {
      console.log("findWeaknessTitles --- " + error)
    }
  };

export const cL = (value,value1) => {
    let valueLength = value.toString().length
    let valueLength1 = value1.toString().length
    let space = "\xa0".repeat(12-valueLength)
    let space1 = "\xa0".repeat(12-valueLength1)
    let result = `\xa0${value}${space}\xa0${value1}${space1}`
    return result;
}