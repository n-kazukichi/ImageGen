import { TRPCError } from "@trpc/server";
import { Configuration, OpenAIApi } from "openai";
import { GENERATE_IMAGE_SIZE, MAX_PROMPT_LENGTH } from "~/common/constants";
import { env } from '~/env.mjs';

const configuration = new Configuration({
    apiKey: env.OPENAI_API_KEY
});

const openAi = new OpenAIApi(configuration);

interface GenerateImageOptions {
    prompt: string;
    userId?: string;
    count: number
}

export interface GeneratedImageData {
    blob: Blob,
    url: string;
    prompt: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AI {
    export async function generateImages({ prompt, userId, count }: GenerateImageOptions) {
        const imageResponse = await openAi.createImage({
            prompt,
            n: count,
            response_format: 'url',
            size: GENERATE_IMAGE_SIZE,
            user: userId
        });

        const imageData = imageResponse.data;

        if (imageData.data.length === 0) {
            throw new Error("no were returned from OpenAI");
        }

        console.log("generated images: ", imageData.data);

        const imagesPromises: Promise<GeneratedImageData>[] = [];

        for (const d of imageData.data) {
            const imageUrl = d.url;

            if (imageUrl == null) {
                throw new Error("Image url was null");
            }

            const fetchImage = async () => {
                const res = await fetch(imageUrl);

                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(`Failed to fetch image (${res.statusText}) ${imageUrl}: ${error}`);
                }

                const imageBlob = await res.blob();

                return {
                    blob: imageBlob,
                    url: imageUrl,
                    prompt
                }
            }

            imagesPromises.push(fetchImage());
        }

        const result = await Promise.all(imagesPromises);
        console.log(`${result.length} images were generated for prompt: ${prompt}`);
        return result;
    }

    export async function moderateContent(input: string) {
        const moderationResponse = await openAi.createModeration({
            input
        });

        const data = moderationResponse.data;
        const isFlagged = data.results.some(x => x.flagged === true);

        return {
            results: data.results,
            isFlagged
        }
    }

    export async function improveImagePrompt({ prompt, userId }: { prompt: string, userId: string }) {
        console.log(`Prompt to update: ${prompt}`);

        const ERROR_MESSAGE = "[INVALID PROMPT]";
        const response = await openAi.createChatCompletion({
            model: 'gpt-3.5-turbo',
            user: userId,
            temperature: 1.6,
            messages: [
                {
                    // We seed the max characters but currently the AI may not be able to infer that
                    role: 'system',
                    content: `You are an assistant that improve image generation prompts, for a given
                    prompt you MUST return a more detailed version in a single paragraph with less than ${MAX_PROMPT_LENGTH} characters
                    of text with more details if not specified but if the prompt is not a valid
                    word or phrase return the text: "${ERROR_MESSAGE}".`
                },
                {
                    role: 'assistant',
                    content: prompt
                }
            ]
        });

        const data = response.data;
        const choice = data.choices[0];
        const content = choice?.message?.content;

        console.log(`Updated prompt content: '${content ?? ""}'`);

        if (content == null) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "Invalid OpenAI response" });
        }

        if (content.includes(ERROR_MESSAGE)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: "No enough context to improve the prompt" })
        }

        return content;
    }
}
