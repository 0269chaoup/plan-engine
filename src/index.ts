#!/usr/bin/env node
import { Command } from "commander";
import { planCommand } from "./commands/plan.js";

const program = new Command();

program
  .name("plan-engine")
  .description(
    "Living document engine for architecture plans and technical strategies — persistent, versioned, searchable"
  )
  .version("1.0.0")
  .option(
    "--vault <path>",
    "vault root directory",
    process.env.OBSIDIAN_VAULT ?? process.cwd()
  );

program.addCommand(planCommand());

program.parse();
