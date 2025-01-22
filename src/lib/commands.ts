import {
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  ExtensionType,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";

import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { getBalance, getLastXTransactions } from "../utils/helper";

interface CommandProps {
  [key: string]: string;
}

export default async function triggerCommand(
  data: CommandProps,
  publicKey: PublicKey,
  sendTransaction: any,
  connection: Connection,
) {
  if (!publicKey) {
    return {
      message: "Please connect your wallet.",
      status: "error",
    };
  }
  const { action } = data;
  let response;
  switch (action) {
    case "send":
      response = await handleSendCommand(
        data,
        publicKey,
        sendTransaction,
        connection,
      );
      return response;
    case "buy":
      response = await handleBuyCommand();
      return response;
    case "swap":
      response = await handleSwapCommand();
      return response;
    case "create_token":
      response = await handleCreateTokenBatchTransactionCommand(
        data,
        publicKey,
        connection,
        sendTransaction,
      );
      return response;
    case "check_balance":
      response = await handleCheckBalanceCommand(publicKey, connection);
      return response;
    case "get_address":
      response = await handleGetAddressCommand(publicKey);
      return response;
    case "transaction_status":
      response = await handleTransactionStatusCommand(publicKey, connection);
      return response;
    case "recent_transaction":
      response = await handleRecentTransactionCommand(publicKey, connection);
      return response;
    default:
      response = {
        message: data.message,
        status: "error",
      };
      return response;
  }
}

const handleSendCommand = async (
  data: CommandProps,
  publicKey: PublicKey,
  sendTransaction: any,
  connection: Connection,
) => {
  const { amount, toPublicKey } = data;
  if (!amount || !toPublicKey) {
    return {
      message: "Please provide the amount and recipient address.",
      status: "error",
    };
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      message: "Invalid amount. Please provide a valid amount.",
      status: "error",
    };
  }
  try {
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(toPublicKey),
        lamports: LAMPORTS_PER_SOL * parsedAmount,
      }),
    );
    const signature = await sendTransaction(transaction, connection);
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (status) {
      return {
        message:
          "Sent " +
          amount +
          "SOL to " +
          toPublicKey +
          "\n\n" +
          "check on [Explorer](https://solscan.io/tx/" +
          signature +
          "?cluster=devnet)",
        status: "success",
      };
    }
  } catch (error) {
    return {
      message: "Failed to send transaction.",
      status: "error",
    };
  }
};

const handleBuyCommand = async () => {
  return {
    message:
      "**Buy Command isn't implemented yet. ☹️**" +
      "\n\n" +
      "BUT BUT BUT" +
      "\n\n" +
      "You can buy from below listed exchanges." +
      "\n\n" +
      "[Binance](https://www.binance.com)" +
      "\n\n" +
      "[Coinbase](https://www.coinbase.com)" +
      "\n\n" +
      "etc...",
    status: "error",
  };
};

const handleSwapCommand = async () => {
  return {
    message:
      "**Swap Command isn't implemented yet. ☹️**" +
      "\n\n" +
      "BUT BUT BUT" +
      "\n\n" +
      "You can swap from below listed exchanges." +
      "\n\n" +
      "[Uniswap](https://app.uniswap.org/)" +
      "\n\n" +
      "[Raydium](https://raydium.io/)" +
      "\n\n" +
      "[Jupiter](https://jup.ag/)" +
      "\n\n" +
      "etc...",
    status: "error",
  };
};

