import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const JobMetadataSchema = z.object({
  level: z
    .enum([
      "Executive",
      "Director",
      "Manager",
      "Principal",
      "Staff",
      "Senior",
      "Mid Level",
      "Entry Level",
      "Internship",
    ])
    .nullable()
    .default(null),
  workPolicy: z.enum(["Remote", "Hybrid", "On-site"]).nullable().default(null),
  yearsExperienceMin: z.number().nullable().default(null),
  skillsRequired: z.array(z.string()).nullable().default(null),
  locationCities: z.array(z.string()).nullable().default(null),
  locationCountries: z.array(z.string()).nullable().default(null),
});

export type JobMetadataParsedResponse = z.infer<typeof JobMetadataSchema>;

export default async function processJobMetadata(
  rawData: string
): Promise<JobMetadataParsedResponse | null> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  try {
    const response = await openai.responses.parse({
      model: "gpt-5-nano",
      input: `Extract the job post information from the following text (skills should not be more than a word or 2 and focus on programming languages and skills like react, aws, etc.; city and country location should be spelled out, not abbreviated):\n\n${rawData}`,
      text: {
        format: zodTextFormat(JobMetadataSchema, "jobMetadata"),
      },
    });
    console.log(response.output_parsed);
    return response.output_parsed ?? null;
  } catch (err) {
    console.error("error with openai job post api call:", err);
    throw err;
  }
}
