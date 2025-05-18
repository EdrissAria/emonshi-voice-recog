import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import fs from "fs";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { OpenAI } from "openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });
const llm = new ChatOpenAI({ apiKey });

async function convert(filepath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: "whisper-1",
      response_format: "json",
    });

    console.log("🎙️ Voice Transcript: ", transcription.text);
    return transcription.text;
  } catch (e) {
    console.error("❌ Transcription Error: ", e);
  }
}

const form = {
  form_id: 3,
  fields: [
    {
      label: "name",
      required: true,
      placeholder: "your name"
    },
    {
      label: "email",
      required: true,
      placeholder: "your email"
    },
    {
      label: "illness",
      required: true,
      placeholder: "your illness"
    },
    {
      label: "decription",
      required: false,
      placeholder: "descrition"
    }
  ]
}

async function callStructuredOutput() {
  const form_id = 2;
  const transcriptText = await convert("./test3.m4a");

  const cleanVoicePrompt = ChatPromptTemplate.fromTemplate(`
    You are given a voice transcript from a user. Your tasks are:
    
    1. Correct grammar mistakes in any language.
    2. Normalize any email addresses: convert spoken or localized formats like "جیمیل دات کام" or "gmail dot com" into standard email format like "example@gmail.com"
    3. Make sure units (like height) and formats (like date) are consistent and understandable.

    voice text: {voice_text}
    `);

  const cleanVoiceChain = cleanVoicePrompt.pipe(llm).pipe(new StringOutputParser());
  

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are given a voice transcript text.
    Based on the text and according to this form information: {form_format}, 
    from the transcript **exactly as spoken**, without translating or changing the language.
  
    Return ONLY a valid JSON in this structure:
    object of fields(
      field_name_1: value,
      field_name_2: value,
      ...
    )
  
    ## IMPORTANT:
    - Do NOT translate any field values.
    - Preserve the original language of the transcript text when assigning field values.
    - Values can be any type (string, number, array, boolean...) based on the voice text.
  
    Voice transcript: {text}
  `)
  

  const parser = new JsonOutputParser();

  const answerChain = prompt.pipe(llm).pipe(parser);

  const chain = RunnableSequence.from([
    cleanVoiceChain,
    (input) => ({text: input, form_format: form}),
    answerChain
  ])

  const response = await chain.invoke({
    voice_text: transcriptText,
  });

  console.log("🧠 Final Parsed Output:");
  console.dir(response, { depth: null });
}

await callStructuredOutput();