const handleCreateTokenBatchTransactionCommand = async (
  data: CommandProps,
  publicKey: PublicKey,
  connection: Connection,
  sendTransaction: any,
) => {
  const { tokenName, tokenSymbol, tokenDecimals, uri, mintAmount } = data;
  const mintKeypair = Keypair.generate();
  const transaction = new Transaction();
  let TokenMintAddress = null;
  if (!TokenMintAddress) {
    if (!tokenName || !tokenSymbol || !tokenDecimals || !uri || !mintAmount) {
      return {
        message:
          "Please provide all the required details for token creation" +
          "\n" +
          "tokenName: " +
          tokenName +
          "\n" +
          "tokenSymbol: " +
          tokenSymbol +
          "\n" +
          "tokenDecimals: " +
          tokenDecimals +
          "\n" +
          "uri: " +
          uri +
          "\n" +
          "mintAmount: " +
          mintAmount,
        status: "error",
      };
    }

    TokenMintAddress = mintKeypair.publicKey;
    const metaData = {
      mint: mintKeypair.publicKey,
      name: tokenName.trim(),
      symbol: tokenSymbol.trim(),
      uri: uri.trim(),
      additionalMetadata: [],
    };
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metaDataLen = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metaDataLen,
    );

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey,
        publicKey,
        publicKey,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        Number(tokenDecimals),
        publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mintKeypair.publicKey,
        metadata: metaData.mint,
        name: metaData.name,
        symbol: metaData.symbol,
        uri: metaData.uri,
        updateAuthority: publicKey,
        mintAuthority: publicKey,
      }),
    );
  }

  let associatedTokenAddress = null;
  if (TokenMintAddress) {
    associatedTokenAddress = getAssociatedTokenAddressSync(
      TokenMintAddress,
      publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        TokenMintAddress,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }

  if (mintAmount && TokenMintAddress) {
    if (!associatedTokenAddress) {
      associatedTokenAddress = getAssociatedTokenAddressSync(
        TokenMintAddress,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
    }
    transaction.add(
      createMintToInstruction(
        TokenMintAddress,
        associatedTokenAddress,
        publicKey,
        Number(mintAmount) * Math.pow(10, Number(tokenDecimals)),
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }

  try {
    transaction.feePayer = publicKey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    transaction.partialSign(mintKeypair);
    await sendTransaction(transaction, connection);
    return {
      message:
        "**Token created successfully.** \
        Check on [Link](https://solscan.io/address/" +
        mintKeypair.publicKey.toString() +
        "?cluster=devnet)" +
        "\n\n" +
        "**Total Supply:** " +
        mintAmount +
        "\n\n" +
        "**Token Name:** " +
        tokenName +
        "\n\n" +
        "**Token Symbol:** " +
        tokenSymbol +
        "\n\n" +
        "**Token Decimals:** " +
        tokenDecimals,
      status: "success",
    };
  } catch (error) {
    return {
      message: "Failed to create token.",
      status: "error",
    };
  }
};
const handleCheckBalanceCommand = async (
  publicKey: PublicKey,
  connection: Connection,
) => {
  if (!publicKey) {
    return {
      message: "Please connect your wallet.",
      status: "error",
    };
  }
  const balance = await getBalance(publicKey.toString(), connection);
  return {
    message: `Your balance is ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.`,
    status: "success",
  };
};
const handleGetAddressCommand = async (publicKey: PublicKey) => {
  if (!publicKey) {
    return {
      message: "Please connect your wallet.",
      status: "error",
    };
  }
  return {
    message: `Your address is ${publicKey.toString()}.`,
    status: "success",
  };
};
const handleTransactionStatusCommand = async (
  publicKey: PublicKey,
  connection: Connection,
) => {
  if (!publicKey) {
    return {
      message: "Please connect your wallet.",
      status: "error",
    };
  }
  const transactions = await getLastXTransactions(
    publicKey.toString(),
    connection,
    1,
  );
  return {
    message: `Your last transaction's status is: ${transactions[0].confirmationStatus}`,
    status: "success",
  };
};
const handleRecentTransactionCommand = async (
  publicKey: PublicKey,
  connection: Connection,
) => {
  if (!publicKey) {
    return {
      message: "Please connect your wallet.",
      status: "error",
    };
  }
  const transactions = await getLastXTransactions(
    publicKey.toString(),
    connection,
    5,
  );
  return {
    // message: `Your last 5 transactions's status are: ${transactions.map((transaction) => "| " + transaction.confirmationStatus + " |")}`,
    message:
      "Your last 5 transactions's status are: " +
      " \n " +
      transactions
        .map(
          (transaction) =>
            "| [" +
            transaction.confirmationStatus +
            "](https://solscan.io/tx/" +
            transaction.signature +
            "?cluster=devnet) |",
        )
        .join("\n"),
    status: "success",
  };
};
