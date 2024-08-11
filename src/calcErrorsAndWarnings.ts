import { getCache, getCacheEntry } from "./cache";
import { AsOption } from "./create_cli";
import { FileDiagnostics } from "./getFileDiagnostics";
import { GlobalMetrics } from "./reporting/globalMetrics";


export const calcErrorsAndWarnings = (file: FileDiagnostics, opts: AsOption<"test">) => {
  const hasErrors = file.diagnostics
  .filter(i => !opts.ignore.includes(Number(i.code)) )
  .length > 0 ? true : false;
  const hasWarnings = file.diagnostics
    .filter(i => opts.ignore.includes(Number(i.code) || 0) )
    .length > 0 ? true : false;

  return { hasErrors, hasWarnings }
}


export const summarizeGlobalErrorsAndWarnings = (opts: AsOption<"test">) => {
  const cache = getCache();
  let err_count = 0;
  let err_files = 0;
  let warn_count = 0;
  let warn_files = 0;

  for (const file of Object.keys(cache)) {
    const diag = getCacheEntry(file);
    const f_err = diag.diagnostics.filter(i => !opts?.warn?.includes(String(i.code)) );
    const f_warn = diag.diagnostics.filter(i => opts?.warn?.includes(String(i.code)) );

    err_count += f_err.length;
    if(f_err.length>0) {
      err_files++;
    }
    warn_count += f_warn.length;
    if(f_warn.length>0) {
      warn_files++;
    }
  }

  return {
    code: err_count > 0 ? 1 : 0,
    file_count: Object.keys(cache).length,
    err_count,
    err_files,
    warn_count,
    warn_files
  } as GlobalMetrics
}
