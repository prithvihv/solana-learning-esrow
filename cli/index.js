const { AccountLayout, Token, TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  Keypair,
} = require("@solana/web3.js");
const BN = require("bn.js");

const connection = new Connection("http://10.198.90.79:8899", "singleGossip");

const BufferLayout = require("buffer-layout");
const publicKey = (property = "publicKey") => {
  return BufferLayout.blob(32, property);
};
const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property);
};
const ESCROW_ACCOUNT_DATA_LAYOUT = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),
  publicKey("initializerPubkey"),
  publicKey("initializerTempTokenAccountPubkey"),
  publicKey("initializerReceivingTokenAccountPubkey"),
  uint64("expectedAmount"),
]);

// export interface EscrowLayout {
//   isInitialized: number,
//   initializerPubkey: Uint8Array,
//   initializerReceivingTokenAccountPubkey: Uint8Array,
//   initializerTempTokenAccountPubkey: Uint8Array,
//   expectedAmount: Uint8Array
// }

// initializer accounts
const alicePrivateKeyByteArray =
  "60,26,85,153,114,57,233,184,106,242,240,198,64,158,0,30,43,134,216,147,170,119,71,141,155,214,22,37,199,24,186,22,70,136,167,200,30,136,112,178,225,134,171,13,108,132,97,33,106,222,229,172,171,238,143,59,189,54,52,2,170,178,108,47";
const alicePrivateKeyDecoded = alicePrivateKeyByteArray
  .split(",")
  .map((s) => parseInt(s));

const bobPrivateKeyByteArray =
  "220,2,102,38,68,137,225,82,159,117,130,5,73,15,73,18,75,5,199,91,249,51,81,103,104,231,41,196,237,165,86,158,53,161,229,60,191,108,118,146,188,61,72,200,187,248,5,190,91,85,184,153,82,3,46,180,174,58,57,111,242,212,205,66";
const bobPrivateKeyDecoded = bobPrivateKeyByteArray
  .split(",")
  .map((s) => parseInt(s));

const initializerPair = new Account(alicePrivateKeyDecoded);
const intializerXAccount = new PublicKey(
  "3Rd6Ra1XP2Lp7ZtYWSJVJtBXg2ywGL3cSQ3iGj5WTMiX"
);
const intializerYAccount = new PublicKey(
  "6bEVV3ZE8jijCz9YaaWiZotzB1JFUDFzPCeeggrvc3e6"
);

const takersPair = new Account(bobPrivateKeyDecoded);
const takerXAccount = new PublicKey(
  "CpDjq4a1HQG2msPoSWBVk9tpoDEvM9ntfsf6QPH41tUZ"
);
const takerYAccount = new PublicKey(
  "61pkv3p3vL4KNQ5pgJPTR7ksDePW3dXvveXRFGTMQXKf"
);

// trade params
const amountXTokensToSendToEscrow = 1000000000;
const amountYTokensToReceive = 2000000000;

// programs accounts
const escrowProgramId = new PublicKey(
  "34NaHmANidyk1BYZXq7TUm6CyfoUGUEbutMtDLvHSsLJ"
);
const XProgramTokenAccount = new PublicKey(
  "H2U667ZQcPnq7CYWHMxiYeDxYyD41f8aynPNsL7uS6zy"
);
const YProgramTokenAccount = new PublicKey(
  "HEiUUZNdFYAXGpjAk1htxGNBoJL8RHsnTKCDggdbq5vd"
);

async function main() {
  // return await initEscrow();
  return await CompleteTrade(
    new PublicKey("DN5FstHvD2KLwgU2oEaJHVnYL248uzMAzMNRe4NkDhUK")
  );
}

async function CompleteTrade(esrowPubKey) {
  const escrowAccountInfo = await connection.getAccountInfo(esrowPubKey);
  if (escrowAccountInfo === null) {
    console.error("failed to get escrow account");
    process.exit(1);
  }

  const encodedEscrowState = escrowAccountInfo.data;
  const decodedEscrowLayout =
    ESCROW_ACCOUNT_DATA_LAYOUT.decode(encodedEscrowState);
  const escrowState = {
    escrowAccountPubkey: esrowPubKey,
    isInitialized: !!decodedEscrowLayout.isInitialized,
    initializerAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerPubkey
    ),
    XTokenTempAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerTempTokenAccountPubkey
    ),
    initializerYTokenAccount: new PublicKey(
      decodedEscrowLayout.initializerReceivingTokenAccountPubkey
    ),
    expectedAmount: new BN(decodedEscrowLayout.expectedAmount, 10, "le"),
  };
  console.log(
    `escrow is offering: ${escrowState.expectedAmount}, taking the trade`
  );

  const transferYTokensToAlice = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID, // what is this?
    takerYAccount,
    escrowState.initializerYTokenAccount,
    takersPair.publicKey,
    [],
    amountYTokensToReceive
  );

  const PDA = await PublicKey.findProgramAddress(
    [Buffer.from("escrow")],
    escrowProgramId
  );

  const ExchangeEscrowProgram = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      {
        pubkey: takersPair.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: takerYAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: takerXAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: escrowState.XTokenTempAccountPubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: initializerPair.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: escrowState.initializerYTokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: esrowPubKey,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PDA[0], isSigner: false, isWritable: false },
    ],
    data: Buffer.from(
      Uint8Array.of(1, ...new BN(amountXTokensToSendToEscrow).toArray("le", 8))
    ),
  });
  const tx = new Transaction().add(
    transferYTokensToAlice,
    ExchangeEscrowProgram
  );
  let txSig = await connection.sendTransaction(tx, [takersPair], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  logAccountInfo(escrowState.XTokenTempAccountPubkey);
  return txSig;
}
//   const encodedEscrowState = escrowAccount.data;
//   const decodedEscrowLayout = ESCROW_ACCOUNT_DATA_LAYOUT.decFee payer, ode(
//     encodedEscrowState
//   ) ;
//   const escrowState = {
//     escrowAccountPubkey: escrowStateAccountPubkey,
//     isInitialized: !!decodedEscrowLayout.isInitialized,
//     initializerAccountPubkey: new PublicKey(
//       decodedEscrowLayout.initializerPubkey
//     ),
//     XTokenTempAccountPubkey: new PublicKey(
//       decodedEscrowLayout.initializerTempTokenAccountPubkey
//     ),
//     initializerYTokenAccount: new PublicKey(
//       decodedEscrowLayout.initializerReceivingTokenAccountPubkey
//     ),
//     expectedAmount: new BN(decodedEscrowLayout.expectedAmount, 10, "le"),
//   };
//     };

