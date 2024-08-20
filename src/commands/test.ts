import chalk from "chalk";
import { asTestFile, projectUsing } from "src/ast";
import { clearTestCache, initializeHasher, refreshTestCache } from "src/cache";
import { AsOption } from "src/cli";
import { showTestFile } from "src/report/showTestFile";
import { showTestSummary } from "src/report/showTestSummary";
import { getTestFiles,  msg } from "src/utils";
import { shout } from "src/utils/shout";


export const test_command = async (opt: AsOption<"test">) => {
  const start = performance.now();
  await initializeHasher();

  const [_project, configFile] = projectUsing(
    opt.config 
      ? [ opt.config ] 
      : [
          `test/tsconfig.json`, 
          `tests/tsconfig.json`, 
          `tsconfig.json`,
          `src/tsconfig.json`
        ]
  );

  if (!opt.config) {
    shout(opt)(`- configuration for project's tests found in ${chalk.blue(configFile)}`);
  }

  let testFiles = getTestFiles();
  shout(opt)(`- there are ${chalk.bold(testFiles.length)} ${chalk.italic("test files")} across the project`);

  // filter test files
  if (opt?.filter?.length || 0 > 0) {
    testFiles = Array.from(new Set(
      opt.filter.flatMap(f => testFiles.filter(i => i.includes(f)))
    ));
    shout(opt)(`- after applying filters [${chalk.dim(opt.filter.join(', '))}], ${chalk.bold(testFiles.length)} files remain to report on`)
  }

  if(opt.clear) {
    clearTestCache(true);
    msg(opt)(`- test file cache cleared`)
  }

  const filterDesc = opt?.filter?.length > 0
  ? ` [ filter: ${chalk.dim(opt.filter.join(", "))} ]`
  : "";

  msg(opt)();
  msg(opt)(chalk.bold.green(`Test Results${filterDesc}:`));
  msg(opt)(chalk.bold.green(`---------------------------------------------`));

  const cache = await refreshTestCache(testFiles, opt);

  if (cache.hasBeenUpdated || cache.hasGrown) {

    shout(opt)(`- test file cache updated [${chalk.bold(cache.currentSize)} files]:`)
    if(cache.hasGrown) {
      shout(opt)(`    - added: ${chalk.dim(cache.updated.join(", "))}`);
    }
    if(cache.hasBeenUpdated) {
      shout(opt)(`    - updated: ${chalk.dim(cache.updated.join(", "))}`)
    }
  }

  if (!opt.clear) {
    shout(opt)(`- adding ${chalk.blue("--clear")} CLI flag will clear test cache prior to running this command`)
  }

  if(testFiles.length >0 && !opt.json) {
    
    for (const testFile of testFiles) {
      const result = await asTestFile(testFile);
      showTestFile(result, opt);
    }

    showTestSummary(cache)
  } else if (!opt.json) {
    console.log(`- no test files found with the give filter ${filterDesc}`);
  }

  if(!opt.verbose) {
    console.log();
    console.log(`- use ${chalk.blue("--verbose")} to get more details`);
    if((!opt["show-passing"])) {
      console.log(`- use ${chalk.blue("--show-passing")} to show passing tests (not just erroring tests)`);
    }
  }

  if (opt.json) {
    const data = testFiles.map(tf => asTestFile(tf));
    console.log(JSON.stringify(data));
  } 

  const early = cache.earlyCacheHits > 0 
    ? cache.earlyCacheHits === cache.cacheHits
      ? chalk.dim.italic(` (all were early)`)
      : chalk.dim.italic(` (${cache.earlyCacheHits} were early)`)
    : "";
  const cacheSummary = chalk.italic(`with ${chalk.reset.green.bold(cache.cacheHits)} cache hits${early}, ${chalk.reset.yellowBright(cache.cacheMisses)} cache misses`);

  const duration = performance.now() - start;
  if(!opt.quiet) {
    msg(opt)("")
    msg(opt)(`- command took ${chalk.bold(duration)}${chalk.italic.dim("ms")} ${cacheSummary}`)
  }
}
