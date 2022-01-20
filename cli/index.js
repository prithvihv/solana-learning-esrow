const { AccountLayout, Token, TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} = require("@solana/web3.js");
const BN = require("bn.js")

const connection = new Connection("http://10.198.90.79:8899", "singleGossip");

const BufferLayout = require("buffer-layout")
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
const privateKeyByteArray =
  "60,26,85,153,114,57,233,184,106,242,240,198,64,158,0,30,43,134,216,147,170,119,71,141,155,214,22,37,199,24,186,22,70,136,167,200,30,136,112,178,225,134,171,13,108,132,97,33,106,222,229,172,171,238,143,59,189,54,52,2,170,178,108,47";
const privateKeyDecoded = privateKeyByteArray
  .split(",")
  .map((s) => parseInt(s));
const initializerAccount = new Account(privateKeyDecoded);
const intializerXAccount = new PublicKey(
  "3Rd6Ra1XP2Lp7ZtYWSJVJtBXg2ywGL3cSQ3iGj5WTMiX"
);
const intializerYAccount = new PublicKey(
  "6bEVV3ZE8jijCz9YaaWiZotzB1JFUDFzPCeeggrvc3e6"
);

const amountXTokensToSendToEscrow = 1000000000;

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
  return await initEscrow();
  // return await getAccountInfo();
}

async function getAccountInfo() {
  let s = await connection.getAccountInfo(new PublicKey("CaNCezBZLuNxP7YVzbFAobAHRQ3uMa71VG5e6YAx6btT"));
  console.log(s.data.toLocaleString())

  return s
}


async function initEscrow() {
  const tempTokenAccount = new Account();
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
      "confirmed"
    ),
    fromPubkey: initializerAccount.publicKey,
    newAccountPubkey: tempTokenAccount.publicKey,
  });

  const initTempAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    XProgramTokenAccount,
    tempTokenAccount.publicKey,
    initializerAccount.publicKey
  );
  const transferXTokensToTempAccIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    intializerXAccount,
    tempTokenAccount.publicKey,
    initializerAccount.publicKey,
    [],
    amountXTokensToSendToEscrow
  );

  const escrowAccount = new Account();
  const createEscrowAccountIx = SystemProgram.createAccount({
    space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      ESCROW_ACCOUNT_DATA_LAYOUT.span,
      "singleGossip"
    ),
    fromPubkey: initializerAccount.publicKey,
    newAccountPubkey: escrowAccount.publicKey,
    programId: escrowProgramId,
  });

  const initEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      {
        pubkey: initializerAccount.publicKey,
        isSigner: true,
        isWritable: false,
      },
      { pubkey: tempTokenAccount.publicKey, isSigner: false, isWritable: true },
      {
        pubkey: new PublicKey(intializerYAccount),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: escrowAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(
      Uint8Array.of(0, ...new BN(amountXTokensToSendToEscrow).toArray("le", 8))
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
    [initializerAccount, tempTokenAccount, escrowAccount],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  return txSig
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
