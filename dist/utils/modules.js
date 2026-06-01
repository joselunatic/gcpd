import {
  listCases,
  getCaseById,
  getActiveCases,
  getCasesSource,
} from "/utils/cases.js";

const listModules = listCases;
const getModuleById = getCaseById;
const getActiveModules = getActiveCases;
const getModulesSource = getCasesSource;

export { listModules, getModuleById, getActiveModules, getModulesSource };
