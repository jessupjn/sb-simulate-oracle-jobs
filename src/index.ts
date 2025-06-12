import { CrossbarClient, FeedHash, OracleJob } from "@switchboard-xyz/common";
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

const queuePubkey = isDevnet ? ON_DEMAND_DEVNET_QUEUE : ON_DEMAND_MAINNET_QUEUE;

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

  console.log(chalk.bold.yellowBright("Running simulation...\n"));

  // Print the jobs that are being run.
  const jobJson = jobs
    .map((job) => JSON.stringify(job.toJSON(), null, 2))
    .join("\n");
  console.log(chalk.bold.yellowBright("Job Json:"));
  console.log(jobJson);
  console.log();

  // Print the jobs that are being run.
  const jobYaml = jobs.map((job) => job.toYaml()).join("\n");
  console.log(chalk.bold.yellowBright("Job Yaml:"));
  console.log(jobYaml);
  console.log();

  // Serialize the jobs to base64 strings.
  const serializedJobs = jobs.map((oracleJob) => {
    const encoded = OracleJob.encodeDelimited(oracleJob).finish();
    const base64 = Buffer.from(encoded).toString("base64");
    return base64;
  });

  const queueBytes = Buffer.from(queuePubkey.toBytes());
  const feedHash = FeedHash.compute(queueBytes, jobs);
  console.log(chalk.bold.yellowBright("Feed Hash:"));
  console.log(`  ${feedHash.toString("hex")}`);
  console.log();

  console.log(chalk.bold.yellowBright("Serialized Job Datas:"));
  jobs.forEach((j, idx) => {
    const encoded = OracleJob.encodeDelimited(j).finish();
    const b64 = Buffer.from(encoded).toString("base64");
    console.log(`  ${idx} - ${b64}`);
  });
  console.log();

  const simulatePath = `${env.simulatorUrl}/simulate`;
  // Call the simulation server.
  console.log("Simulating on", simulatePath);
  const response = await fetch(simulatePath, {
    method: "POST",
    headers: [["Content-Type", "application/json"]],
    body: JSON.stringify({
      cluster: isDevnet ? "Devnet" : "Mainnet",
      jobs: serializedJobs,
      include_receipts: true,
    }),
  });

  // Check response.
  if (response.ok) {
    const data = await response.json();
    console.log(chalk.greenBright(`Response is good (${response.status})`));
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(chalk.redBright(`Response is bad (${response.status})`));
    console.log(await response.text());
  }
  console.log();

  // Call the Crossbar server.
  console.log("Using Crossbar on", env.crossbarUrl);
  const client = new CrossbarClient(env.crossbarUrl, true);
  const expectedFeedHash = FeedHash.compute(queueBytes, jobs);
  const stored = await client.store(
    queuePubkey.toBase58(),
    jobs.map((j) => j.toJSON())
  );
  const actualHex = stored.feedHash;
  const expectedHex = `0x${expectedFeedHash.toString("hex")}`;
  console.log("Feedhash (Expected):", expectedHex);
  console.log("Feedhash (Actual):  ", actualHex);
  if (expectedHex !== actualHex) {
    console.log(chalk.redBright("Feedhash mismatch!"));
  } else {
    console.log(chalk.greenBright("Feedhash matches!"));
    // const simulate = await client.simulateFeeds([stored.feedHash]);
    // console.log(
    //   JSON.stringify(
    //     simulate.map((s) => s.results),
    //     null,
    //     2
    //   )
    // );
  }
})();
