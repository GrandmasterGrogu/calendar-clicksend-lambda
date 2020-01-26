/*

An Amazon lambda function to send out a recurring SMS text to ClickSend that aggregates Google Calendar items via ics URL.

By Alex X. G.

*/

const ical = require('node-ical');
const moment = require('moment');
const tz = require('moment-timezone');
const request = require('request');

const url = process.env.calendar_url; // Link to ics file
const apikey = process.env.clicksend_api_key;
const userid = process.env.clicksend_username; 
const clicksend_sms_id = process.env.clicksend_sms_id; // Can find via commented out request code around line 60
const campaign_title = process.env.clicksend_campaign_title; // Ex: "Event Reminder"
const text_before_events = process.env.text_before_events; // Ex: "Upcoming Events!<br><br>"
const text_after_events = process.env.text_after_events; // Ex: "<br><br>Reply STOP to opt-out."
const time_value = process.env.time_value; // Integer Ex: 9
const time_period = process.env.time_period; // Ex: days
const timezone = process.env.timezone; // Moment timezone Ex: America/Chicago
const time_format = process.env.time_format; // Moment format Ex: D MMM LT

exports.handler = (event, context, callback) => {
    
     
let count = 0;
let text = text_before_events + ""; // <br> is the same as a carriage return / new line
const now = moment();
const endTimeRange = moment().add(parseInt(time_value), time_period); // Change to another future time period that you want to aggregate
ical.fromURL(url, {}, function (err, data) {
  if (err) console.log(err);

  for (const ysaevent in data) {
    if (data.hasOwnProperty(ysaevent)) {
      const activity = data[ysaevent];
      if (activity.hasOwnProperty('start') && activity.hasOwnProperty('summary') && !activity.hasOwnProperty('rrule')) {
        const theStartTime = moment(activity.start);
        if (theStartTime.isBetween(now, endTimeRange)) {
          const activityLine = theStartTime.tz(timezone).format(time_format) + ', ' + activity.summary; // Set format and time zone here
          console.log(activityLine);
          text += activityLine + "<br>";
          count++;
        }
      }
    } 
  }

if(count<1){
  return false; // If there are no upcoming events in the next X time period, quit!
} else {
  text += text_after_events
}
//console.log("Text: ", text);
  /* To get contact lists ids, if you don't know the ID.
 // https://clicksend.docs.apiary.io/#reference/contact-lists/contact-list-collection/get-all-contact-lists
  request('https://rest.clicksend.com/v3/lists', function (error, response, body) {
    console.log('Status:', response.statusCode);
    console.log('Headers:', JSON.stringify(response.headers));
    console.log('Response:', body);
  });
  */

const textbody = {
  list_id: clicksend_sms_id,
  name: campaign_title + " " + now.tz(timezone).format('Do MMM LT'), // Adding a timestamp to campaign title
  body: text
};
  request({
    method: 'POST',
    url: 'https://rest.clicksend.com/v3/sms-campaigns/send',
    auth: {
      'user': userid,
      'pass': apikey
    },
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(textbody)
  }, function (error, response, body) {
      if(error) {
          callback(error)
      } else {
       callback(null, response)   
      }
    /*console.log('Status:', response.statusCode);
    console.log('Headers:', JSON.stringify(response.headers));
    console.log('Response:', body);
    */
  });
});


};