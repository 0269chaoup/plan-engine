/**
 * plan.ts — CLI commands for plan management
 */

import { Command } from "commander";
import {
  createPlan,
  findPlan,
  readPlan,
  listPlans,
  updatePlanSection,
  addChangelog,
  updatePlanStatus,
  searchPlans,
  regenerateIndex,
} from "../lib/plan.js";

/** Get vault root from parent command options */
function getVaultRoot(cmd: Command): string {
  // cmd is the subcommand (e.g., plan create)
  // cmd.parent is the plan command
  // cmd.parent.parent is the program command with --vault option
  return cmd.parent?.parent?.opts()?.vault ?? process.env.OBSIDIAN_VAULT ?? process.cwd();
}

export function planCommand(): Command {
  const plan = new Command("plan")
    .description("Manage living plan documents — persistent, versioned, searchable");

  // ── plan create ─────────────────────────────────────────────────────────
  plan
    .command("create")
    .description("Create a new plan document")
    .argument("<title>", "Plan title (used as filename)")
    .option("-d, --domain <domain>", "Domain/category (e.g., daily-engine, work-engine)", "")
    .option("--background <text>", "Background section content")
    .option("--goals <text>", "Goals section content")
    .option("--design <text>", "Design section content")
    .option("--step <step>", "Add implementation step (repeatable)", (val: string, prev: string[]) => [...prev, val], [] as string[])
    .action((title, opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);

      const result = createPlan(vaultRoot, title, {
        domain: opts.domain,
        background: opts.background,
        goals: opts.goals,
        design: opts.design,
        steps: opts.step.length > 0 ? opts.step : undefined,
      });

      if (result.created) {
        console.log(`\n✅ Created plan: ${result.relPath}`);
      } else {
        console.log(`\n⚠️  Plan already exists: ${result.relPath}`);
      }
    });

  // ── plan show ───────────────────────────────────────────────────────────
  plan
    .command("show")
    .description("Show plan details")
    .argument("<title>", "Plan title (fuzzy match)")
    .action((title, opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);
      const plan = findPlan(vaultRoot, title);

      if (!plan) {
        console.log(`\n❌ Plan not found: ${title}`);
        return;
      }

      console.log(`\n📋 ${plan.title}`);
      console.log("═".repeat(50));
      console.log(`  Status:   ${plan.status}`);
      console.log(`  Domain:   ${plan.domain}`);
      console.log(`  Version:  v${plan.version}`);
      console.log(`  Created:  ${plan.created}`);
      console.log(`  Updated:  ${plan.updated}`);
      console.log(`  Path:     ${plan.relPath}`);
      console.log("═".repeat(50));
      console.log("");
      console.log(plan.content);
    });

  // ── plan list ───────────────────────────────────────────────────────────
  plan
    .command("list")
    .description("List all plan documents")
    .option("-s, --status <status>", "Filter by status (draft|active|completed|archived)")
    .option("-d, --domain <domain>", "Filter by domain")
    .action(async (opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);
      const plans = await listPlans(vaultRoot, {
        status: opts.status,
        domain: opts.domain,
      });

      if (plans.length === 0) {
        console.log("\n📭 No plans found.");
        return;
      }

      console.log(`\n📋 Plans (${plans.length})\n`);

      const statusIcons: Record<string, string> = {
        draft: "📝",
        active: "🌿",
        completed: "✅",
        archived: "🗃️",
      };

      for (const p of plans) {
        const icon = statusIcons[p.status] ?? "📄";
        console.log(`  ${icon} ${p.title}`);
        console.log(`     ${p.domain} | v${p.version} | ${p.updated}`);
      }

      console.log("");
    });

  // ── plan update ─────────────────────────────────────────────────────────
  plan
    .command("update")
    .description("Update a section of a plan document")
    .argument("<title>", "Plan title (fuzzy match)")
    .option("-s, --section <name>", "Section to update (e.g., '方案设计')")
    .option("-c, --content <text>", "New content for the section")
    .action((title, opts, cmd) => {
      if (!opts.section || !opts.content) {
        console.log("\n❌ Both --section and --content are required.");
        return;
      }

      const vaultRoot = getVaultRoot(cmd);
      const result = updatePlanSection(vaultRoot, title, opts.section, opts.content);

      if (result.updated) {
        console.log(`\n✅ Updated section "${opts.section}" in ${result.relPath}`);
      } else {
        console.log(`\n❌ Plan not found: ${title}`);
      }
    });

  // ── plan changelog ──────────────────────────────────────────────────────
  plan
    .command("changelog")
    .description("Add a changelog entry to a plan")
    .argument("<title>", "Plan title (fuzzy match)")
    .argument("<change>", "Description of the change")
    .action((title, change, opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);
      const result = addChangelog(vaultRoot, title, change);

      if (result.updated) {
        console.log(`\n✅ Added changelog entry to ${result.relPath}`);
      } else {
        console.log(`\n❌ Plan not found: ${title}`);
      }
    });

  // ── plan status ─────────────────────────────────────────────────────────
  plan
    .command("status")
    .description("Update plan status")
    .argument("<title>", "Plan title (fuzzy match)")
    .argument("<new-status>", "New status (draft|active|completed|archived)")
    .action((title, newStatus, opts, cmd) => {
      const validStatuses = ["draft", "active", "completed", "archived"];
      if (!validStatuses.includes(newStatus)) {
        console.log(`\n❌ Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        return;
      }

      const vaultRoot = getVaultRoot(cmd);
      const result = updatePlanStatus(vaultRoot, title, newStatus);

      if (result.updated) {
        console.log(`\n✅ Updated status to "${newStatus}" in ${result.relPath}`);
      } else {
        console.log(`\n❌ Plan not found: ${title}`);
      }
    });

  // ── plan search ─────────────────────────────────────────────────────────
  plan
    .command("search")
    .description("Search plans by keyword")
    .argument("<query>", "Search query")
    .action(async (query, opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);
      const results = await searchPlans(vaultRoot, query);

      if (results.length === 0) {
        console.log(`\n📭 No plans matching: ${query}`);
        return;
      }

      console.log(`\n🔍 Search results for "${query}" (${results.length})\n`);

      const statusIcons: Record<string, string> = {
        draft: "📝",
        active: "🌿",
        completed: "✅",
        archived: "🗃️",
      };

      for (const p of results) {
        const icon = statusIcons[p.status] ?? "📄";
        console.log(`  ${icon} ${p.title} — ${p.domain}（${p.updated}）`);
      }

      console.log("");
    });

  // ── plan index ──────────────────────────────────────────────────────────
  plan
    .command("index")
    .description("Regenerate INDEX.md for all plans")
    .action(async (opts, cmd) => {
      const vaultRoot = getVaultRoot(cmd);
      const indexPath = await regenerateIndex(vaultRoot);
      console.log(`\n✅ Regenerated: ${indexPath}`);
    });

  return plan;
}
