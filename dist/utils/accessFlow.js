import { prompt, type } from "/utils/io.js";
import {
  evaluateAccess,
  evaluateAttributeAccess,
  unlockEntity,
  getScope,
} from "/utils/access.js";
import { markAttributeUnlocked } from "/utils/campaignState.js";

function normalizeLines(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (value == null || value === "") {
    return [...fallback];
  }
  return [String(value)];
}

function formatRequirementList(items = [], mapItem = (entry) => `> ${entry}`) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((entry) => mapItem(entry));
}

async function printLines(lines = []) {
  const list = normalizeLines(lines).filter((entry) => entry != null);
  if (!list.length) return;
  await type(list, { stopBlinking: true });
}

async function attemptEntityUnlock(entity, evaluation, options = {}) {
  if (!entity || !evaluation) return false;
  const { config, prerequisitesMet, flagsMet } = evaluation;
  if (evaluation.unlocked) return true;

  if (config.unlockMode === "password") {
    const code = await prompt(
      options.passwordPrompt || "TOKEN: ",
      Boolean(options.passwordMask),
      false,
      options.passwordHint ? { hint: options.passwordHint } : undefined
    );
    const expected = String(config.password || "").trim().toLowerCase();
    const received = String(code || "").trim().toLowerCase();
    if (expected && received === expected) {
      unlockEntity(entity);
      await printLines(
        options.passwordSuccessLines || options.successLines || ["ACCESO CONCEDIDO.", " "]
      );
      return true;
    }
    await printLines(options.passwordFailureLines || ["TOKEN INVALIDO.", " "]);
    return false;
  }

  if (config.unlockMode === "chain") {
    if (!prerequisitesMet) {
      await printLines([
        " ",
        ...(normalizeLines(options.prerequisiteIntroLines, ["PRERREQUISITOS PENDIENTES."])),
        ...formatRequirementList(
          config.prerequisites,
          options.prerequisiteFormatter || ((entry) => `> ${entry}`)
        ),
        " ",
      ]);
      return false;
    }
    unlockEntity(entity);
    await printLines(
      options.chainSuccessLines || options.successLines || ["ACCESO HABILITADO.", " "]
    );
    return true;
  }

  if (config.unlockMode === "conditional") {
    if (!flagsMet) {
      await printLines([
        " ",
        ...(normalizeLines(options.flagsIntroLines, ["FLAGS REQUERIDAS."])),
        ...formatRequirementList(
          config.requiredFlags,
          options.flagFormatter || ((entry) => `> ${entry}`)
        ),
        " ",
      ]);
      return false;
    }
    unlockEntity(entity);
    await printLines(
      options.conditionalSuccessLines || options.successLines || ["ACCESO HABILITADO.", " "]
    );
    return true;
  }

  if (config.unlockMode === "puzzle") {
    await printLines(
      options.puzzleLines || [" ", "PUZZLE REQUERIDO.", " ",]
    );
    return false;
  }

  unlockEntity(entity);
  if (options.successLines?.length) {
    await printLines(options.successLines);
  }
  return true;
}

async function ensureEntityAccess(entity, options = {}) {
  if (!entity) return false;
  const evaluation = evaluateAccess(entity);
  if (evaluation.unlocked && evaluation.visible && evaluation.prerequisitesMet && evaluation.flagsMet) {
    return true;
  }
  return attemptEntityUnlock(entity, evaluation, {
    passwordPrompt: options.passwordPrompt || "TOKEN: ",
    passwordMask: options.passwordMask ?? true,
    passwordFailureLines: options.passwordFailureLines || ["ACCESO DENEGADO."],
    passwordSuccessLines: options.passwordSuccessLines || [],
    prerequisiteIntroLines: options.prerequisiteIntroLines || ["ACCESO RESTRINGIDO."],
    flagsIntroLines: options.flagsIntroLines || ["ACCESO RESTRINGIDO."],
    puzzleLines: options.puzzleLines || [options.restrictedMessage || "ACCESO RESTRINGIDO."],
    successLines: options.successLines || [],
  }).then((result) => {
    if (result) {
      const refreshed = evaluateAccess(entity);
      return Boolean(
        refreshed.unlocked &&
          refreshed.visible &&
          refreshed.prerequisitesMet &&
          refreshed.flagsMet
      );
    }
    return false;
  });
}

async function ensureAttributeAccess(entity, fieldKey, options = {}) {
  if (!entity || !fieldKey) return false;
  const access = evaluateAttributeAccess(entity, fieldKey);
  const expected = String(access.config.password || "").toLowerCase();
  const scope = getScope(entity);

  if (access.unlocked && access.visible && access.prerequisitesMet && access.flagsMet) {
    return true;
  }

  if (access.config.visibility === "hidden" && !access.unlocked) {
    if (!access.config.phrase) {
      await printLines(options.hiddenFailureLines || ["NO HAY INFORMACION DISPONIBLE."]);
      return false;
    }
    await printLines([String(access.config.phrase)]);
    const token = await prompt(options.tokenPrompt || "TOKEN: ", true);
    if (!expected || token !== expected) {
      await printLines(options.invalidTokenLines || ["TOKEN INVALIDO."]);
      return false;
    }
    markAttributeUnlocked(scope, entity.id, fieldKey);
    return true;
  }

  if (!access.unlocked && access.config.unlockMode === "password") {
    const token = await prompt(options.tokenPrompt || "TOKEN: ", true);
    if (!expected || token !== expected) {
      await printLines(options.invalidTokenLines || ["TOKEN INVALIDO."]);
      return false;
    }
    markAttributeUnlocked(scope, entity.id, fieldKey);
    return true;
  }

  if (!access.prerequisitesMet) {
    await printLines([
      ...(normalizeLines(options.attributePrerequisiteIntroLines, ["ATRIBUTO BLOQUEADO."])),
      ...formatRequirementList(
        access.config.prerequisites,
        options.prerequisiteFormatter || ((entry) => `> ${entry}`)
      ),
    ]);
    return false;
  }

  if (!access.flagsMet) {
    await printLines([
      ...(normalizeLines(options.attributeFlagsIntroLines, ["ATRIBUTO BLOQUEADO."])),
      ...formatRequirementList(
        access.config.requiredFlags,
        options.flagFormatter || ((entry) => `> ${entry}`)
      ),
    ]);
    return false;
  }

  if (!access.visible || !access.unlocked) {
    await printLines(options.blockedLines || ["ATRIBUTO BLOQUEADO."]);
    return false;
  }

  return true;
}

export {
  attemptEntityUnlock,
  ensureEntityAccess,
  ensureAttributeAccess,
};