// }

async function getAccountInfo() {
  let s = await connection.getAccountInfo(
    new PublicKey("CaNCezBZLuNxP7YVzbFAobAHRQ3uMa71VG5e6YAx6btT")
  );
  console.log(s.data.toLocaleString());

  return s;
}

async function initEscrow() {
  const tempAccountKeyPair = new Keypair();
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
      "confirmed"
    ),
    fromPubkey: initializerPair.publicKey,
    newAccountPubkey: tempAccountKeyPair.publicKey,
  });

  const initTempAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    XProgramTokenAccount,
    tempAccountKeyPair.publicKey,
    initializerPair.publicKey
  );
  const transferXTokensToTempAccIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    intializerXAccount,
    tempAccountKeyPair.publicKey,
    initializerPair.publicKey,
    [],
    amountXTokensToSendToEscrow
  );

  const escrowKeyPair = new Keypair();
  const createEscrowAccountIx = SystemProgram.createAccount({
    space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      ESCROW_ACCOUNT_DATA_LAYOUT.span,
      "singleGossip"
    ),
    fromPubkey: initializerPair.publicKey,
    newAccountPubkey: escrowKeyPair.publicKey,
    programId: escrowProgramId,
  });

  const initEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      {
        pubkey: initializerPair.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: tempAccountKeyPair.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(intializerYAccount),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: escrowKeyPair.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(
      Uint8Array.of(0, ...new BN(amountYTokensToReceive).toArray("le", 8))
    ),
  });
  const tx = new Transaction().add(
    createTempTokenAccountIx,
    initTempAccountIx,
    transferXTokensToTempAccIx,
    createEscrowAccountIx,
    initEscrowIx
  );
  let txSig = await connection.sendTransaction(
    tx,
    [initializerPair, tempAccountKeyPair, escrowKeyPair],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // the rest of file is just for logging information

  // debugging after this point
  const escrowAccount = await connection.getAccountInfo(
    escrowKeyPair.publicKey
  );

  if (escrowAccount === null || escrowAccount.data.length === 0) {
    logError("Escrow state account has not been initialized properly");
    process.exit(1);
  }

  // const encodedEscrowState = escrowKeyPair.data;
  // const decodedEscrowState =
  //   ESCROW_ACCOUNT_DATA_LAYOUT.decode(encodedEscrowState);

  console.log(
    `✨Escrow successfully initialized. Alice is offering ${amountXTokensToSendToEscrow}X for ${amountYTokensToReceive}Y✨\n`
  );
  console.log(`escrow state account: ${escrowKeyPair.publicKey}`);
  //  "Bob Token Account X": await getTokenBalance(
  //   getPublicKey("bob_x"),
  //   connection
  // ),
  // "Bob Token Account Y": await getTokenBalance(
  //   getPublicKey("bob_y"),
  //   connection
  // ),

  logAccountInfo(tempAccountKeyPair.publicKey);
  return txSig;
}

async function logAccountInfo(tempAccountPubKey) {
  const getTokenBalance = async (pubkey, connection) => {
    return parseInt(
      (await connection.getTokenAccountBalance(pubkey)).value.amount
    );
  };

  console.table([
    {
      "Alice Token Account X": await getTokenBalance(
        intializerXAccount,
        connection
      ),
      "Alice Token Account Y": await getTokenBalance(
        intializerYAccount,
        connection
      ),
      "bob Token Account X": await getTokenBalance(takerXAccount, connection),
      "bob Token Account Y": await getTokenBalance(takerYAccount, connection),
      "Temporary Token Account X": await getTokenBalance(
        tempAccountPubKey,
        connection
      ),
    },
  ]);
  console.log("");
}

(async () => {
  try {
    var text = await main();
    console.log(text);
  } catch (e) {
    // Deal with the fact the chain failed
    console.error("died", e);
  }
})();
