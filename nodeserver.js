/*const http = require('http');

const hostname = '127.0.0.1';

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});
*/

const csv = require('csv-parser');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'users.csv',
  header: [
    {id: 'name', title: 'Name'},
    {id: 'surname', title: 'Surname'},
    {id: 'cntno', title: 'Contact No'},
    {id: 'emailId', title: 'Email ID'},
  ]
});

var usersData = [];
const sampleData = [
{
	name: 'Foo',
	surname: 'Bar',
	cntno: 9876543210,
	emailId: 'foobar@foo.bar'
}];

fs.stat("users.csv", (error, stats) => {
	if(error){
		csvWriter
		  .writeRecords(sampleData)
		  .then(()=> console.log('The csv file has been created Successfully'));
	} else{
		fs.createReadStream('users.csv')
		  .pipe(csv())
		  .on('data', (row) => {
		  	usersData.push(row);
		  })
		  .on('end', () => {
		    console.log('CSV file successfully processed');
		  });
	}
});

const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('online'));
app.post('/webhook', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function welcome () {
    agent.add('Welcome to my agent!');
  }

  function storeUserInfo(agent){
  	let givenName = agent.parameters["given-name"];
  	let lastName = agent.parameters["last-name"];
  	let emailId = agent.parameters["email"];
  	let cntno = agent.parameters["phone-number"];
  	
  	usersData.push({
  		name: givenName,
  		surname: lastName,
  		emailId: emailId,
  		cntno: cntno
  	});

	csvWriter
	  .writeRecords(usersData)
	  .then(()=> console.log('The CSV file was written successfully'));

  	agent.add("Hi ${givenName} ${lastName}, your contact no is ${cntno} and your email is ${emailId}. Thank you for registering as a ${agent.contexts}");
  }

  function schAppoint(agent){
  	let modeAppoint = agent.parameters["modeOfAppoint"];
  	let profession = agent.parameters["professions"];
  	console.log(modeAppoint + " | " + profession);
  	if (profession == "doctor"){
  		agent.add("Connecting you to a " + profession);
  		console.log("Schedule an appoointment with a doctor");
  	} else if (profession == "Pharmacy"){
  		agent.add("Conneecting you to a Clinic");
  		console.log("Schedule an appoointment with a clinic");
  	}
  }
  /*function cardFunc(agent) {
    agent.add(`This message is from Dialogflow's Cloud Functions for Firebase inline editor!`);
    agent.add(new Card({
        title: `Title: this is a card title`,
        imageUrl: 'https://dialogflow.com/images/api_home_laptop.svg',
        text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
        buttonText: 'This is a button',
        buttonUrl: 'https://docs.dialogflow.com/'
      });
    );
    agent.add(new Suggestion(`Quick Reply`));
    agent.add(new Suggestion(`Suggestion`));
    agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  }*/
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('UserInfo', storeUserInfo);
  intentMap.set('appointmentscheduler', schAppoint)
  agent.handleRequest(intentMap);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

/* Firebase included bike webhook
'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');

// Enter your calendar ID below and service account JSON below, see https://github.com/dialogflow/bike-shop/blob/master/README.md#calendar-setup
const calendarId = '<INSERT CALENDAR ID HERE>'; // looks like "6ujc6j6rgfk02cp02vg6h38cs0@group.calendar.google.com"
const serviceAccount = {}; // Starts with {"type": "service_account",...

// Set up Google Calendar Service account credentials
const serviceAccountAuth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: 'https://www.googleapis.com/auth/calendar'
});

const calendar = google.calendar('v3');
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements

const timeZone = 'America/Los_Angeles';
const timeZoneOffset = '-07:00';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });

  function hours (agent) {
    if (currentlyOpen()) {
      agent.add(`We're open now! We close at 5pm today.`);
    } else {
      agent.add(`We're currently closed, but we open every weekday at 9am!`);
    }
  }

  function makeAppointment (agent) {
    // Calculate appointment start and end datetimes (end = +1hr from start)
    const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
    const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
    const appointmentTimeString = dateTimeStart.toLocaleString(
      'en-US',
      { month: 'long', day: 'numeric', hour: 'numeric', timeZone: timeZone }
    );

    // Check the availibility of the time, and make an appointment if there is time on the calendar
    return createCalendarEvent(dateTimeStart, dateTimeEnd).then(() => {
      agent.add(`Ok, let me see if we can fit you in. ${appointmentTimeString} is fine!. Do you need a repair or just a tune-up?`);
    }).catch(() => {
      agent.add(`I'm sorry, there are no slots available for ${appointmentTimeString}.`);
    });
  }

  let intentMap = new Map();
  intentMap.set('Hours', hours);
  intentMap.set('Make Appointment', makeAppointment);
  agent.handleRequest(intentMap);
});

function currentlyOpen () {
  // Get current datetime with proper timezone
  let date = new Date();
  date.setHours(date.getHours() + parseInt(timeZoneOffset.split(':')[0]));
  date.setMinutes(date.getMinutes() + parseInt(timeZoneOffset.split(':')[0][0] + timeZoneOffset.split(':')[1]));

  return date.getDay() >= 1 &&
        date.getDay() <= 5 &&
        date.getHours() >= 9 &&
        date.getHours() <= 17;
}

function createCalendarEvent (dateTimeStart, dateTimeEnd) {
  return new Promise((resolve, reject) => {
    calendar.events.list({
      auth: serviceAccountAuth, // List events for time period
      calendarId: calendarId,
      timeMin: dateTimeStart.toISOString(),
      timeMax: dateTimeEnd.toISOString()
    }, (err, calendarResponse) => {
      // Check if there is a event already on the Bike Shop Calendar
      if (err || calendarResponse.data.items.length > 0) {
        reject(err || new Error('Requested time conflicts with another appointment'));
      } else {
        // Create event for the requested time period
        calendar.events.insert({ auth: serviceAccountAuth,
          calendarId: calendarId,
          resource: {summary: 'Bike Appointment',
            start: {dateTime: dateTimeStart},
            end: {dateTime: dateTimeEnd}}
        }, (err, event) => {
          err ? reject(err) : resolve(event);
        }
        );
      }
    });
  });
}
*/
