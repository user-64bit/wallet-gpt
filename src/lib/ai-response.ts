import { Connection, PublicKey } from "@solana/web3.js";
import triggerCommand from "./commands";
import { GPTResponse } from "./llm";
import { Message } from "../utils/types";

export default async function AIResponse(
  chatHistory: Message[],
  publicKey: PublicKey,
  sendTransaction: any,
  connection: Connection,
) {
  const response = await GPTResponse(chatHistory);
  const parsedResponse = JSON.parse(response?.arguments as string);

  const data = await triggerCommand(
    parsedResponse,
    publicKey,
    sendTransaction,
    connection,
  );
  return data;
}
