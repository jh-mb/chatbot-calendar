const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const { text2iso, iso2text } = require("../scripts/utils");
const {
  isDateAvailable,
  getNextAvailableSlot,
} = require("../scripts/calendar");
const { chat } = require("../scripts/chatgpt");

const { formFlow } = require("./form.flow");

const promptBase = `Sos un asistente virtual diseñado para ayudar a los usuarios a agendar citas mediante una conversación.
Tu objetivo unicamente es ayudar al usuario a elegir un horario y una fecha para sacar turno.
Te voy a dar la fecha solicitada por el usuario y la disponibilidad de la misma. Esta fecha la tiene que confirmar el usuario.
Si la disponibilidad es true, entonces responde algo como: La fecha solicitada esta disponible. El turno sería el Jueves 30 de mayo de 2024 a las 10:00hs.
Si la disponibilidad es false, entonces recomenda la siguiente fecha disponible que te dejo al final del prompt, suponiendo que la siguiente fecha disponible es el Jueves, responde con este formato: La fecha y horario no esta disponibles, te puedo ofrecer el Jueves 30 de mayo 2024 a las 11:00hs.
Bajo ninguna circunstancia hagas consultas.
En vez de decir que la disponibilidad es false, envia una disculpa de que esa fecha no esta disponible, y ofrece la siguiente.
Te dejo los estados actualizados de dichas fechas.`;

const confirmationFlow = addKeyword(EVENTS.ACTION).addAnswer(
  "Confirmas la fecha propuesta? Responde unicamente con 'si' o 'no'",
  { capture: true },
  async (ctx, ctxFn) => {
    console.log(ctx.body);
    if (ctx.body.toLowerCase().includes("si")) {
      return await ctxFn.gotoFlow(formFlow);
    } else {
      await ctxFn.endFlow(
        "Reserva cancelada. Volve a solicitar una reserva para elegir otra fecha"
      );
    }
  }
);

const dateFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("Perfecto! Que fecha queres agendar?", { capture: true })
  .addAnswer("Revisando disponibilidad...", null, async (ctx, ctxFn) => {
    const currentDate = new Date();
    const solicitedDate = await text2iso(ctx.body);

    if (solicitedDate.includes("false")) {
      return ctxFn.endFlow("No se pudo deducir una fache. Volver a preguntar.");
    }
    const startDate = new Date(solicitedDate);

    let dateAvailable = await isDateAvailable(startDate);

    if (dateAvailable === false) {
      const nextdateAvaileble = await getNextAvailableSlot(startDate);

      const isoString = nextdateAvaileble.start.toISOString();
      const dateText = await iso2text(isoString);

      const messages = [{ role: "user", content: `${ctx.body}` }];
      const response = await chat(
        promptBase +
          "\nHoy es el dia: " +
          currentDate +
          "\nLa fecha solicitada es: " +
          solicitedDate +
          "\nLa disponibilidad de esa fecha es: false. El proximo espacio disponible que tenes que ofrecer es: " +
          dateText +
          " Da la fecha siempre en español",
        messages
      );
      await ctxFn.flowDynamic(response);
      await ctxFn.state.update({ date: nextdateAvaileble.start });
      return await ctxFn.gotoFlow(confirmationFlow);
    } else {
      console.log(ctx.body, "test");
      const messages = [{ role: "user", content: `${ctx.body}` }];
      const response = await chat(
        promptBase +
          "\nHoy es el dia: " +
          currentDate +
          "\nLa fecha solicitada es: " +
          solicitedDate +
          "\nLa disponibilidad de esa fecha es: true." +
          "\nConfirmacion del cliente: No confirmo.",
        messages
      );
      await ctxFn.flowDynamic(response);
      await ctxFn.state.update({ date: startDate });
      return ctxFn.gotoFlow(confirmationFlow);
    }
  });

module.exports = { dateFlow, confirmationFlow };
