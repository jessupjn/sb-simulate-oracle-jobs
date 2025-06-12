import { OracleJob } from "@switchboard-xyz/common";

export const jobs: OracleJob[] = [
  OracleJob.create({
    tasks: [
      {
        sanctumLstPriceTask: {
          lstMint: "ANZvHuXQh5DnBMzJ55MUyMtPxkdphgBwiPeYji2B3kxS",
          skipEpochCheck: true,
        },
      },
    ],
  }),
];
