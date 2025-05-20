import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import fs from "fs";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { OpenAI } from "openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import "dotenv/config";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });
const llm = new ChatOpenAI({
  apiKey,
  model: "gpt-4.1",
  temperature: 0.2,
});

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
  id: 5,
  clinic_id: 14,
  name: "شرح حال اولیه ",
  description: null,
  elements: [
    {
      name: "DateTimeField",
      Visible: true,
      Required: false,
      editItem: null,
      editable: false,
      Description: null,
      ElementType: 4,
      CalendarType: 1,
      DefaultValue: null,
      DisplayLabel: "انتخاب تاریخ",
      ComputeFormula: null,
      UseCurrentDateTime: true,
    },
    {
      name: "FileUpload",
      Visible: true,
      Required: true,
      editItem: {
        name: "FileUpload",
        Visible: true,
        Required: true,
        editable: true,
        fileSize: 10,
        multiple: false,
        Description: null,
        ElementType: 7,
        placeholder: "Drop files here...",
        DefaultValue: null,
        DisplayLabel: "بارگذاری",
        ComputeFormula: null,
      },
      editable: true,
      fileSize: 1,
      multiple: false,
      Description: null,
      ElementType: 7,
      placeholder: "Drop files here...",
      DefaultValue: null,
      DisplayLabel: "FileUpload",
      ComputeFormula: null,
    },
    {
      name: "HtmlEditor",
      Visible: true,
      Required: true,
      editItem: null,
      editable: false,
      Description: null,
      ElementType: 8,
      placeholder: "شروع به نوشتن کنید...",
      DefaultValue: null,
      DisplayLabel: "توضیحات ",
      ComputeFormula: null,
    },
  ],
  created_at: "2021-03-14 09:20:16",
  updated_at: "2025-04-26 17:10:50",
};

const testForm = {
  id: 999,
  clinic_id: 1,
  name: "شرح حال اولیه",
  description: null,
  elements: [
    {
      name: "FullName",
      ElementType: 1,
      DisplayLabel: "نام کامل",
      placeholder: "مثال: علی رضایی",
      Required: true,
      Visible: true,
      editable: true,
      DefaultValue: "",
    },
    {
      name: "Age",
      ElementType: 2,
      DisplayLabel: "سن",
      Required: true,
      Visible: true,
      editable: true,
      DefaultValue: null,
    },
    {
      name: "MaritalStatus",
      ElementType: 3,
      DisplayLabel: "حالت تاهل",
      Required: true,
      Visible: true,
      editable: true,
      Options: ["مجرد", "متاهل", "دیگر"],
      DefaultValue: "متاهل",
    },
    {
      name: "DateOfVisit",
      ElementType: 4,
      DisplayLabel: "تاریخ مراجعه",
      Required: false,
      Visible: true,
      UseCurrentDateTime: true,
      editable: false,
    },
    {
      name: "UploadDocument",
      ElementType: 7,
      DisplayLabel: "آپلود مدارک",
      placeholder: "فایل را اینجا بکشید...",
      Required: false,
      Visible: true,
      editable: true,
      fileSize: 10,
      multiple: true,
    },
    {
      name: "MedicalHistory",
      ElementType: 8,
      DisplayLabel: "توضیحات پزشکی",
      placeholder: "شرح حال بیمار را وارد کنید...",
      Required: true,
      Visible: true,
      editable: true,
    },
    {
      name: "Symptoms",
      ElementType: 9,
      DisplayLabel: "علائم",
      Required: false,
      Visible: true,
      editable: true,
      Options: ["سردرد", "تب", "درد قفسه سینه", "سرفه"],
    },
    {
      name: "HasInsurance",
      ElementType: 10,
      DisplayLabel: "آیا بیمه دارد؟",
      Required: false,
      Visible: true,
      editable: true,
    },
    {
      name: "Rating",
      ElementType: 11,
      DisplayLabel: "امتیاز رضایت",
      Required: false,
      Visible: true,
      editable: true,
      MaxStars: 5,
    },
    {
      name: "EmailAddress",
      ElementType: 12,
      DisplayLabel: "ایمیل",
      placeholder: "example@example.com",
      Required: false,
      Visible: true,
      editable: true,
    },
    {
      name: "Tags",
      ElementType: 13,
      DisplayLabel: "برچسب‌ها",
      placeholder: "برچسب‌ها را وارد کنید",
      Required: false,
      Visible: true,
      editable: true,
      DefaultValue: [],
    },
  ],
  created_at: "2025-05-13 12:00:00",
  updated_at: "2025-05-13 12:00:00",
};

async function callStructuredOutput() {
  const form_id = 2;
  const transcriptText = await convert("./test2.m4a");

  const cleanVoicePrompt = ChatPromptTemplate.fromTemplate(`
    You are given a voice transcript from a user. Your tasks are:
    
    1. Correct grammar mistakes in any language.
    2. Normalize any email addresses: convert spoken or localized formats like "جیمیل دات کام" or "gmail dot com" into standard email format like "example@gmail.com"
    3. Make sure units (like height) and formats (like date) are consistent and understandable.

    voice text: {voice_text}
    `);

  const cleanVoiceChain = cleanVoicePrompt
    .pipe(llm)
    .pipe(new StringOutputParser());
  
  const today = new Date().toISOString().split('T')[0];

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are a specialist in medical data extraction and form filling for hospital systems.
    Your task is to accurately extract structured form data from a patient's spoken voice transcript.
    You are given a voice transcript text and a JSON definition of a form.
    
    Form definition:
    {form_format}

    ## RULES:
    - ‌Based on the text fill the values of the form.
    - According to the form definition all fields should be filled.
    - Do NOT translate any field values.
    - Fields should be in english always.
    - Be carefull when you fill the date fields it should be exact date time that match an input type date.
    - Today is ${today}.
    - Preserve the original language of the transcript text when assigning field values.
    - Values can be any type (string, number, array, boolean...) based on the voice text.

    Return ONLY a valid JSON in this structure:
    object of fields(
      field_name_1: value,
      field_name_2: value,
      ...
    )

  Voice transcript: {text}
  `);

  const parser = new JsonOutputParser();

  const answerChain = prompt.pipe(llm).pipe(parser);

  const chain = RunnableSequence.from([
    cleanVoiceChain,
    (input) => ({ text: input, form_format: testForm }),
    answerChain,
  ]);

  const response = await chain.invoke({
    voice_text: transcriptText,
  });

  console.log("Final Parsed Output:");
  console.dir(response, { depth: null });
}

await callStructuredOutput();
