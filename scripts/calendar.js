const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "./google.json",
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3" });

const calendarId =
  "1308f0d176a9c6331c28de0cbcaf2141a78cae638079ffbed66f1e9dc74a9d83@group.calendar.google.com";
const timeZone = "America/Argentina/Buenos_Aires";

const rangeLimit = {
  days: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 18,
};

const standardDuration = 1;
const dateLimit = 30;

/**
 * @param {string} eventName - Nombre del evento.
 * @param {string} description - Descripcion del evento.
 * @param {string} date - Fecha y hora del evento en formato ISO.
 * @param {number} [duration=standardDuration] - Duracion del evento en horas.
 * @returns {string} - URL de la invitacion al evento.
 */

async function createEvent(
  eventName,
  description,
  date,
  duration = standardDuration
) {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const startDateTime = new Date(date);

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + duration);

    const event = {
      summary: eventName,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timeZone,
      },
      colorId: "2",
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    const eventId = response.data.id;
    console.log("Evento creado con exito");
    return eventId;
  } catch (error) {
    console.log("Error al crear el evento del calendar: ", error);
    throw error;
  }
}

async function listAvailableSlots(startDate = new Date(), endDate) {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + dateLimit);
    }

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: timeZone,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items;
    const slots = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay();
      if (rangeLimit.days.includes(dayOfWeek)) {
        for (
          let hour = rangeLimit.startHour;
          hour < rangeLimit.endHour;
          hour++
        ) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + standardDuration);

          const isBusy = events.some((event) => {
            const eventStart = new Date(
              event.start.dateTime || event.start.date
            );
            const eventEnd = new Date(event.end.dateTime || event.end.date);
            return slotStart < eventEnd && slotEnd > eventStart;
          });

          if (!isBusy) {
            slots.push({ start: slotStart, end: slotEnd });
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  } catch (error) {
    console.log("Error al contactar el servicio de Calendar: " + error);
    throw error;
  }
}

async function getNextAvailableSlot(date) {
  try {
    if (typeof date === "string") {
      date = new Date(date);
    } else if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("La fecha proporcinada no es valida");
    }

    const availableSlots = await listAvailableSlots(date);

    const filteredSlots = availableSlots.filter(
      (slot) => new Date(slot.start) > date
    );

    const sortedSlots = filteredSlots.sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    return sortedSlots.length > 0 ? sortedSlots[0] : null;
  } catch (error) {
    console.error("Error al obtener el proximo slot disponible: " + error);
    throw error;
  }
}

async function isDateAvailable(date) {
  try {
    const currentDate = new Date();
    const maxDate = new Date(currentDate);
    maxDate.setDate(currentDate.getDate() + dateLimit);

    if (
      date.getTime() < currentDate.getTime() ||
      date.getTime() > maxDate.getTime()
    ) {
      return false;
    }

    const dayOfWeek = date.getDay();
    if (!rangeLimit.days.includes(dayOfWeek)) {
      return false;
    }

    const hour = date.getHours();
    if (hour < rangeLimit.startHour || hour >= rangeLimit.endHour) {
      return false;
    }

    const availableSlots = await listAvailableSlots(currentDate);

    const slotsOnGivenDate = availableSlots.filter(
      (slot) => new Date(slot.start).toDateString() === date.toDateString()
    );

    const isSlotAvailable = slotsOnGivenDate.some(
      (slot) =>
        new Date(slot.start).getTime() === date.getTime() &&
        new Date(slot.end).getTime() ===
          date.getTime() + standardDuration * 60 * 60 * 1000
    );

    return isSlotAvailable;
  } catch (error) {
    console.log("Error al verificar disponibilidad: " + error);
    throw error;
  }
}

module.exports = { createEvent, isDateAvailable, getNextAvailableSlot };
