import type { DiceRoll, CheckResult, CheckMechanics } from "../types/index.js";
import { getRules } from "./rules.js";
import { getCharacter } from "./character.js";

// Parse and roll dice expressions like "2d6+3", "1d20-2", "3d8"
export function roll(expression: string): DiceRoll {
  const regex = /^(\d+)?d(\d+)([+-]\d+)?$/i;
  const match = expression.replace(/\s/g, "").match(regex);

  if (!match) {
    throw new Error(
      `Invalid dice expression: ${expression}. Expected format: NdX+M (e.g., 2d6+3)`
    );
  }

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return {
    expression,
    rolls,
    modifier,
    total,
  };
}

// Perform a skill/ability check using session rules
export function check(params: {
  sessionId: string;
  characterId: string;
  skill?: string;
  attribute?: string;
  difficulty: number;
  bonusModifier?: number;
}): CheckResult {
  const rules = getRules(params.sessionId);
  if (!rules) {
    throw new Error(`No rules set for session ${params.sessionId}`);
  }

  const character = getCharacter(params.characterId);
  if (!character) {
    throw new Error(`Character ${params.characterId} not found`);
  }

  // Calculate modifier from character stats
  let modifier = params.bonusModifier || 0;

  if (params.skill && character.skills[params.skill] !== undefined) {
    modifier += character.skills[params.skill];
  }

  if (params.attribute && character.attributes[params.attribute] !== undefined) {
    // Common formula: (attribute - 10) / 2, but we'll just add the raw value
    // The DM agent should configure how modifiers work in the rules
    modifier += Math.floor((character.attributes[params.attribute] - 10) / 2);
  }

  // Roll the base dice
  const diceRoll = roll(rules.checkMechanics.baseDice);
  const total = diceRoll.total + modifier;

  // Determine success
  const success = total >= params.difficulty;
  const criticalSuccess =
    rules.checkMechanics.criticalSuccess !== undefined &&
    diceRoll.rolls[0] >= rules.checkMechanics.criticalSuccess;
  const criticalFailure =
    rules.checkMechanics.criticalFailure !== undefined &&
    diceRoll.rolls[0] <= rules.checkMechanics.criticalFailure;

  return {
    roll: diceRoll,
    modifier,
    total,
    difficulty: params.difficulty,
    success: criticalFailure ? false : criticalSuccess ? true : success,
    criticalSuccess,
    criticalFailure,
    margin: total - params.difficulty,
  };
}

// Opposed check between two characters
export function contest(params: {
  sessionId: string;
  attackerId: string;
  defenderId: string;
  attackerSkill?: string;
  defenderSkill?: string;
  attackerAttribute?: string;
  defenderAttribute?: string;
}): {
  attackerResult: CheckResult;
  defenderResult: CheckResult;
  winner: "attacker" | "defender" | "tie";
} {
  const rules = getRules(params.sessionId);
  if (!rules) {
    throw new Error(`No rules set for session ${params.sessionId}`);
  }

  // Both roll against difficulty 0, we compare totals
  const attackerResult = check({
    sessionId: params.sessionId,
    characterId: params.attackerId,
    skill: params.attackerSkill,
    attribute: params.attackerAttribute,
    difficulty: 0,
  });

  const defenderResult = check({
    sessionId: params.sessionId,
    characterId: params.defenderId,
    skill: params.defenderSkill,
    attribute: params.defenderAttribute,
    difficulty: 0,
  });

  let winner: "attacker" | "defender" | "tie";
  if (attackerResult.total > defenderResult.total) {
    winner = "attacker";
  } else if (defenderResult.total > attackerResult.total) {
    winner = "defender";
  } else {
    winner = "tie";
  }

  return {
    attackerResult,
    defenderResult,
    winner,
  };
}
