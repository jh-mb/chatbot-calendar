require("dotenv").config();
const OpenAi = require("openai");

const openaiApiKey = process.env.OPENAI_API_KEY;

const chat = async (prompt, messages) => {
  try {
    const openai = new OpenAi({
      apiKey: openaiApiKey,
    });
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }, ...messages],
    });
    const answ = completion.choices[0].message.content;
    return answ;
  } catch (error) {
    console.log("Error al conectar OpenAi: ", error);
    return "ERROR";
  }
};

module.exports = { chat };
