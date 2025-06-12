import {
  CrossbarClient,
  FeedHash,
  OracleFeed,
  OracleJob,
} from "@switchboard-xyz/common";
import chalk from "chalk";
import { jobs } from "./jobs";
import {
  ON_DEMAND_DEVNET_QUEUE,
  ON_DEMAND_MAINNET_QUEUE,
} from "@switchboard-xyz/on-demand";

type Environment = {
  simulatorUrl: string;
  crossbarUrl: string;
};

const isLocal = process.argv.includes("--local");
const isStaging = process.argv.includes("--staging");
const isDevnet = process.argv.includes("--devnet");

const environments: Record<string, Environment> = {
  local: {
    simulatorUrl: "http://localhost:8080",
    crossbarUrl: "http://localhost:8081",
  },
  staging: {
    simulatorUrl: "http://staging.simulator.switchboard.xyz",
    crossbarUrl: "https://staging.crossbar.switchboard.xyz",
  },
  production: {
    simulatorUrl: "https://simulator.switchboard.xyz",
    crossbarUrl: "https://crossbar.switchboard.xyz",
  },
};

(async () => {
  console.log();
  const env = (() => {
    if (isLocal) {
      console.log(chalk.bold.redBright("Using LOCAL environment..."));
      return environments.local;
    } else if (isStaging) {
      console.log(chalk.bold.yellowBright("Using STAGING environment..."));
      return environments.staging;
    }
    console.log(chalk.bold.greenBright("Using PRODUCTION environment..."));
    return environments.production;
  })();

  // Print the jobs that are being run.
  const feed = OracleFeed.create({
    name: "BTCUSDT_SURGE",
    jobs: [{ tasks: [{ switchboardSurgeTask: { symbol: "BTCUSDT" } }] }],
    minOracleSamples: 3,
    minJobResponses: 0,
    maxJobRangePct: 2,
  });

  const crossbar = new CrossbarClient(env.crossbarUrl, true);
  console.log("Set up CrossbarClient:", crossbar.crossbarUrl);
  console.log();

  const stored = await crossbar.storeOracleFeed(feed);
  console.log(`Stored:`);
  console.log(`  Feed ID: ${stored.feedId}`);
  console.log(`  CID: ${stored.cid}`);
  console.log();

  const fetched = await crossbar.fetchOracleFeed(stored.feedId);
  console.log(`Fetched:`);
  console.log(`  Feed ID: ${fetched.feedId}`);
  console.log(`  Feed: ${JSON.stringify(fetched.feed, null, 2)}`);
  console.log();
})();
