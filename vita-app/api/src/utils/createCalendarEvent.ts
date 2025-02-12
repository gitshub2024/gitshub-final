import { CalendarCredentialsModel } from '../Models/CalendarCredentials';
const { OAuth2 } = google.auth;
import { google } from 'googleapis';

import { CalendarOptionTypes } from '../types';
import path from 'path';

const createCalenderEvent = async (options: CalendarOptionTypes) => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',

      universe_domain: 'googleapis.com',
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    clientOptions: {
      subject: 'fredysomy@gmail.com',
    },
  });

  const client = await auth.getClient();

  const calendar: any = google.calendar({ version: 'v3', auth: client });

  const event = {
    summary: options.summary,
    location: 'Virtual / Google Meet',
    description: options.description,
    start: {
      dateTime: options.startTime,
    },
    end: {
      dateTime: options.endTime,
    },
    attendees: options.attendeesEmails,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
    conferenceData: {
      createRequest: {
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
        requestId: 'coding-calendar-demo',
      },
    },
  };

  const response = await calendar.events.insert({
    auth: client,
    calendarId:
      '3b957eaf693a1acae6b93b642377fe1042a6eaecb8d54f057f22ec5a69644694@group.calendar.google.com',
    resource: event,
    conferenceDataVersion: 1,
    sendNotifications: true,
  });
  console.log(response);
  return response.data;
};

export default createCalenderEvent;
