import { useState, useEffect, useCallback } from 'react';
import { isToday, isTomorrow, parseISO, differenceInMinutes } from 'date-fns';

export interface CalendarEvent {
  id: number;
  name: string;
  time: string;
  datetime: string;
  type?: 'user' | 'ai' | 'task';
  reminderSent?: boolean;
}

export interface CalendarData {
  day: Date;
  events: CalendarEvent[];
}

const STORAGE_KEY = 'calendar_events';
const REMINDER_CHECK_INTERVAL = 60000; // Check every minute

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarData[]>([]);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);

  // Load events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const converted = parsed.map((item: any) => ({
          ...item,
          day: new Date(item.day),
        }));
        setEvents(converted);
      } catch (error) {
        console.error('Error loading calendar events:', error);
      }
    }
  }, []);

  // Save events to localStorage
  const saveEvents = useCallback((newEvents: CalendarData[]) => {
    setEvents(newEvents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
  }, []);

  // Add new event
  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>, day: Date) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now(),
      reminderSent: false,
    };

    const existingDayIndex = events.findIndex(
      (e) => e.day.toDateString() === day.toDateString()
    );

    let newEvents: CalendarData[];
    if (existingDayIndex >= 0) {
      newEvents = [...events];
      newEvents[existingDayIndex].events.push(newEvent);
    } else {
      newEvents = [...events, { day, events: [newEvent] }];
    }

    saveEvents(newEvents);
    return newEvent;
  }, [events, saveEvents]);

  // Delete event
  const deleteEvent = useCallback((eventId: number) => {
    const newEvents = events.map((dayData) => ({
      ...dayData,
      events: dayData.events.filter((e) => e.id !== eventId),
    })).filter((dayData) => dayData.events.length > 0);

    saveEvents(newEvents);
  }, [events, saveEvents]);

  // Check for upcoming events and send notifications
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      let count = 0;
      const updatedEvents = [...events];
      let hasChanges = false;

      updatedEvents.forEach((dayData) => {
        dayData.events.forEach((event) => {
          const eventDate = parseISO(event.datetime);
          const minutesUntil = differenceInMinutes(eventDate, now);

          // Count upcoming events for today and tomorrow
          if (isToday(eventDate) || isTomorrow(eventDate)) {
            count++;
          }

          // Send notification if event is within 30 minutes and not yet notified
          if (minutesUntil <= 30 && minutesUntil > 0 && !event.reminderSent) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Rappel: ${event.name}`, {
                body: `L'événement commence dans ${minutesUntil} minutes`,
                icon: '/favicon.ico',
                tag: `event-${event.id}`,
              });
            }
            event.reminderSent = true;
            hasChanges = true;
          }
        });
      });

      setUpcomingEventsCount(count);

      if (hasChanges) {
        saveEvents(updatedEvents);
      }
    };

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkReminders();
    const interval = setInterval(checkReminders, REMINDER_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [events, saveEvents]);

  // Add AI task to calendar
  const addAITask = useCallback((taskName: string, date: Date, time: string) => {
    return addEvent(
      {
        name: taskName,
        time,
        datetime: date.toISOString(),
        type: 'ai',
      },
      date
    );
  }, [addEvent]);

  return {
    events,
    addEvent,
    deleteEvent,
    addAITask,
    upcomingEventsCount,
  };
};
