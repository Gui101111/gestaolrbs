// transformers.js em um arquivo à parte: só baixa quando a transcrição for usada.
import { env, pipeline } from "@huggingface/transformers";

(window as unknown as { TribunaASR: unknown }).TribunaASR = { env, pipeline };
