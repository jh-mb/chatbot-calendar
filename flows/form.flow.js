const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const { createEvent } = require("../scripts/calendar");

const formFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    "Excelente! Gracias por confirmar la fecha. Te voy a hacer unas consultas para agendar la reunion. Primero, Cual es tu nombre?",
    { capture: true },
    async (ctx, ctxFn) => {
      await ctxFn.state.update({ name: ctx.body });
    }
  )
  .addAnswer(
    "Perfecto, Cual es el motivo de la reunion?",
    { capture: true },
    async (ctx, ctxFn) => {
      await ctxFn.state.update({ motive: ctx.body });
    }
  )
  .addAnswer(
    "Excelente! Ya cree la reunion. Te espero!",
    null,
    async (ctx, ctxFn) => {
      const userInfo = await ctxFn.state.getMyState();
      const eventName = userInfo.name;
      const description = userInfo.motive;
      const date = userInfo.date;
      const eventId = await createEvent(eventName, description, date);
      await ctxFn.state.clear();
    }
  );

module.exports = { formFlow };
